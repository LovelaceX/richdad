/**
 * AI Recommendation Engine
 * Automatically generates trading recommendations by analyzing market data with AI
 *
 * PERFORMANCE: Uses context caching to avoid redundant calculations:
 * - Market regime: cached for 5 minutes
 * - Technical indicators: cached for 1 minute per symbol
 * - Candlestick patterns: cached for 15 minutes per symbol
 */

import { getAISettings, getSettings } from '../renderer/lib/db'
import { PERSONA_PROMPTS } from '../renderer/lib/ai'
import { fetchHistoricalData, fetchLivePrices } from './marketData'
import {
  calculateIndicators,
  calculateRSI,
  calculateRelativeStrength,
  formatRelativeStrengthForPrompt,
  getCachedSpyRSI,
  setSpyRSICache,
  type TechnicalIndicators,
  type RelativeStrength,
  type CandleData
} from './technicalIndicators'
import { calculateMarketRegime, formatRegimeForPrompt, type MarketRegime } from './marketRegime'
import { detectPatterns, type DetectedPattern } from './candlestickPatterns'
import type { AIRecommendation, Quote, AnalysisPhase } from '../renderer/types'
import { generateId } from '../renderer/lib/utils'
import { canMakeAICall, recordAICall, getAIBudgetStatus } from './aiBudgetTracker'
import { findSimilarScenarios, extractSignature, buildMemoryContext } from './memoryStore'

// ==========================================
// CONTEXT CACHING
// ==========================================

/**
 * Cache TTLs (in milliseconds)
 */
const REGIME_CACHE_TTL = 5 * 60 * 1000 // 5 minutes - regime changes slowly
const INDICATOR_CACHE_TTL = 60 * 1000 // 1 minute - indicators based on price
const PATTERN_CACHE_TTL = 15 * 60 * 1000 // 15 minutes - patterns are slow-changing

/**
 * Maximum number of symbols to cache (prevents memory leak)
 */
const MAX_CACHED_SYMBOLS = 50

/**
 * Cached context data
 */
interface CachedData<T> {
  data: T
  timestamp: number
}

const regimeCache: { data: MarketRegime | null; timestamp: number } = { data: null, timestamp: 0 }
const indicatorCache = new Map<string, CachedData<TechnicalIndicators>>()
const indicatorCacheLRU: string[] = [] // LRU tracking for indicator cache
const patternCache = new Map<string, CachedData<DetectedPattern[]>>()
const patternCacheLRU: string[] = [] // LRU tracking for pattern cache

/**
 * Get cached market regime or calculate fresh
 */
async function getCachedMarketRegime(): Promise<MarketRegime | null> {
  const now = Date.now()

  // Check cache validity
  if (regimeCache && regimeCache.data && (now - regimeCache.timestamp) < REGIME_CACHE_TTL) {
    console.log('[AI Engine] Using cached market regime')
    return regimeCache.data
  }

  // Calculate fresh regime
  try {
    const regime = await calculateMarketRegime()
    regimeCache.data = regime
    regimeCache.timestamp = now
    return regime
  } catch (err) {
    console.warn('[AI Engine] Failed to calculate market regime:', err)
    // Return stale cache if available
    if (regimeCache && regimeCache.data) {
      return regimeCache.data
    }
    return null
  }
}

/**
 * Get cached indicators or calculate fresh
 * Implements LRU eviction when cache exceeds MAX_CACHED_SYMBOLS
 */
function getCachedIndicators(symbol: string, candles: CandleData[]): TechnicalIndicators {
  const now = Date.now()
  const cached = indicatorCache.get(symbol)

  // Check cache validity
  if (cached && (now - cached.timestamp) < INDICATOR_CACHE_TTL) {
    console.log(`[AI Engine] Using cached indicators for ${symbol}`)
    // Move to end of LRU (most recently used)
    const lruIndex = indicatorCacheLRU.indexOf(symbol)
    if (lruIndex > -1) {
      indicatorCacheLRU.splice(lruIndex, 1)
      indicatorCacheLRU.push(symbol)
    }
    return cached.data
  }

  // Calculate fresh indicators
  const indicators = calculateIndicators(candles)

  // LRU eviction if cache is full
  if (indicatorCache.size >= MAX_CACHED_SYMBOLS && !indicatorCache.has(symbol)) {
    const oldest = indicatorCacheLRU.shift()
    if (oldest) {
      indicatorCache.delete(oldest)
      console.log(`[AI Engine] Evicted ${oldest} from indicator cache (LRU)`)
    }
  }

  // Update cache and LRU
  indicatorCache.set(symbol, { data: indicators, timestamp: now })
  const existingIndex = indicatorCacheLRU.indexOf(symbol)
  if (existingIndex > -1) {
    indicatorCacheLRU.splice(existingIndex, 1)
  }
  indicatorCacheLRU.push(symbol)

  return indicators
}

