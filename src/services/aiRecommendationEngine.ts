/**
 * AI Recommendation Engine
 * Automatically generates trading recommendations by analyzing market data with AI
 */

import { getAISettings } from '../renderer/lib/db'
import { fetchHistoricalData, fetchLivePrices } from './marketData'
import { calculateIndicators } from './technicalIndicators'
import { calculateMarketRegime, formatRegimeForPrompt, type MarketRegime } from './marketRegime'
import { detectPatterns, type DetectedPattern } from './candlestickPatterns'
import type { AIRecommendation, Quote, AnalysisPhase } from '../renderer/types'
import type { CandleData } from './technicalIndicators'
import { generateId } from '../renderer/lib/utils'
import { canMakeAICall, recordAICall, getAIBudgetStatus } from './aiBudgetTracker'
import { findSimilarScenarios, extractSignature, buildMemoryContext } from './memoryStore'

interface RecommendationResponse {
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  rationale: string
  priceTarget?: number
  stopLoss?: number
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
      return null
    }

    // 1b. Check AI budget before making call
    if (!canMakeAICall()) {
      const status = getAIBudgetStatus()
      console.warn(`[AI Engine] Daily AI budget exhausted (${status.used}/${status.limit} calls). Skipping analysis for ${symbol}`)
      return null
    }

    // Phase 1: Market Regime
    updatePhase('regime', 'active')
    const marketRegime = await calculateMarketRegime()
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

    const indicators = calculateIndicators(candles)
    const rsiLabel = indicators.rsi14 ? `RSI ${indicators.rsi14}` : 'Calculating...'
    updatePhase('technicals', 'complete', rsiLabel)

    // Phase 4: Detect candlestick patterns
    updatePhase('patterns', 'active')
    const allPatterns = detectPatterns(candles)
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
        memoryContext = buildMemoryContext(similarScenarios)
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
    const prompt = buildAnalysisPrompt(symbol, quote, indicators, newsHeadlines, marketRegime, recentPatterns, memoryContext)
    const aiResponse = await sendAnalysisToAI(prompt, aiSettings.provider, aiSettings.apiKey, aiSettings.model)

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

    // 10. Validate confidence threshold (configurable, default 70%)
    const threshold = confidenceThreshold ?? 70
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
  newsHeadlines: string[],
  marketRegime: MarketRegime | null,
  patterns: DetectedPattern[],
  memoryContext: string = ''
): string {
  const regimeSection = marketRegime
    ? formatRegimeForPrompt(marketRegime)
    : '**MARKET REGIME:** Unable to calculate (insufficient data)'

  // Format candlestick patterns for the prompt
  const patternSection = patterns.length > 0
    ? patterns.map(p =>
        `- ${p.pattern} (${p.type}, ${p.reliability} reliability, score: ${p.reliabilityScore})`
      ).join('\n')
    : 'No significant patterns detected'

  const prompt = `You are a professional trading analyst. Analyze the following data for ${symbol} and provide a trading recommendation.

${regimeSection}

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

**RECENT CANDLESTICK PATTERNS:**
${patternSection}

Pattern guidance:
- High reliability patterns (score 70+) are strong signals
- Volume-confirmed patterns carry more weight
- Patterns aligned with market regime trend are stronger signals
- Bullish patterns in bearish regime (or vice versa) may indicate reversal

**RECENT NEWS (Last 24 hours):**
${newsHeadlines.length > 0 ? newsHeadlines.map((h, i) => `${i + 1}. ${h}`).join('\n') : 'No recent news available'}
${memoryContext}
**INSTRUCTIONS:**
Based on this data AND THE MARKET REGIME, provide a trading recommendation. The market regime is critical context:
- In HIGH_VOL_BEARISH (Fear Mode): Be very cautious, favor HOLD or defensive positions
- In HIGH_VOL_BULLISH: Reduce position size recommendations, tighter stops
- In CHOPPY: Avoid directional bets entirely. Strongly favor HOLD. Wait for trend clarity.
- In LOW_VOL_BULLISH: More aggressive targets acceptable
- In LOW_VOL_BEARISH: Watch for reversal signals

Respond ONLY with valid JSON in this exact format:

{
  "action": "BUY" | "SELL" | "HOLD",
  "confidence": 0-100,
  "rationale": "Brief 2-3 sentence explanation referencing market regime, candlestick patterns, and specific data points",
  "priceTarget": number or null,
  "stopLoss": number or null
}

Rules:
- confidence should be 0-100 (whole number)
- priceTarget and stopLoss are optional but recommended for BUY/SELL
- rationale MUST reference the market regime, any significant candlestick patterns, AND specific technical data (RSI, MACD, news, etc.)
- In high volatility regimes, recommend tighter stops and lower position sizes
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
 * Uses Finnhub for ticker-specific news when available, falls back to RSS store
 */
async function getRecentNews(symbol: string): Promise<string[]> {
  try {
    // First, try Finnhub for ticker-specific news (best quality)
    try {
      const { getSettings } = await import('../renderer/lib/db')
      const settings = await getSettings()

      if (settings.finnhubApiKey) {
        const { fetchNewsFromFinnhub } = await import('./newsService')
        const finnhubNews = await fetchNewsFromFinnhub(symbol)

        if (finnhubNews.length > 0) {
          console.log(`[AI Engine] Using ${finnhubNews.length} Finnhub headlines for ${symbol}`)
          return finnhubNews.slice(0, 5).map(news => news.headline)
        }
      }
    } catch (finnhubError) {
      console.warn('[AI Engine] Finnhub news fetch failed, falling back to RSS:', finnhubError)
    }

    // Fallback: Try to get news from news store (RSS-based)
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
    const aiResponse = await sendAnalysisToAI(
      prompt,
      aiSettings.provider,
      aiSettings.apiKey,
      aiSettings.model
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
${indicators.macd ? `- MACD: ${indicators.macd.histogram > 0 ? 'Bullish' : 'Bearish'} (Value: ${indicators.macd.value?.toFixed(2)}, Signal: ${indicators.macd.signal?.toFixed(2)})` : '- MACD: N/A'}
${indicators.ma20 ? `- MA(20): $${indicators.ma20.toFixed(2)}` : ''}
${indicators.ma50 ? `- MA(50): $${indicators.ma50.toFixed(2)}` : ''}
${indicators.ma200 ? `- MA(200): $${indicators.ma200.toFixed(2)}` : ''}
- Trend: ${indicators.trend || 'Unknown'}
- Momentum: ${indicators.momentum || 'Unknown'}

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
