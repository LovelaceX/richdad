/**
 * AI Recommendation Engine
 * Automatically generates trading recommendations by analyzing market data with AI
 */

import { getAISettings } from '../renderer/lib/db'
import { fetchHistoricalData, fetchLivePrices } from './marketData'
import { calculateIndicators } from './technicalIndicators'
import type { AIRecommendation, Quote } from '../renderer/types'
import { generateId } from '../renderer/lib/utils'

interface RecommendationResponse {
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  rationale: string
  priceTarget?: number
  stopLoss?: number
}

/**
 * Generate AI trading recommendation for a symbol
 */
export async function generateRecommendation(symbol: string): Promise<AIRecommendation | null> {
  try {
    console.log(`[AI Engine] Starting analysis for ${symbol}`)

    // 1. Check if AI is configured
    const aiSettings = await getAISettings()
    if (!aiSettings.apiKey) {
      console.warn('[AI Engine] No AI API key configured, skipping analysis')
      return null
    }

    // 2. Fetch market data
    const quotes = await fetchLivePrices([symbol])
    const quote = quotes.find(q => q.symbol === symbol)

    if (!quote) {
      console.warn(`[AI Engine] No quote data for ${symbol}`)
      return null
    }

    // 3. Fetch historical data for technical analysis
    // Use intraday for SPY, daily for others (budget-friendly)
    const interval = symbol === 'SPY' ? 'intraday' : 'daily'
    const candles = await fetchHistoricalData(symbol, interval)

    if (candles.length === 0) {
      console.warn(`[AI Engine] No historical data for ${symbol}`)
      return null
    }

    // 4. Calculate technical indicators
    const indicators = calculateIndicators(candles)

    // 5. Get recent news headlines (from news store if available)
    const newsHeadlines = await getRecentNews(symbol)

    // 6. Build analysis prompt
    const prompt = buildAnalysisPrompt(symbol, quote, indicators, newsHeadlines)

    // 7. Send to AI for analysis
    const aiResponse = await sendAnalysisToAI(prompt, aiSettings.provider, aiSettings.apiKey, aiSettings.model)

    if (!aiResponse) {
      console.warn('[AI Engine] No response from AI')
      return null
    }

    // 8. Parse AI response
    const recommendation = parseAIResponse(aiResponse, symbol, quote.price)

    if (!recommendation) {
      console.warn('[AI Engine] Failed to parse AI response')
      return null
    }

    // 9. Validate confidence threshold (minimum 70% to display)
    if (recommendation.confidence < 70) {
      console.log(`[AI Engine] Confidence too low (${recommendation.confidence}%), skipping recommendation`)
      return null
    }

    // 10. Build final recommendation object
    const finalRecommendation: AIRecommendation = {
      id: generateId(),
      ticker: symbol,
      action: recommendation.action,
      confidence: recommendation.confidence,
      rationale: recommendation.rationale,
      sources: [
        { title: 'Technical Analysis', url: '' },
        { title: `${aiSettings.provider} ${aiSettings.model}`, url: '' }
      ],
      timestamp: Date.now(),
      priceTarget: recommendation.priceTarget,
      stopLoss: recommendation.stopLoss
    }

    console.log(`[AI Engine] Generated ${recommendation.action} recommendation for ${symbol} (${recommendation.confidence}% confidence)`)
    return finalRecommendation

  } catch (error) {
    console.error('[AI Engine] Analysis failed:', error)
    return null
  }
}

/**
 * Build analysis prompt for AI
 */
function buildAnalysisPrompt(
  symbol: string,
  quote: Quote,
  indicators: any,
  newsHeadlines: string[]
): string {
  const prompt = `You are a professional trading analyst. Analyze the following data for ${symbol} and provide a trading recommendation.

**CURRENT PRICE DATA:**
- Symbol: ${symbol}
- Current Price: $${quote.price}
- Change: ${quote.change > 0 ? '+' : ''}$${quote.change} (${quote.changePercent > 0 ? '+' : ''}${quote.changePercent}%)
- Volume: ${quote.volume.toLocaleString()}

**TECHNICAL INDICATORS:**
${indicators.rsi14 ? `- RSI (14): ${indicators.rsi14} ${indicators.rsi14 > 70 ? '(Overbought)' : indicators.rsi14 < 30 ? '(Oversold)' : '(Neutral)'}` : '- RSI: N/A'}
${indicators.macd ? `- MACD: ${indicators.macd.histogram > 0 ? 'Bullish' : 'Bearish'} (Value: ${indicators.macd.value}, Signal: ${indicators.macd.signal})` : '- MACD: N/A'}
${indicators.ma20 ? `- MA(20): $${indicators.ma20}` : ''}
${indicators.ma50 ? `- MA(50): $${indicators.ma50}` : ''}
${indicators.ma200 ? `- MA(200): $${indicators.ma200}` : ''}
- Trend: ${indicators.trend}
- Momentum: ${indicators.momentum}

**RECENT NEWS (Last 24 hours):**
${newsHeadlines.length > 0 ? newsHeadlines.map((h, i) => `${i + 1}. ${h}`).join('\n') : 'No recent news available'}

**INSTRUCTIONS:**
Based on this data, provide a trading recommendation. Respond ONLY with valid JSON in this exact format:

{
  "action": "BUY" | "SELL" | "HOLD",
  "confidence": 0-100,
  "rationale": "Brief 2-3 sentence explanation of your reasoning",
  "priceTarget": number or null,
  "stopLoss": number or null
}

Rules:
- confidence should be 0-100 (whole number)
- priceTarget and stopLoss are optional but recommended for BUY/SELL
- rationale should reference specific data points (RSI, MACD, news, etc.)
- Be honest about uncertainty - lower confidence if data is mixed

Respond with ONLY the JSON object, no additional text.`

  return prompt
}