/**
 * Get cached patterns or detect fresh
 * Implements LRU eviction when cache exceeds MAX_CACHED_SYMBOLS
 */
function getCachedPatterns(symbol: string, candles: CandleData[]): DetectedPattern[] {
  const now = Date.now()
  const cached = patternCache.get(symbol)

  // Check cache validity
  if (cached && (now - cached.timestamp) < PATTERN_CACHE_TTL) {
    console.log(`[AI Engine] Using cached patterns for ${symbol}`)
    // Move to end of LRU (most recently used)
    const lruIndex = patternCacheLRU.indexOf(symbol)
    if (lruIndex > -1) {
      patternCacheLRU.splice(lruIndex, 1)
      patternCacheLRU.push(symbol)
    }
    return cached.data
  }

  // Detect fresh patterns
  const patterns = detectPatterns(candles)

  // LRU eviction if cache is full
  if (patternCache.size >= MAX_CACHED_SYMBOLS && !patternCache.has(symbol)) {
    const oldest = patternCacheLRU.shift()
    if (oldest) {
      patternCache.delete(oldest)
      console.log(`[AI Engine] Evicted ${oldest} from pattern cache (LRU)`)
    }
  }

  // Update cache and LRU
  patternCache.set(symbol, { data: patterns, timestamp: now })
  const existingIndex = patternCacheLRU.indexOf(symbol)
  if (existingIndex > -1) {
    patternCacheLRU.splice(existingIndex, 1)
  }
  patternCacheLRU.push(symbol)

  return patterns
}

/**
 * Invalidate AI context caches
 * Call this when significant market events occur or user changes settings
 *
 * @param type - Optional type to invalidate ('regime' | 'indicators' | 'patterns')
 *               If not specified, invalidates all caches
 */
export function invalidateAIContext(type?: 'regime' | 'indicators' | 'patterns'): void {
  if (!type || type === 'regime') {
    regimeCache.data = null
    regimeCache.timestamp = 0
    console.log('[AI Engine] Regime cache invalidated')
  }
  if (!type || type === 'indicators') {
    indicatorCache.clear()
    indicatorCacheLRU.length = 0 // Clear LRU array
    console.log('[AI Engine] Indicator cache cleared')
  }
  if (!type || type === 'patterns') {
    patternCache.clear()
    patternCacheLRU.length = 0 // Clear LRU array
    console.log('[AI Engine] Pattern cache cleared')
  }
}

/**
 * Get cache statistics for debugging/monitoring
 */
export function getAIContextCacheStats(): {
  regimeCacheAge: number | null
  indicatorCacheSize: number
  patternCacheSize: number
} {
  return {
    regimeCacheAge: regimeCache?.timestamp ? Date.now() - regimeCache.timestamp : null,
    indicatorCacheSize: indicatorCache.size,
    patternCacheSize: patternCache.size
  }
}

/**
 * Sanitize text for safe inclusion in AI prompts
 * Prevents prompt injection attacks by:
 * - Limiting length
 * - Removing control characters
 * - Escaping special prompt delimiters
 */
function sanitizeForPrompt(text: string, maxLength: number = 500): string {
  if (!text || typeof text !== 'string') return ''

  return text
    // Remove control characters (except newlines/tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Remove potential prompt injection patterns
    .replace(/\b(IGNORE|DISREGARD|SYSTEM|ASSISTANT|USER|HUMAN)[\s:]+/gi, '')
    // Escape potential JSON breaking characters in string context
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    // Limit length
    .slice(0, maxLength)
    .trim()
}

/**
 * Sanitize stock ticker symbol
 * Valid symbols are 1-5 uppercase letters (or digits for some)
 */
function sanitizeSymbol(symbol: string): string {
  if (!symbol || typeof symbol !== 'string') return 'UNKNOWN'
  // Only allow alphanumeric and common symbol characters (., -, ^)
  const cleaned = symbol.toUpperCase().replace(/[^A-Z0-9.\-^]/g, '')
  return cleaned.slice(0, 10) || 'UNKNOWN'
}

interface RecommendationResponse {
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  rationale: string
  priceTarget?: number
  stopLoss?: number
  // Position sizing based on user risk settings
  suggestedShares?: number
  suggestedDollarAmount?: number
}

// Risk settings passed to AI for position sizing
interface RiskSettings {
  dailyBudget: number
  dailyLossLimit: number      // percentage
  positionSizeLimit: number   // percentage
}

// Type for phase update callback
type PhaseUpdateCallback = (
  phaseId: string,
  status: AnalysisPhase['status'],
  result?: string
) => void

/**
 * Generate AI trading recommendation for a symbol
 * @param symbol - Stock ticker symbol
 * @param confidenceThreshold - Minimum confidence to return recommendation (default 70)
 * @param onPhaseUpdate - Optional callback for real-time phase updates (for UI animation)
 */
