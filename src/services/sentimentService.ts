/**
 * Sentiment Service
 *
 * Analyzes news headlines for sentiment using a three-tier fallback system:
 * 1. HF Inference API (FinBERT cloud) - primary, works without setup
 * 2. User's AI API (OpenAI/Claude/Groq) - secondary if HF fails
 * 3. Keyword matching - final fallback, always works
 *
 * Each user has their own HF rate limit (per IP) unless they add a token.
 */

import type { NewsItem } from '../renderer/types'
import { getSettings, getAISettings } from '../renderer/lib/db'

// Track which method was last used (for UI display)
export type SentimentMethod = 'finbert' | 'ai' | 'keywords'
let lastMethodUsed: SentimentMethod = 'keywords'
let hfApiFailures = 0  // Track consecutive HF failures
const HF_MAX_FAILURES = 3  // After this many failures, skip HF for a while
const HF_COOLDOWN_MS = 5 * 60 * 1000  // 5 minute cooldown after max failures
let hfCooldownUntil = 0

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
 * Keyword-based sentiment - simple but reliable
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
 * HF Inference API - FinBERT in the cloud
 * Uses unauthenticated requests by default (per-IP rate limit)
 * If user has HF token, uses authenticated requests for higher limits
 */
async function analyzeWithHuggingFace(
  text: string,
  hfToken?: string
): Promise<'positive' | 'negative' | 'neutral' | null> {
  // Check if we're in cooldown
  if (Date.now() < hfCooldownUntil) {
    return null
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    // Add authorization if user has a token
    if (hfToken) {
      headers['Authorization'] = `Bearer ${hfToken}`
    }

    const response = await fetch(
      'https://api-inference.huggingface.co/models/ProsusAI/finbert',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ inputs: text })
      }
    )

    if (!response.ok) {
      // Track failures
      hfApiFailures++
      if (hfApiFailures >= HF_MAX_FAILURES) {
        hfCooldownUntil = Date.now() + HF_COOLDOWN_MS
        console.warn('[Sentiment] HF API max failures reached, cooling down for 5 min')
      }

      if (response.status === 429) {
        console.warn('[Sentiment] HF rate limited, switching to fallback')
      }
      return null
    }

    // Success - reset failure count
    hfApiFailures = 0
    hfCooldownUntil = 0

    const data = await response.json()

    // HF returns array of arrays: [[{label, score}, ...]]
    // Find the highest scoring label
    if (Array.isArray(data) && Array.isArray(data[0])) {
      const results = data[0] as Array<{ label: string; score: number }>
      const best = results.reduce((a, b) => (a.score > b.score ? a : b))

      // FinBERT labels: positive, negative, neutral
      if (best.label === 'positive' || best.label === 'negative' || best.label === 'neutral') {
        return best.label
      }
    }

    return null
  } catch (error) {
    hfApiFailures++
    console.warn('[Sentiment] HF API error:', error)
    return null
  }
}

/**
 * User's AI API (OpenAI/Claude/Groq) as fallback
 */
async function analyzeWithUserAI(text: string): Promise<'positive' | 'negative' | 'neutral' | null> {
  try {
    const aiSettings = await getAISettings()
    if (!aiSettings.apiKey) {
      return null
    }

    // Import AI library dynamically to avoid circular deps
    const { sendChatMessage } = await import('../renderer/lib/ai')

    const prompt = `Analyze the sentiment of this financial news headline. Respond with ONLY one word: positive, negative, or neutral.

Headline: "${text}"

Sentiment:`

    const response = await sendChatMessage(prompt, [])
    const sentiment = response.toLowerCase().trim()

    if (sentiment.includes('positive')) return 'positive'
    if (sentiment.includes('negative')) return 'negative'
    if (sentiment.includes('neutral')) return 'neutral'

    return null
  } catch (error) {
    console.warn('[Sentiment] AI API error:', error)
    return null
  }
}

/**
 * Analyze a single headline with the fallback chain
 */
async function analyzeSingleHeadline(
  text: string,
  hfToken?: string,
  useAI: boolean = true
): Promise<{ sentiment: 'positive' | 'negative' | 'neutral'; method: SentimentMethod }> {
  // 1. Try HF Inference API first
  const hfResult = await analyzeWithHuggingFace(text, hfToken)
  if (hfResult) {
    return { sentiment: hfResult, method: 'finbert' }
  }

  // 2. Try user's AI API if available
  if (useAI) {
    const aiResult = await analyzeWithUserAI(text)
    if (aiResult) {
      return { sentiment: aiResult, method: 'ai' }
    }
  }

  // 3. Fall back to keywords (always works)
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

  // Get user settings for HF token
  const settings = await getSettings()
  const hfToken = settings.huggingFaceToken

  const results = new Map<string, 'positive' | 'negative' | 'neutral'>()
  const methodCounts = { finbert: 0, ai: 0, keywords: 0 }

  // Process headlines - batch to avoid overwhelming APIs
  const BATCH_SIZE = 5
  for (let i = 0; i < headlines.length; i += BATCH_SIZE) {
    const batch = headlines.slice(i, i + BATCH_SIZE)

    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(async (headline) => {
        const result = await analyzeSingleHeadline(headline.headline, hfToken)
        return { id: headline.id, ...result }
      })
    )

    for (const { id, sentiment, method } of batchResults) {
      results.set(id, sentiment)
      methodCounts[method]++
    }
  }

  // Track last method used (most common in this batch)
  if (methodCounts.finbert >= methodCounts.ai && methodCounts.finbert >= methodCounts.keywords) {
    lastMethodUsed = 'finbert'
  } else if (methodCounts.ai >= methodCounts.keywords) {
    lastMethodUsed = 'ai'
  } else {
    lastMethodUsed = 'keywords'
  }

  console.log(
    `[Sentiment] Analysis complete: ${methodCounts.finbert} FinBERT, ${methodCounts.ai} AI, ${methodCounts.keywords} keywords`
  )

  return results
}

/**
 * Analyze a single text for sentiment (convenience function)
 */
export async function analyzeSingleText(
  text: string
): Promise<{ sentiment: 'positive' | 'negative' | 'neutral'; method: SentimentMethod }> {
  const settings = await getSettings()
  return analyzeSingleHeadline(text, settings.huggingFaceToken)
}

/**
 * Initialize sentiment analysis (legacy compatibility)
 * Now a no-op since we don't use workers anymore
 */
export function initializeSentimentAnalysis(): void {
  console.log('[Sentiment] Service initialized (HF API + fallbacks)')
}

/**
 * Check if sentiment model is ready (legacy compatibility)
 * Always returns true since we use API-based analysis
 */
export async function isSentimentModelReady(): Promise<boolean> {
  return true
}

/**
 * Terminate sentiment analysis (legacy compatibility)
 * No-op since we don't use workers anymore
 */
export function terminateSentimentAnalysis(): void {
  console.log('[Sentiment] Service terminated')
}

/**
 * Reset HF cooldown (for testing or manual retry)
 */
export function resetHFCooldown(): void {
  hfApiFailures = 0
  hfCooldownUntil = 0
  console.log('[Sentiment] HF cooldown reset')
}