/**
 * Send analysis prompt to AI provider
 */
async function sendAnalysisToAI(
  prompt: string,
  _provider: string,
  _apiKey: string,
  _model?: string
): Promise<string | null> {
  try {
    // Import AI library functions
    const { sendChatMessage } = await import('../renderer/lib/ai')

    // Note: We're reusing the chat function but with an empty history
    // In production, you might want a dedicated recommendation endpoint
    const response = await sendChatMessage(prompt, [])

    return response
  } catch (error) {
    console.error('[AI Engine] Failed to get AI response:', error)
    return null
  }
}

/**
 * Parse AI response into recommendation object
 */
function parseAIResponse(response: string, _symbol: string, currentPrice: number): RecommendationResponse | null {
  try {
    // Try to extract JSON from response (AI might add extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.warn('[AI Engine] No JSON found in response:', response)
      return null
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Validate required fields
    if (!parsed.action || typeof parsed.confidence !== 'number' || !parsed.rationale) {
      console.warn('[AI Engine] Missing required fields in response')
      return null
    }

    // Validate action
    if (!['BUY', 'SELL', 'HOLD'].includes(parsed.action)) {
      console.warn('[AI Engine] Invalid action:', parsed.action)
      return null
    }

    // Clamp confidence to 0-100
    const confidence = Math.max(0, Math.min(100, Math.round(parsed.confidence)))

    // Calculate default targets if not provided
    let priceTarget = parsed.priceTarget
    let stopLoss = parsed.stopLoss

    if (parsed.action === 'BUY' && !priceTarget) {
      // Default: 5% upside target
      priceTarget = Math.round(currentPrice * 1.05 * 100) / 100
    }

    if (parsed.action === 'BUY' && !stopLoss) {
      // Default: 3% downside stop
      stopLoss = Math.round(currentPrice * 0.97 * 100) / 100
    }

    if (parsed.action === 'SELL' && !priceTarget) {
      // Default: 5% downside target for short
      priceTarget = Math.round(currentPrice * 0.95 * 100) / 100
    }

    if (parsed.action === 'SELL' && !stopLoss) {
      // Default: 3% upside stop for short
      stopLoss = Math.round(currentPrice * 1.03 * 100) / 100
    }

    return {
      action: parsed.action,
      confidence,
      rationale: parsed.rationale,
      priceTarget: priceTarget || undefined,
      stopLoss: stopLoss || undefined
    }

  } catch (error) {
    console.error('[AI Engine] Failed to parse AI response:', error)
    return null
  }
}

/**
 * Get recent news headlines for a symbol
 */
async function getRecentNews(symbol: string): Promise<string[]> {
  try {
    // Try to get news from news store
    const { useNewsStore } = await import('../renderer/stores/newsStore')
    const store = useNewsStore.getState()
    const headlines = store.headlines

    // Filter for symbol-related news (simple keyword match)
    const relevantNews = headlines
      .filter(news =>
        news.headline.toUpperCase().includes(symbol) ||
        news.summary?.toUpperCase().includes(symbol)
      )
      .slice(0, 5) // Max 5 headlines
      .map(news => news.headline)

    // If no symbol-specific news, return general market headlines
    if (relevantNews.length === 0) {
      return headlines.slice(0, 3).map(news => news.headline)
    }

    return relevantNews

  } catch (error) {
    console.error('[AI Engine] Failed to fetch news:', error)
    return []
  }
}

/**
 * Check if market is open (simple US market hours check)
 * 9:30 AM - 4:00 PM ET, Monday-Friday
 */
export function isMarketOpen(): boolean {
  const now = new Date()
  const day = now.getDay() // 0 = Sunday, 6 = Saturday

  // Weekend check
  if (day === 0 || day === 6) return false

  // Convert to ET (simplified - doesn't account for DST properly)
  const etOffset = -5 // ET is UTC-5 (or UTC-4 during DST)
  const utcHours = now.getUTCHours()
  const etHours = (utcHours + etOffset + 24) % 24
  const minutes = now.getMinutes()

  // Market hours: 9:30 AM - 4:00 PM ET
  const marketStart = 9 * 60 + 30 // 9:30 AM in minutes
  const marketEnd = 16 * 60 // 4:00 PM in minutes
  const currentMinutes = etHours * 60 + minutes

  return currentMinutes >= marketStart && currentMinutes < marketEnd
}
