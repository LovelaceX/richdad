/**
 * Sentiment Service
 *
 * Analyzes news headlines for sentiment using a two-tier local system:
 * 1. Ollama (local AI) - primary, uses Dolphin model
 * 2. Keyword matching - fallback, always works
 *
 * 100% local - no external API calls, no rate limits, completely free.
 */

import type { NewsItem } from '../renderer/types'

// Ollama API endpoint
const OLLAMA_API = 'http://localhost:11434'
const OLLAMA_MODEL = 'dolphin-llama3:8b'
const OLLAMA_TIMEOUT = 5000 // 5 second timeout per headline

// Track which method was last used (for UI display)
export type SentimentMethod = 'ollama' | 'keywords'
let lastMethodUsed: SentimentMethod = 'keywords'

// Keyword-based sentiment analysis fallback
const POSITIVE_PATTERNS = [
  /\b(surge[sd]?|soar[sed]?|jump[sed]?|rally|rallies|boom|skyrocket|gain[sed]?)\b/i,
  /\b(beat[s]?|exceed[sed]?|outperform|strong|bullish|upgrade[d]?|record[- ]high)\b/i,
  /\b(profit|profitable|earnings beat|revenue growth|positive|optimistic)\b/i,
  /\b(breakthrough|success|win[s]?|approve[d]?|launch|expand)\b/i,
  /\b(buy rating|overweight|accumulate|target raised)\b/i
]

const NEGATIVE_PATTERNS = [
  /\b(crash|plunge[sd]?|tumble[sd]?|sink[s]?|dive[sd]?|collapse[d]?|tank[sed]?)\b/i,
  /\b(miss|missed|disappoints?|weak|bearish|downgrade[d]?|cut[s]?|slash)\b/i,
  /\b(loss|losses|layoff[s]?|bankrupt|fraud|scandal|crisis|warn)\b/i,
  /\b(decline[sd]?|drop[s]?|fall[s]?|fell|slump|recession|default)\b/i,
  /\b(sell rating|underweight|reduce|target cut|underperform)\b/i,
  /\b(concern|risk|threat|fear|uncertain|volatile)\b/i
]

/**
 * Get the last method used for sentiment analysis (for UI display)
 */
export function getLastSentimentMethod(): SentimentMethod {
  return lastMethodUsed
}

/**
 * Keyword-based sentiment - simple but reliable fallback
 */
function analyzeWithKeywords(text: string): 'positive' | 'negative' | 'neutral' {
  const lowerText = text.toLowerCase()

  let positiveScore = 0
  let negativeScore = 0

  for (const pattern of POSITIVE_PATTERNS) {
    if (pattern.test(lowerText)) positiveScore++
  }

  for (const pattern of NEGATIVE_PATTERNS) {
    if (pattern.test(lowerText)) negativeScore++
  }

  if (positiveScore > negativeScore && positiveScore >= 1) {
    return 'positive'
  } else if (negativeScore > positiveScore && negativeScore >= 1) {
    return 'negative'
  }

  return 'neutral'
}

/**
 * Analyze sentiment using local Ollama (Dolphin model)
 * Returns null if Ollama is not available or times out
 */
async function analyzeWithOllama(text: string): Promise<'positive' | 'negative' | 'neutral' | null> {
  try {
    const response = await fetch(`${OLLAMA_API}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          {
            role: 'user',
            content: `Analyze the sentiment of this financial news headline. Reply with ONLY one word: positive, negative, or neutral.

Headline: "${text}"

Sentiment:`
          }
        ],
        stream: false,
        options: { temperature: 0 }
      }),
      signal: AbortSignal.timeout(OLLAMA_TIMEOUT)
    })

    if (!response.ok) return null

    const data = await response.json()
    const sentiment = data.message?.content?.toLowerCase().trim()

    if (sentiment?.includes('positive')) return 'positive'
    if (sentiment?.includes('negative')) return 'negative'
    if (sentiment?.includes('neutral')) return 'neutral'

    return null
  } catch {
    // Ollama not available or timed out - fall back to keywords
    return null
  }
}

/**
 * Analyze a single headline with the fallback chain
 * 1. Try Ollama (local AI)
 * 2. Fall back to keywords
 */
async function analyzeSingleHeadline(
  text: string
): Promise<{ sentiment: 'positive' | 'negative' | 'neutral'; method: SentimentMethod }> {
  // 1. Try Ollama first (local, free)
  const ollamaResult = await analyzeWithOllama(text)
  if (ollamaResult) {
    return { sentiment: ollamaResult, method: 'ollama' }
  }

  // 2. Fall back to keywords (always works)
  return { sentiment: analyzeWithKeywords(text), method: 'keywords' }
}

/**
 * Analyze sentiment for multiple news headlines
 * Returns a map of headline ID to sentiment
 */
export async function analyzeSentiment(
  headlines: NewsItem[]
): Promise<Map<string, 'positive' | 'negative' | 'neutral'>> {
  if (headlines.length === 0) {
    return new Map()
  }

  const results = new Map<string, 'positive' | 'negative' | 'neutral'>()
  const methodCounts = { ollama: 0, keywords: 0 }

  // Process headlines in parallel batches for speed
  const BATCH_SIZE = 5
  for (let i = 0; i < headlines.length; i += BATCH_SIZE) {
    const batch = headlines.slice(i, i + BATCH_SIZE)

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (headline) => {
        const result = await analyzeSingleHeadline(headline.headline)
        return { id: headline.id, ...result }
      })
    )

    for (const { id, sentiment, method } of batchResults) {
      results.set(id, sentiment)
      methodCounts[method]++
    }
  }

  // Track last method used (most common in this batch)
  if (methodCounts.ollama >= methodCounts.keywords) {
    lastMethodUsed = 'ollama'
  } else {
    lastMethodUsed = 'keywords'
  }

  console.log(
    `[Sentiment] Analysis complete: ${methodCounts.ollama} Ollama, ${methodCounts.keywords} keywords`
  )

  return results
}

/**
 * Analyze a single text for sentiment (convenience function)
 */
export async function analyzeSingleText(
  text: string
): Promise<{ sentiment: 'positive' | 'negative' | 'neutral'; method: SentimentMethod }> {
  return analyzeSingleHeadline(text)
}

/**
 * Initialize sentiment analysis (legacy compatibility)
 * Now a no-op since we use Ollama
 */
export function initializeSentimentAnalysis(): void {
  console.log('[Sentiment] Service initialized (Ollama + keywords)')
}

/**
 * Check if sentiment model is ready (legacy compatibility)
 * Returns true if Ollama is running
 */
export async function isSentimentModelReady(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_API}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    })
    return response.ok
  } catch {
    // Ollama not running, but keywords still work
    return true
  }
}

/**
 * Terminate sentiment analysis (legacy compatibility)
 * No-op since we don't use workers anymore
 */
export function terminateSentimentAnalysis(): void {
  console.log('[Sentiment] Service terminated')
}