export async function generateRecommendation(
  symbol: string,
  confidenceThreshold?: number,
  onPhaseUpdate?: PhaseUpdateCallback
): Promise<AIRecommendation | null> {
  // Helper to safely call phase update
  const updatePhase = (phaseId: string, status: AnalysisPhase['status'], result?: string) => {
    if (onPhaseUpdate) {
      try {
        onPhaseUpdate(phaseId, status, result)
      } catch (e) {
        console.warn('[AI Engine] Phase update callback error:', e)
      }
    }
  }

  try {
    console.log(`[AI Engine] Starting analysis for ${symbol}`)

    // 1. Check if AI is configured
    const aiSettings = await getAISettings()
    if (!aiSettings.apiKey) {
      console.warn('[AI Engine] No AI API key configured, skipping analysis')
      // Dispatch event so UI can show helpful message
      window.dispatchEvent(new CustomEvent('ai-status', {
        detail: { status: 'no_api_key', message: 'AI Copilot needs an API key. Go to Settings → AI Copilot to configure.' }
      }))
      return null
    }

    // 1b. Check AI budget before making call
    if (!canMakeAICall()) {
      const status = getAIBudgetStatus()
      console.warn(`[AI Engine] Daily AI budget exhausted (${status.used}/${status.limit} calls). Skipping analysis for ${symbol}`)
      // Dispatch event so UI can show helpful message
      window.dispatchEvent(new CustomEvent('ai-status', {
        detail: { status: 'budget_exhausted', message: `AI budget exhausted (${status.used}/${status.limit} calls). Resets at midnight.` }
      }))
      return null
    }

    // Phase 1: Market Regime (uses cache)
    updatePhase('regime', 'active')
    const marketRegime = await getCachedMarketRegime()
    const regimeLabel = marketRegime?.regime?.replace(/_/g, ' ') || 'Unknown'
    updatePhase('regime', 'complete', regimeLabel)

    // Phase 2: Fetch market data (price)
    updatePhase('price', 'active')
    const quotes = await fetchLivePrices([symbol])
    const quote = quotes.find(q => q.symbol === symbol)

    if (!quote) {
      updatePhase('price', 'error', 'No data')
      console.warn(`[AI Engine] No quote data for ${symbol}`)
      return null
    }
    updatePhase('price', 'complete', `$${quote.price.toFixed(2)}`)

    // Phase 3: Fetch historical data and calculate technical indicators
    updatePhase('technicals', 'active')
    const interval = symbol === 'SPY' ? '5min' : 'daily'
    const historyResult = await fetchHistoricalData(symbol, interval)
    const candles = historyResult.candles

    if (candles.length === 0) {
      updatePhase('technicals', 'error', 'No history')
      console.warn(`[AI Engine] No historical data for ${symbol}`)
      return null
    }

    const indicators = getCachedIndicators(symbol, candles)
    const rsiLabel = indicators.rsi14 ? `RSI ${indicators.rsi14}` : 'Calculating...'
    updatePhase('technicals', 'complete', rsiLabel)

    // Calculate relative strength vs SPY (skip for SPY itself)
    let relativeStrength: RelativeStrength | null = null
    if (symbol.toUpperCase() !== 'SPY' && indicators.rsi14) {
      try {
        // Check SPY RSI cache first
        let spyRSI = getCachedSpyRSI()

        if (spyRSI === null) {
          // Fetch SPY data and calculate RSI
          console.log('[AI Engine] Fetching SPY data for relative strength...')
          const spyHistory = await fetchHistoricalData('SPY', 'daily')
          if (spyHistory.candles.length >= 15) {
            spyRSI = calculateRSI(spyHistory.candles)
            if (spyRSI !== null) {
              setSpyRSICache(spyRSI)
              console.log(`[AI Engine] Cached SPY RSI: ${spyRSI}`)
            }
          }
        } else {
          console.log(`[AI Engine] Using cached SPY RSI: ${spyRSI}`)
        }

        if (spyRSI !== null) {
          relativeStrength = calculateRelativeStrength(indicators.rsi14, spyRSI)
          console.log(`[AI Engine] Relative strength: ${relativeStrength.interpretation} (diff: ${relativeStrength.differential})`)
        }
      } catch (error) {
        console.warn('[AI Engine] Failed to calculate relative strength:', error)
      }
    }

    // Phase 4: Detect candlestick patterns (uses cache)
    updatePhase('patterns', 'active')
    const allPatterns = getCachedPatterns(symbol, candles)
    const recentPatterns = allPatterns
      .filter(p => p.reliabilityScore >= 50)
      .slice(-5)
    const patternLabel = recentPatterns.length > 0
      ? `${recentPatterns.length} found`
      : 'None'
    updatePhase('patterns', 'complete', patternLabel)
    console.log(`[AI Engine] Detected ${allPatterns.length} patterns, ${recentPatterns.length} significant`)

    // Phase 4b: Query similar past scenarios (hybrid memory)
    let memoryContext = ''
    try {
      const signature = extractSignature({
        rsi: indicators.rsi14 ?? undefined,
        macdHistogram: indicators.macd?.histogram,
        trend: indicators.trend,
        patterns: recentPatterns.map(p => p.pattern),
        regime: marketRegime?.regime
      })
      const similarScenarios = await findSimilarScenarios(signature, 5)
      if (similarScenarios.length > 0) {
        // Pass current regime to help label scenarios as same/different regime
        memoryContext = buildMemoryContext(similarScenarios, marketRegime?.regime)
        console.log(`[AI Engine] Found ${similarScenarios.length} similar past scenarios for context`)
      }
    } catch (error) {
      console.warn('[AI Engine] Failed to query memory:', error)
    }

    // Phase 5: Get recent news headlines
    updatePhase('news', 'active')
    const newsHeadlines = await getRecentNews(symbol)
    const newsLabel = newsHeadlines.length > 0
      ? `${newsHeadlines.length} articles`
      : 'None'
    updatePhase('news', 'complete', newsLabel)

    // Phase 6: Build prompt and send to AI
    updatePhase('ai', 'active')
    const includeOptionsLanguage = aiSettings.includeOptionsLanguage ?? false
    const recommendationFormat = aiSettings.recommendationFormat ?? 'standard'

    // Get user's settings for persona and risk parameters
    const userSettings = await getSettings()
    const persona = userSettings.persona || 'sterling'

    // Extract risk settings for position sizing
    const riskSettings: RiskSettings = {
      dailyBudget: userSettings.dailyBudget ?? 1000,
      dailyLossLimit: userSettings.dailyLossLimit ?? 2,
      positionSizeLimit: userSettings.positionSizeLimit ?? 5
    }

    const prompt = buildAnalysisPrompt(symbol, quote, indicators, newsHeadlines, marketRegime, recentPatterns, memoryContext, includeOptionsLanguage, relativeStrength, recommendationFormat, riskSettings, persona)
    const aiResponse = await sendAnalysisToAI(prompt, aiSettings.provider, aiSettings.apiKey, aiSettings.model, persona)

    // Record the AI call (budget tracking)
    recordAICall()

    if (!aiResponse) {
      updatePhase('ai', 'error', 'No response')
      console.warn('[AI Engine] No response from AI')
      return null
    }

    // 9. Parse AI response
    const recommendation = parseAIResponse(aiResponse, symbol, quote.price)

    if (!recommendation) {
      updatePhase('ai', 'error', 'Parse failed')
      console.warn('[AI Engine] Failed to parse AI response')
      return null
    }

    // 10. Validate confidence threshold (configurable, default 60% - lowered from 80% for more recommendations)
    const threshold = confidenceThreshold ?? 60
    if (recommendation.confidence < threshold) {
      updatePhase('ai', 'complete', `Low conf: ${recommendation.confidence}%`)
      console.log(`[AI Engine] Confidence too low (${recommendation.confidence}% < ${threshold}%), skipping recommendation`)
      return null
    }

    // Mark AI phase complete with result
    updatePhase('ai', 'complete', `${recommendation.action} ${recommendation.confidence}%`)

    // 11. Build final recommendation object
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
      stopLoss: recommendation.stopLoss,
      // Position sizing based on user risk settings
      suggestedShares: recommendation.suggestedShares,
      suggestedDollarAmount: recommendation.suggestedDollarAmount
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
  newsHeadlines: string[],
  marketRegime: MarketRegime | null,
  patterns: DetectedPattern[],
  memoryContext: string = '',
  includeOptionsLanguage: boolean = false,
  relativeStrength: RelativeStrength | null = null,
  recommendationFormat: 'standard' | 'concise' | 'detailed' = 'standard',
  riskSettings?: RiskSettings,
  persona?: 'sterling' | 'jax' | 'cipher'
): string {
  // Sanitize all external inputs before including in prompt
  const safeSymbol = sanitizeSymbol(symbol)
  const safeHeadlines = newsHeadlines.map(h => sanitizeForPrompt(h, 200))
  const safeMemoryContext = sanitizeForPrompt(memoryContext, 1000)

  const regimeSection = marketRegime
    ? formatRegimeForPrompt(marketRegime)
    : '**MARKET REGIME:** Unable to calculate (insufficient data)'

  // Format candlestick patterns for the prompt (pattern names are internal, safe)
  const patternSection = patterns.length > 0
    ? patterns.map(p =>
        `- ${p.pattern} (${p.type}, ${p.reliability} reliability, score: ${p.reliabilityScore})`
      ).join('\n')
    : 'No significant patterns detected'

  const prompt = `You are a professional trading analyst. Analyze the following data for ${safeSymbol} and provide a trading recommendation.

${regimeSection}

**CURRENT PRICE DATA:**
- Symbol: ${safeSymbol}
- Current Price: $${quote.price}
- Change: ${quote.change > 0 ? '+' : ''}$${quote.change} (${quote.changePercent > 0 ? '+' : ''}${quote.changePercent}%)
- Volume: ${quote.volume.toLocaleString()}

**TECHNICAL INDICATORS:**
${indicators.rsi14 ? `- RSI (14): ${indicators.rsi14} ${indicators.rsi14 > 70 ? '(Overbought)' : indicators.rsi14 < 30 ? '(Oversold)' : '(Neutral)'}` : '- RSI: N/A'}
${indicators.macd ? `- MACD: ${indicators.macd.histogram > 0 ? 'Bullish' : 'Bearish'} (Value: ${indicators.macd.value}, Signal: ${indicators.macd.signal})` : '- MACD: N/A'}
${indicators.bollingerBands ? `- Bollinger Bands: Upper $${indicators.bollingerBands.upper}, Middle $${indicators.bollingerBands.middle}, Lower $${indicators.bollingerBands.lower} (%B: ${indicators.bollingerBands.percentB}${indicators.bollingerBands.percentB > 1 ? ' - Above upper band' : indicators.bollingerBands.percentB < 0 ? ' - Below lower band' : ''})` : ''}
${indicators.atr14 ? `- ATR (14): $${indicators.atr14} (volatility measure for stop-loss sizing)` : ''}
${indicators.ma20 ? `- MA(20): $${indicators.ma20}` : ''}
${indicators.ma50 ? `- MA(50): $${indicators.ma50}` : ''}
${indicators.ma200 ? `- MA(200): $${indicators.ma200}` : ''}
- Trend: ${indicators.trend}
- Momentum: ${indicators.momentum}
${indicators.volatility ? `- Volatility: ${indicators.volatility}` : ''}
${relativeStrength ? `
${formatRelativeStrengthForPrompt(safeSymbol, relativeStrength)}
` : ''}
**RECENT CANDLESTICK PATTERNS:**
${patternSection}

Pattern guidance:
- High reliability patterns (score 70+) are strong signals
- Volume-confirmed patterns carry more weight
- Patterns aligned with market regime trend are stronger signals
- Bullish patterns in bearish regime (or vice versa) may indicate reversal

**RECENT NEWS (Last 24 hours):**
${safeHeadlines.length > 0 ? safeHeadlines.map((h, i) => `${i + 1}. ${h}`).join('\n') : 'No recent news available'}
${safeMemoryContext}
**INSTRUCTIONS:**
Based on this data AND THE MARKET REGIME, provide a trading recommendation. The market regime is critical context:
- In HIGH_VOL_BEARISH (Fear Mode): Be very cautious, favor HOLD or defensive positions
- In HIGH_VOL_BULLISH: Reduce position size recommendations, tighter stops
- In CHOPPY: Avoid directional bets entirely. Strongly favor HOLD. Wait for trend clarity.
- In LOW_VOL_BULLISH: More aggressive targets acceptable
- In LOW_VOL_BEARISH: Watch for reversal signals
${includeOptionsLanguage ? `
**OPTIONS-AWARE SUGGESTIONS:**
When confidence is 75% or higher, include optional options strategy suggestions in the rationale:
- For BUY recommendations: Mention "or Buy Call for leverage" as an alternative
- For SELL recommendations: Mention "or Buy Put for downside protection" as an alternative
- Only suggest options when conviction is high and risk/reward is clear` : ''}
${riskSettings ? `
**USER RISK PARAMETERS:**
- Daily Trading Budget: $${riskSettings.dailyBudget.toLocaleString()}
- Max Position Size: ${riskSettings.positionSizeLimit}% of portfolio ($${Math.round(riskSettings.dailyBudget * riskSettings.positionSizeLimit / 100)})
- Daily Loss Limit: ${riskSettings.dailyLossLimit}% ($${Math.round(riskSettings.dailyBudget * riskSettings.dailyLossLimit / 100)})

**POSITION SIZING RULES:**
- Calculate suggestedDollarAmount based on the position size limit above
- Calculate suggestedShares = suggestedDollarAmount / current price (round down to whole number)
- Stop-loss should limit potential loss to the daily loss limit
- In HIGH_VOL regimes, reduce position size by 50%` : ''}

**OUTPUT FORMAT:** ${recommendationFormat === 'concise' ? 'Keep rationale under 50 words. Be direct and actionable.' : recommendationFormat === 'detailed' ? 'Provide comprehensive breakdown with all indicators, patterns, risk factors, and confidence reasoning.' : 'Include 2-3 sentences with key data points and reasoning.'}
${persona && PERSONA_PROMPTS[persona] ? `
**RATIONALE STYLE (IMPORTANT):**
You are ${PERSONA_PROMPTS[persona].name}, ${PERSONA_PROMPTS[persona].title}.
${PERSONA_PROMPTS[persona].rationaleStyle}

Write the rationale field in this voice. The rationale should sound like ${PERSONA_PROMPTS[persona].name} is speaking directly to the trader.` : ''}

Respond ONLY with valid JSON in this exact format:

{
  "action": "BUY" | "SELL" | "HOLD",
  "confidence": 0-100,
  "rationale": "Brief 2-3 sentence explanation referencing market regime, candlestick patterns, and specific data points${includeOptionsLanguage ? '. Include options alternative if confidence >= 75%' : ''}"${riskSettings ? `,
  "suggestedShares": number or null,
  "suggestedDollarAmount": number or null` : ''},
  "priceTarget": number or null,
  "stopLoss": number or null
}

Rules:
- confidence should be 0-100 (whole number)
- priceTarget and stopLoss are optional but recommended for BUY/SELL
- When ATR is available, use it for stop-loss sizing: stopLoss = current price - (2 × ATR) for BUY, current price + (2 × ATR) for SELL
- When Bollinger Bands show %B < 0.2 (near lower band), this supports BUY signals; %B > 0.8 (near upper band) supports SELL signals
- rationale MUST reference the market regime, any significant candlestick patterns, AND specific technical data (RSI, MACD, Bollinger Bands, etc.)
- In high volatility regimes or when volatility is "high", recommend tighter stops and lower position sizes${riskSettings ? `
- suggestedShares and suggestedDollarAmount should respect the user's position size limit
- For HOLD recommendations, suggestedShares and suggestedDollarAmount should be null` : ''}
- Be honest about uncertainty - lower confidence if data is mixed or regime is risky

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
  _model?: string,
  persona: 'sterling' | 'jax' | 'cipher' = 'jax'
): Promise<string | null> {
  try {
    // Import AI library functions
    const { sendChatMessage } = await import('../renderer/lib/ai')

    // Note: We're reusing the chat function but with an empty history
    // Persona affects the AI's communication style in recommendations
    const response = await sendChatMessage(prompt, [], persona)

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
      stopLoss: stopLoss || undefined,
      // Position sizing fields (optional, depends on risk settings being passed)
      suggestedShares: typeof parsed.suggestedShares === 'number' ? Math.floor(parsed.suggestedShares) : undefined,
      suggestedDollarAmount: typeof parsed.suggestedDollarAmount === 'number' ? Math.round(parsed.suggestedDollarAmount) : undefined
    }

  } catch (error) {
    console.error('[AI Engine] Failed to parse AI response:', error)
    return null
  }
}

/**
 * Get recent news headlines for a symbol
 * Uses RSS-based news from the news store (neither TwelveData nor Polygon include news)
 */
async function getRecentNews(symbol: string): Promise<string[]> {
  try {
    // Get news from news store (RSS-based)
    const { useNewsStore } = await import('../renderer/stores/newsStore')
    const store = useNewsStore.getState()
    const headlines = store.headlines

    // Filter for symbol-related news (simple keyword match)
    const relevantNews = headlines
      .filter(news =>
        news.headline.toUpperCase().includes(symbol) ||
        news.summary?.toUpperCase().includes(symbol) ||
        news.tickers?.includes(symbol)
      )
      .slice(0, 5) // Max 5 headlines
      .map(news => news.headline)

    // If no symbol-specific news, return general market headlines
    if (relevantNews.length === 0) {
      console.log(`[AI Engine] No ${symbol}-specific news, using general headlines`)
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
 * Uses Intl.DateTimeFormat for proper DST handling
 */
export function isMarketOpen(): boolean {
  const now = new Date()
  const day = now.getDay() // 0 = Sunday, 6 = Saturday

  // Weekend check
  if (day === 0 || day === 6) return false

  // Use Intl.DateTimeFormat for proper DST handling
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  })

  // Parse the formatted time (format: "HH:MM")
  const parts = formatter.formatToParts(now)
  const hourPart = parts.find(p => p.type === 'hour')
  const minutePart = parts.find(p => p.type === 'minute')

  const etHours = parseInt(hourPart?.value || '0', 10)
  const etMinutes = parseInt(minutePart?.value || '0', 10)

  // Market hours: 9:30 AM - 4:00 PM ET
  const marketStart = 9 * 60 + 30 // 9:30 AM in minutes (570)
  const marketEnd = 16 * 60 // 4:00 PM in minutes (960)
  const currentMinutes = etHours * 60 + etMinutes

  return currentMinutes >= marketStart && currentMinutes < marketEnd
}

/**
 * Backtest variant input types
 */
export interface BacktestCandleData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface BacktestRecommendationOptions {
  skipBudgetCheck?: boolean  // Skip daily budget limit (for backtesting)
  confidenceThreshold?: number
  newsHeadlines?: string[]  // Pre-fetched historical news
  marketRegimeOverride?: MarketRegime | null  // Use pre-calculated regime
}

/**
 * Generate AI trading recommendation for backtesting
 * Uses pre-fetched historical data instead of live data
 *
 * @param symbol - Stock ticker symbol
 * @param historicalCandles - Pre-fetched candle data (point-in-time, oldest to newest)
 * @param options - Backtest options
 */
export async function generateRecommendationForBacktest(
  symbol: string,
  historicalCandles: BacktestCandleData[],
  options: BacktestRecommendationOptions = {}
): Promise<AIRecommendation | null> {
  try {
    const {
      skipBudgetCheck = true,
      confidenceThreshold = 70,
      newsHeadlines = [],
      marketRegimeOverride
    } = options

    console.log(`[AI Engine Backtest] Starting analysis for ${symbol} with ${historicalCandles.length} candles`)

    // 1. Check if AI is configured
    const aiSettings = await getAISettings()
    if (!aiSettings.apiKey) {
      console.warn('[AI Engine Backtest] No AI API key configured')
      return null
    }

    // 2. Check AI budget (unless skipped for backtesting)
    if (!skipBudgetCheck && !canMakeAICall()) {
      const status = getAIBudgetStatus()
      console.warn(`[AI Engine Backtest] Daily AI budget exhausted (${status.used}/${status.limit})`)
      return null
    }

    // 3. Validate candle data
    if (!historicalCandles || historicalCandles.length < 50) {
      console.warn('[AI Engine Backtest] Insufficient historical data')
      return null
    }

    // 4. Get current candle (last in array)
    const currentCandle = historicalCandles[historicalCandles.length - 1]
    const currentPrice = currentCandle.close

    // Create a mock quote from the current candle
    const mockQuote: Quote = {
      symbol,
      price: currentCandle.close,
      change: currentCandle.close - currentCandle.open,
      changePercent: ((currentCandle.close - currentCandle.open) / currentCandle.open) * 100,
      volume: currentCandle.volume || 0,
      high: currentCandle.high,
      low: currentCandle.low,
      open: currentCandle.open,
      previousClose: historicalCandles.length > 1
        ? historicalCandles[historicalCandles.length - 2].close
        : currentCandle.open,
      timestamp: currentCandle.time * 1000
    }

    // 5. Convert to CandleData (ensure volume has default value)
    const candleData: CandleData[] = historicalCandles.map(c => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume ?? 0
    }))

    // 6. Calculate technical indicators from historical candles
    const indicators = calculateIndicators(candleData)

    // 7. Detect candlestick patterns from recent candles
    const allPatterns = detectPatterns(candleData)
    const recentPatterns = allPatterns
      .filter(p => p.reliabilityScore >= 50)
      .slice(-5)

    console.log(`[AI Engine Backtest] Detected ${allPatterns.length} patterns, ${recentPatterns.length} significant`)

    // 8. Get market regime (use override if provided, otherwise calculate)
    let marketRegime = marketRegimeOverride
    if (!marketRegime) {
      // For backtest, we should ideally calculate regime from historical SPY/VIX
      // For now, we'll skip regime or use a neutral default
      console.log('[AI Engine Backtest] No market regime override, using neutral context')
      marketRegime = null
    }

    // 9. Build prompt with historical context
    const prompt = buildBacktestAnalysisPrompt(
      symbol,
      mockQuote,
      indicators,
      newsHeadlines,
      marketRegime,
      recentPatterns,
      currentCandle.time
    )

    // 10. Send to AI
    // Get user's selected persona for AI communication style
    const userSettings = await getSettings()
    const persona = userSettings.persona || 'sterling'
    const aiResponse = await sendAnalysisToAI(
      prompt,
      aiSettings.provider,
      aiSettings.apiKey,
      aiSettings.model,
      persona
    )

    // Record the AI call (unless skipped)
    if (!skipBudgetCheck) {
      recordAICall()
    }

    if (!aiResponse) {
      console.warn('[AI Engine Backtest] No response from AI')
      return null
    }

    // 10. Parse AI response
    const recommendation = parseAIResponse(aiResponse, symbol, currentPrice)

    if (!recommendation) {
      console.warn('[AI Engine Backtest] Failed to parse AI response')
      return null
    }

    // 11. Validate confidence threshold
    if (recommendation.confidence < confidenceThreshold) {
      console.log(`[AI Engine Backtest] Confidence too low (${recommendation.confidence}% < ${confidenceThreshold}%)`)
      return null
    }

    // 12. Build final recommendation object
    const finalRecommendation: AIRecommendation = {
      id: generateId(),
      ticker: symbol,
      action: recommendation.action,
      confidence: recommendation.confidence,
      rationale: recommendation.rationale,
      sources: [
        { title: 'Technical Analysis (Backtest)', url: '' },
        { title: `${aiSettings.provider} ${aiSettings.model}`, url: '' }
      ],
      timestamp: currentCandle.time * 1000, // Use candle time, not current time
      priceTarget: recommendation.priceTarget,
      stopLoss: recommendation.stopLoss
    }

    console.log(`[AI Engine Backtest] Generated ${recommendation.action} for ${symbol} @ $${currentPrice} (${recommendation.confidence}% confidence)`)
    return finalRecommendation

  } catch (error) {
    console.error('[AI Engine Backtest] Analysis failed:', error)
    return null
  }
}

/**
 * Build analysis prompt for backtest (includes timestamp context)
 */
function buildBacktestAnalysisPrompt(
  symbol: string,
  quote: Quote,
  indicators: any,
  newsHeadlines: string[],
  marketRegime: MarketRegime | null,
  patterns: DetectedPattern[],
  timestamp: number
): string {
  const dateStr = new Date(timestamp * 1000).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const regimeSection = marketRegime
    ? formatRegimeForPrompt(marketRegime)
    : '**MARKET REGIME:** Not available for this backtest point'

  const patternSection = patterns.length > 0
    ? patterns.map(p =>
        `- ${p.pattern} (${p.type}, ${p.reliability} reliability, score: ${p.reliabilityScore})`
      ).join('\n')
    : 'No significant patterns detected'

  const prompt = `You are a professional trading analyst. Analyze the following historical data for ${symbol} as of ${dateStr} and provide a trading recommendation.

**IMPORTANT:** This is a backtest simulation. You are analyzing data as it appeared on ${dateStr}. Do NOT reference any events or information after this date.

${regimeSection}

**PRICE DATA (as of ${dateStr}):**
- Symbol: ${symbol}
- Current Price: $${quote.price.toFixed(2)}
- Day Change: ${quote.change > 0 ? '+' : ''}$${quote.change.toFixed(2)} (${quote.changePercent > 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%)
- Volume: ${quote.volume.toLocaleString()}

**TECHNICAL INDICATORS:**
${indicators.rsi14 ? `- RSI (14): ${indicators.rsi14} ${indicators.rsi14 > 70 ? '(Overbought)' : indicators.rsi14 < 30 ? '(Oversold)' : '(Neutral)'}` : '- RSI: N/A'}
${indicators.macd ? `- MACD: ${indicators.macd.histogram > 0 ? 'Bullish' : 'Bearish'} (Value: ${indicators.macd.value?.toFixed(2) ?? 'N/A'}, Signal: ${indicators.macd.signal?.toFixed(2) ?? 'N/A'})` : '- MACD: N/A'}
${indicators.bollingerBands ? `- Bollinger Bands: Upper $${indicators.bollingerBands.upper}, Middle $${indicators.bollingerBands.middle}, Lower $${indicators.bollingerBands.lower} (%B: ${indicators.bollingerBands.percentB})` : ''}
${indicators.atr14 ? `- ATR (14): $${indicators.atr14}` : ''}
${indicators.ma20 ? `- MA(20): $${indicators.ma20.toFixed(2)}` : ''}
${indicators.ma50 ? `- MA(50): $${indicators.ma50.toFixed(2)}` : ''}
${indicators.ma200 ? `- MA(200): $${indicators.ma200.toFixed(2)}` : ''}
- Trend: ${indicators.trend || 'Unknown'}
- Momentum: ${indicators.momentum || 'Unknown'}
${indicators.volatility ? `- Volatility: ${indicators.volatility}` : ''}

**CANDLESTICK PATTERNS:**
${patternSection}

**NEWS HEADLINES (around ${dateStr}):**
${newsHeadlines.length > 0 ? newsHeadlines.map((h, i) => `${i + 1}. ${h}`).join('\n') : 'No news data available for this period'}

**INSTRUCTIONS:**
Based on this data, provide a trading recommendation. Consider:
- Technical indicator alignment (RSI, MACD, Moving Averages)
- Candlestick pattern signals and their reliability scores
- Overall trend direction
- Any news sentiment if available

Respond ONLY with valid JSON in this exact format:

{
  "action": "BUY" | "SELL" | "HOLD",
  "confidence": 0-100,
  "rationale": "Brief 2-3 sentence explanation referencing specific technical data points and patterns",
  "priceTarget": number or null,
  "stopLoss": number or null
}

Rules:
- confidence should be 0-100 (whole number)
- priceTarget: For BUY, set ~3-7% above current price. For SELL, set ~3-7% below.
- stopLoss: For BUY, set ~2-4% below current price. For SELL, set ~2-4% above.
- rationale MUST reference specific numbers (RSI value, MA levels, pattern names)
- Be honest about uncertainty - lower confidence if signals are mixed

Respond with ONLY the JSON object, no additional text.`

  return prompt
}
