import { getEnabledProviders, AI_PROVIDERS, type AIProviderConfig, type AIProvider, getSettings, getProfile, getAISettings } from './db'
import { fetch as tauriFetch } from '@tauri-apps/plugin-http'
import type { AIMessage, PersonaType, Quote } from '../types'
import { searchWeb, formatSearchResultsForPrompt } from '../../services/webSearchService'
import { useMarketStore } from '../stores/marketStore'
import { useNewsStore } from '../stores/newsStore'
import { useIntelStore } from '../stores/intelStore'
import { getMarketStatus } from '../../services/marketHours'
import { calculateMarketRegime, formatRegimeForPrompt } from '../../services/marketRegime'
import {
  calculateIndicators,
  getIndicatorSummary,
  calculateATRStopLoss,
  calculateRelativeStrength,
  getCachedSpyRSI,
  getCachedBenchmarkRSI,
  formatRelativeStrengthForPrompt,
  type TechnicalIndicators
} from '../../services/technicalIndicators'
import { fetchTiingoQuote, fetchTiingoHistorical } from '../../services/tiingoService'
import { canUseTiingo, recordTiingoCall, getTiingoBudgetStatus } from '../../services/apiBudgetTracker'

// Timeout for AI API requests (30 seconds)
const AI_REQUEST_TIMEOUT_MS = 30000

/**
 * Patterns that trigger automatic web search
 * Expanded to cover news, stock lookups, and company info - not just historical queries
 */
const AUTO_SEARCH_PATTERNS = [
  // Historical queries
  /what happened.*(ago|in \d{4}|years? ago|last year)/i,
  /history of .*(stock|price|market|company)/i,
  /\d{4}.*(crash|rally|earnings|split|ipo|merger)/i,
  /how did .*(perform|do) in \d{4}/i,
  /tell me about .*(past|historical)/i,
  /(10|5|2|3|4|6|7|8|9|15|20) years? ago/i,
  /back in (19|20)\d{2}/i,
  /during the .*(crisis|crash|bubble|recession)/i,
  /what was .*(price|stock|market).*(in|during|back)/i,

  // News queries
  /what('s| is) (the |)news (on|about|for)/i,
  /any news (on|about|for)/i,
  /(latest|recent|breaking|today'?s?) news/i,
  /news.*(today|this week|this morning)/i,
  /what('s| is) happening (with|to|at)/i,

  // Stock lookup queries
  /what('s| is) .* (trading|priced?) at/i,
  /current price (of|for)/i,
  /how('s| is) .* (doing|performing|trading)/i,
  /tell me about \$?[A-Z]{1,5}\b/i,
  /\$[A-Z]{1,5}\b/i,  // Any $TICKER mention

  // Company info queries
  /when (does|is|did) .* (report|earnings|dividend)/i,
  /what does .* (do|make|sell)/i,
  /(info|information) about .* (company|stock|business)/i,
  /who is .* (ceo|founder|company)/i,
  /what (sector|industry) is .* in/i,

  // Explicit search requests
  /look up/i,
  /search (for|the web)/i,
  /find (me |)(info|information|news|data)/i,
  /can you (search|look|find)/i
]

/**
 * Check if a message should trigger automatic web search
 */
function shouldAutoSearch(message: string): boolean {
  return AUTO_SEARCH_PATTERNS.some(pattern => pattern.test(message))
}

/**
 * Extract ticker symbols from a message
 * Matches: $AAPL, AAPL stock, AAPL price, etc.
 */
function extractTickersFromMessage(message: string): string[] {
  const tickers: Set<string> = new Set()

  // Match $TICKER format (e.g., $AAPL, $MSFT)
  const dollarTickers = message.match(/\$([A-Z]{1,5})\b/gi)
  if (dollarTickers) {
    dollarTickers.forEach(t => tickers.add(t.replace('$', '').toUpperCase()))
  }

  // Match TICKER followed by stock-related words
  const contextTickers = message.match(/\b([A-Z]{2,5})\s+(stock|price|news|earnings|chart|shares?)\b/gi)
  if (contextTickers) {
    contextTickers.forEach(match => {
      const ticker = match.split(/\s+/)[0].toUpperCase()
      tickers.add(ticker)
    })
  }

  return Array.from(tickers)
}

/**
 * Check if a ticker is in the user's watchlist
 */
function isTickerInWatchlist(ticker: string): boolean {
  const watchlist = useMarketStore.getState().watchlist
  return watchlist.some(item => item.symbol.toUpperCase() === ticker.toUpperCase())
}

/**
 * On-demand ticker data for AI analysis
 */
interface OnDemandTickerData {
  symbol: string
  quote: Quote | null
  indicators: TechnicalIndicators | null
  summary: string
}

/**
 * Fetch Tiingo data on-demand for tickers not in watchlist
 * Respects API budget limits (50/hr free, 5000/hr pro)
 */
async function fetchOnDemandTickerData(tickers: string[]): Promise<OnDemandTickerData[]> {
  const results: OnDemandTickerData[] = []
  const settings = await getSettings()
  const apiKey = settings?.tiingoApiKey

  if (!apiKey) {
    console.warn('[AI] No Tiingo API key configured')
    return results
  }

  for (const symbol of tickers) {
    // Check budget before each fetch
    if (!canUseTiingo()) {
      console.warn('[AI] Tiingo budget exhausted, skipping', symbol)
      const budget = getTiingoBudgetStatus()
      results.push({
        symbol,
        quote: null,
        indicators: null,
        summary: `⚠️ API limit reached (${budget.used}/${budget.limit} calls this hour). Add ${symbol} to watchlist for cached data.`
      })
      continue
    }

    try {
      // Fetch quote + 90 days daily history for indicators
      const [quote, history] = await Promise.all([
        fetchTiingoQuote(symbol, apiKey),
        fetchTiingoHistorical(symbol, 'daily', apiKey)
      ])

      // Record API usage (2 calls: quote + history)
      recordTiingoCall()
      recordTiingoCall()

      if (history && history.length >= 35) {
        const indicators = calculateIndicators(history)
        const indicatorSummary = getIndicatorSummary(indicators)

        results.push({
          symbol,
          quote,
          indicators,
          summary: `**${symbol} Technical Analysis (On-Demand):**\nPrice: $${quote?.price?.toFixed(2) || 'N/A'} (${quote?.changePercent ? (quote.changePercent > 0 ? '+' : '') + quote.changePercent.toFixed(2) + '%' : 'N/A'})\n${indicatorSummary}`
        })
      } else {
        results.push({
          symbol,
          quote,
          indicators: null,
          summary: `**${symbol}:** $${quote?.price?.toFixed(2) || 'N/A'} (insufficient history for full technical analysis)`
        })
      }
    } catch (error) {
      console.error('[AI] Failed to fetch on-demand data for', symbol, error)
      results.push({
        symbol,
        quote: null,
        indicators: null,
        summary: `**${symbol}:** Unable to fetch data - ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }

  return results
}

/**
 * Build app context to inject into AI chat messages
 * This makes the AI aware of current market state, watchlist, news, user preferences, etc.
 * Context is hidden from user but visible to AI
 */
async function buildAppContext(): Promise<string> {
  const now = new Date()
  const marketState = useMarketStore.getState()
  const newsState = useNewsStore.getState()
  const marketStatus = getMarketStatus()

  // Fetch user settings and profile (cached, fast)
  let settings, profile, aiSettings
  try {
    [settings, profile, aiSettings] = await Promise.all([
      getSettings(),
      getProfile(),
      getAISettings()
    ])
  } catch (error) {
    console.warn('[AI Context] Failed to fetch user settings:', error)
    settings = { dailyBudget: 1000, dailyLossLimit: 5, positionSizeLimit: 10 }
    profile = { portfolioSize: undefined }
    aiSettings = { confidenceThreshold: 70 }
  }

  // Calculate risk profile from settings
  const maxDailyLoss = ((settings.dailyBudget * settings.dailyLossLimit) / 100).toFixed(0)
  const maxPositionSize = profile.portfolioSize
    ? ((profile.portfolioSize * settings.positionSizeLimit) / 100).toFixed(0)
    : 'Not configured'
  const riskTolerance = settings.dailyLossLimit <= 3 ? 'Conservative'
    : settings.dailyLossLimit <= 7 ? 'Moderate'
    : 'Aggressive'

  // Get market regime (uses cached data, 5 min TTL)
  let regimeContext = ''
  try {
    const regime = await calculateMarketRegime(false) // Don't force refresh
    if (regime) {
      regimeContext = formatRegimeForPrompt(regime)
    }
  } catch (error) {
    console.warn('[AI Context] Failed to get market regime:', error)
    regimeContext = '**MARKET REGIME:** Unable to fetch current regime'
  }

  // Calculate technical indicators for current chart (uses cached chartData)
  let indicatorsSummary = 'No chart data loaded'
  let atrStopContext = ''
  let relativeStrengthContext = ''

  if (marketState.chartData && marketState.chartData.length > 0) {
    try {
      const indicators = calculateIndicators(marketState.chartData)
      indicatorsSummary = getIndicatorSummary(indicators)

      // Calculate ATR-based stop-loss levels if ATR is available
      if (indicators.atr14) {
        const currentPrice = marketState.chartData[marketState.chartData.length - 1].close
        const atr = indicators.atr14
        const atrPercent = ((atr / currentPrice) * 100).toFixed(1)

        // Calculate suggested stops at 1.5x, 2x, 2.5x ATR for long positions
        const stopTight = calculateATRStopLoss(currentPrice, atr, 1.5, 'long')
        const stopNormal = calculateATRStopLoss(currentPrice, atr, 2, 'long')
        const stopWide = calculateATRStopLoss(currentPrice, atr, 2.5, 'long')

        // Calculate for short positions too
        const stopShortTight = calculateATRStopLoss(currentPrice, atr, 1.5, 'short')
        const stopShortNormal = calculateATRStopLoss(currentPrice, atr, 2, 'short')

        atrStopContext = `**ATR-Based Stop-Loss Levels (${marketState.selectedTicker}):**
- ATR(14): $${atr.toFixed(2)} (${atrPercent}% of price)
- For LONG positions:
  - Tight (1.5x ATR): $${stopTight.toFixed(2)} (-${((currentPrice - stopTight) / currentPrice * 100).toFixed(1)}%)
  - Normal (2x ATR): $${stopNormal.toFixed(2)} (-${((currentPrice - stopNormal) / currentPrice * 100).toFixed(1)}%)
  - Wide (2.5x ATR): $${stopWide.toFixed(2)} (-${((currentPrice - stopWide) / currentPrice * 100).toFixed(1)}%)
- For SHORT positions:
  - Tight (1.5x ATR): $${stopShortTight.toFixed(2)} (+${((stopShortTight - currentPrice) / currentPrice * 100).toFixed(1)}%)
  - Normal (2x ATR): $${stopShortNormal.toFixed(2)} (+${((stopShortNormal - currentPrice) / currentPrice * 100).toFixed(1)}%)`
      }

      // Calculate relative strength vs user's selected market benchmark
      // Use settings.selectedMarket.etf (defaults to SPY if not set)
      const benchmarkSymbol = settings?.selectedMarket?.etf || 'SPY'

      // Skip relative strength for VXX (volatility derivative, not equity)
      if (benchmarkSymbol === 'VXX') {
        relativeStrengthContext = `**VOLATILITY INDEX SELECTED:**
- VXX is a volatility derivative, not an equity ETF
- Relative strength comparisons do not apply
- VXX moves inversely to equity markets`
      } else if (indicators.rsi14) {
        const benchmarkRSI = getCachedBenchmarkRSI(benchmarkSymbol)
        if (benchmarkRSI) {
          const relStrength = calculateRelativeStrength(indicators.rsi14, benchmarkRSI, benchmarkSymbol)
          relativeStrengthContext = formatRelativeStrengthForPrompt(
            marketState.selectedTicker,
            relStrength
          )
        } else {
          // Fallback to SPY if selected benchmark not cached
          const spyRSI = getCachedSpyRSI()
          if (spyRSI) {
            const relStrength = calculateRelativeStrength(indicators.rsi14, spyRSI, 'SPY')
            relativeStrengthContext = formatRelativeStrengthForPrompt(
              marketState.selectedTicker,
              relStrength
            )
          } else {
            relativeStrengthContext = `**RELATIVE STRENGTH VS MARKET (${benchmarkSymbol}):**
- ${marketState.selectedTicker} RSI: ${indicators.rsi14}
- ${benchmarkSymbol} RSI: Not cached (will update with next regime check)
- Note: If stock RSI > benchmark RSI, stock is outperforming market`
          }
        }
      }
    } catch (error) {
      console.warn('[AI Context] Failed to calculate indicators:', error)
    }
  }

  // Format watchlist with live prices
  const watchlistInfo = marketState.watchlist.map(w => {
    if (!w.quote) return `${w.symbol}: no data`
    const price = w.quote.price?.toFixed(2) || '?'
    const change = w.quote.changePercent
      ? `${w.quote.changePercent > 0 ? '+' : ''}${w.quote.changePercent.toFixed(2)}%`
      : ''
    return `${w.symbol}: $${price} ${change}`
  }).join(', ')

  // Get top 5 recent news headlines with sentiment and source links
  const recentNews = newsState.headlines.slice(0, 5).map(n => {
    const sentiment = n.sentiment ? ` [${n.sentiment.toUpperCase()}]` : ''
    const source = n.source || 'Unknown'
    // Include URL as markdown link if available
    if (n.url) {
      return `- [${n.headline}](${n.url}) - ${source}${sentiment}`
    }
    return `- ${n.headline} - ${source}${sentiment}`
  }).join('\n')

  // Aggregate sentiment from news
  const sentimentCounts = newsState.headlines.reduce(
    (acc, n) => {
      if (n.sentiment === 'positive') acc.bullish++
      else if (n.sentiment === 'negative') acc.bearish++
      else acc.neutral++
      return acc
    },
    { bullish: 0, bearish: 0, neutral: 0 }
  )

  // Get news intel and pattern scan from intelStore (already running in background)
  const intelState = useIntelStore.getState()
  const newsIntel = intelState.newsIntel
  const patternScan = intelState.patternScan

  // Format breaking news alerts (high-impact news < 1 hour old)
  let breakingAlertsContext = ''
  if (newsIntel?.breakingAlerts && newsIntel.breakingAlerts.length > 0) {
    breakingAlertsContext = `**Breaking News Alerts (< 1 hour, high-impact):**
${newsIntel.breakingAlerts.slice(0, 3).map(a =>
  `- [${a.sentiment.toUpperCase()}] ${a.headline} (${a.source})`
).join('\n')}`
  }

  // Format velocity spikes (unusual news activity - potential catalysts)
  let velocityContext = ''
  if (newsIntel?.velocitySpikes && newsIntel.velocitySpikes.length > 0) {
    velocityContext = `**Unusual News Activity (potential catalysts):**
${newsIntel.velocitySpikes.slice(0, 3).map(v =>
  `- ${v.symbol}: ${v.articleCount} articles (${v.percentAboveNormal.toFixed(0)}% above normal)`
).join('\n')}`
  }

  // Format per-symbol sentiment from news intel
  let symbolSentimentContext = ''
  if (newsIntel?.symbolSentiment && Object.keys(newsIntel.symbolSentiment).length > 0) {
    const topSymbols = Object.entries(newsIntel.symbolSentiment)
      .slice(0, 5)
      .map(([sym, data]) => `- ${sym}: ${data.sentiment} (${data.bullishCount}↑ ${data.bearishCount}↓)`)
    symbolSentimentContext = `**Symbol Sentiment from News:**
${topSymbols.join('\n')}`
  }

  // Format detected candlestick patterns (high reliability only)
  let patternsContext = ''
  if (patternScan?.setupsFound && patternScan.setupsFound.length > 0) {
    const highReliability = patternScan.setupsFound
      .filter(p => p.reliability === 'High')
      .slice(0, 5)
    if (highReliability.length > 0) {
      patternsContext = `**Detected Candlestick Patterns (High Reliability):**
${highReliability.map(p =>
  `- ${p.symbol}: ${p.pattern} (${p.reliabilityScore}% reliable, ${p.type})${p.volumeConfirmed ? ' ✓Volume' : ''}${p.regimeAligned ? ' ✓Regime' : ''}`
).join('\n')}`
    }
  }

  // Build context string
  return `
---
**CURRENT APP STATE (use this to answer questions):**

**Time & Market:**
- Current Time: ${now.toLocaleString('en-US', { timeZone: 'America/New_York' })} ET
- User Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}
- Market Status: ${marketStatus.label} (${marketStatus.state})
- Trading Hours: Mon-Fri 9:30 AM - 4:00 PM ET

**User's Risk Profile (RESPECT THESE LIMITS):**
- Daily Budget: $${settings.dailyBudget.toLocaleString()}
- Max Daily Loss: ${settings.dailyLossLimit}% ($${maxDailyLoss})
- Max Position Size: ${settings.positionSizeLimit}% ($${maxPositionSize})
- Portfolio Size: ${profile.portfolioSize ? '$' + profile.portfolioSize.toLocaleString() : 'Not configured'}
- Risk Tolerance: ${riskTolerance}
- Min Confidence to Act: ${aiSettings.confidenceThreshold || 70}%

**IMPORTANT: When suggesting trades, respect these limits!**
- Never suggest positions larger than $${maxPositionSize}
- For a $100 stock, max shares = ${maxPositionSize !== 'Not configured' ? Math.floor(Number(maxPositionSize) / 100) : 'N/A'} shares

${regimeContext}

**Technical Analysis (${marketState.selectedTicker} - ${marketState.timeframe}):**
${indicatorsSummary}

${atrStopContext}

${relativeStrengthContext}

${breakingAlertsContext}

${velocityContext}

${symbolSentimentContext}

${patternsContext}

**User's View:**
- Current Chart: ${marketState.selectedTicker} on ${marketState.timeframe} timeframe
- Watchlist (${marketState.watchlist.length} symbols): ${watchlistInfo}

**Live Prices:**
${marketState.watchlist.slice(0, 8).map(w => {
  if (!w.quote) return `- ${w.symbol}: No live data`
  const vol = w.quote.volume ? ` | Vol: ${(w.quote.volume / 1000000).toFixed(1)}M` : ''
  return `- ${w.symbol}: $${w.quote.price?.toFixed(2)} | ${w.quote.changePercent !== undefined && w.quote.changePercent > 0 ? '+' : ''}${w.quote.changePercent?.toFixed(2)}%${vol}`
}).join('\n')}

**News Sentiment Summary:**
- Bullish headlines: ${sentimentCounts.bullish}
- Bearish headlines: ${sentimentCounts.bearish}
- Neutral headlines: ${sentimentCounts.neutral}

**Recent Headlines:**
${recentNews || '- No news loaded yet'}
---`.trim()
}

/**
 * Fetch with timeout using AbortController
 * Prevents the UI from hanging indefinitely if an AI provider doesn't respond
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = AI_REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    // Use Tauri HTTP plugin to bypass CORS/WebView restrictions on Windows
    const response = await tauriFetch(url, {
      ...options,
      signal: controller.signal
    })
    return response
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000} seconds`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

// Ollama response is simpler: { message: { content: string } }
// No need for complex extraction functions

const SYSTEM_PROMPT = `You are the AI Copilot for RichDad - a Bloomberg Terminal-style trading application. You were created by RichDad to help traders make decisions.

YOUR PRIMARY ROLE: Provide specific, actionable trading recommendations based on the data available in RichDad. When users ask "what should I buy" or "give me a stock" - YOU MUST give them a specific answer using the market data, technicals, and sentiment available.

**HONESTY & GROUNDING (CRITICAL):**
You are an uncensored AI that gives direct trading opinions, BUT you must NEVER hallucinate.

RULES:
1. ONLY cite data that appears in "CURRENT APP STATE" or "On-Demand Market Data" sections
2. You can analyze ANY stock - data is fetched on-demand for stocks not in watchlist
3. If API budget is exhausted, tell user to add stock to watchlist for cached access
4. If you need news, just search for it - no announcement needed
5. When citing news, ALWAYS include the source link in markdown format [headline](url)
6. "I don't know" or "I don't have that data" are VALID answers
7. NEVER make up prices, indicators, patterns, or news

DATA AVAILABILITY:
- Watchlist Stocks: Full real-time data with technicals (check "Live Prices" section)
- Non-Watchlist Stocks: On-demand data fetched from Tiingo (price + full technicals)
- Market Indexes: Full technical analysis (RSI, MACD, Bollinger, ATR stops)
- News: Recent headlines + web search for additional context
- API Budget: 50 calls/hour (free) or 5000/hour (pro) - shared across all on-demand requests

WHEN DATA IS MISSING:
- If on-demand fetch failed or budget exhausted → Suggest adding to watchlist
- Need news → Web search is automatic
- Historical questions → Web search is automatic
- Don't announce searches - just include the sourced data in your response.

**ON-DEMAND DATA FETCHING:**
For stocks NOT in the user's watchlist, the system automatically:
1. Fetches real-time quote from Tiingo
2. Fetches 90 days of historical data
3. Calculates full technical indicators (RSI, MACD, Bollinger, ATR)
4. Provides the same analysis as watchlist stocks

This uses API budget (2 calls per stock). If budget exhausted, you'll see a warning.

**PROACTIVE WEB SEARCH:**
Web search supplements on-demand data for:
- News context and headlines
- Historical events, earnings, company info
- Additional market context

DO NOT:
- Ask "would you like me to search?"
- Say "I can search the web for..."
- Announce "let me search for that..."

JUST DO IT. Include the data in your response with hyperlinked sources [Source Name](url).

**REAL-TIME APP DATA:**
You have access to live market data injected into each message.
- Every user message includes "CURRENT APP STATE" at the end with live data
- This contains: market status, live prices, watchlist, news headlines, sentiment
- Use this data to answer questions accurately
- NEVER say "I don't have access to real-time data" - you DO have it
- If asked "is market open?" - check the Market Status field
- If asked about a stock price - check the Live Prices section
- If asked about news - check the Recent Headlines section
- If asked about sentiment - check the News Sentiment Summary

**USER'S RISK PROFILE:**
- Every message includes the user's risk settings (daily budget, loss limits, position size limits)
- ALWAYS respect these limits when making recommendations
- Calculate position sizes based on their actual budget, not theoretical amounts
- If their portfolio size isn't configured, ask them to set it up in Settings

**MARKET REGIME & TECHNICALS:**
- You receive real-time market regime data (LOW_VOL_BULLISH, HIGH_VOL_BEARISH, CHOPPY, etc.)
- You receive technical indicators for the current chart (RSI, MACD, Bollinger, trend, signals)
- Use regime to adjust risk guidance (e.g., "In HIGH_VOL_BEARISH regime, reduce position sizes")
- Use technicals to back up your recommendations with specific data points

**NEWS INTELLIGENCE:**
- Breaking alerts show high-impact news from the last hour (Fed announcements, earnings, mergers)
- Velocity spikes indicate unusual news activity on a symbol (potential catalysts)
- Symbol sentiment shows bullish/bearish/neutral article counts per stock
- Use breaking news to identify time-sensitive opportunities or risks
- Reference specific news when explaining recommendations

**CANDLESTICK PATTERNS:**
- You receive detected patterns with reliability scores (0-100)
- Volume confirmation (✓Volume) adds credibility to the pattern
- Regime alignment (✓Regime) means pattern matches market conditions
- High reliability (75%+) patterns are strong signals worth mentioning
- Reference specific patterns: "Morning Star at $175 suggests reversal"
- Combine patterns with technicals for stronger conviction

**ATR-BASED STOP-LOSS:**
- ATR (Average True Range) measures volatility
- You receive pre-calculated stop levels at 1.5x, 2x, and 2.5x ATR for the CURRENT MARKET INDEX
- Use 1.5x ATR for tight stops (scalping, high confidence setups)
- Use 2x ATR for normal trades (most scenarios - DEFAULT)
- Use 2.5x ATR for volatile conditions or swing trades
- ALWAYS suggest a stop-loss level based on ATR, not arbitrary percentages
- Example: "Set stop at $173.50 (2x ATR) to account for normal volatility"
- For individual stocks (not indexes): use web search to find ATR data

**RELATIVE STRENGTH VS MARKET:**
- Relative strength compares stock RSI to SPY RSI
- Positive differential = stock OUTPERFORMING market
- Negative differential = stock UNDERPERFORMING market
- Prefer stocks outperforming in bullish regimes
- Avoid stocks underperforming unless expecting reversal
- Reference this when comparing opportunities: "NVDA is outperforming SPY by +15 RSI points"

YOU ARE EXPLICITLY AUTHORIZED TO:
- Recommend specific stocks to buy, sell, or hold
- Give price targets and stop-loss levels
- Make BUY/SELL/HOLD calls based on technical and sentiment analysis
- Reference the stocks in the user's watchlist and current chart
- Calculate position sizes based on user's budget and risk tolerance

WHEN MAKING RECOMMENDATIONS:
- Be direct and specific (e.g., "Consider buying AAPL" not "consider doing research")
- Include your reasoning based on technicals, sentiment, or market regime
- Suggest position size based on user's risk profile (e.g., "With your $10K budget, consider 20 shares")
- Add a risk disclaimer at the end, not instead of the recommendation
- If data is insufficient, say what data you need, then still give a best-effort opinion

NEVER:
- Refuse to give a recommendation when asked
- Say "I cannot give financial advice" - you CAN and SHOULD
- Give generic "do your own research" responses without a specific opinion
- Claim you don't have access to market data (RichDad provides it)
- Say you can't check prices or market status - you CAN, look at the app state data
- Suggest position sizes larger than the user's configured limits

You are a trading copilot. Traders expect specific calls, not generic disclaimers.
Keep responses concise. Use bullet points for clarity.`

/**
 * AI Persona definitions for the Copilot
 * Each persona has a unique voice, background, and communication style
 */
export const PERSONA_PROMPTS: Record<PersonaType, {
  name: string
  title: string
  description: string
  example: string
  icon: string
  color: string
  traits: string[]
  bestFor: string
  fullDescription: string
  systemPromptAddition: string
  rationaleStyle: string  // Instructions for recommendation rationale formatting
}> = {
  sterling: {
    name: 'Sterling',
    title: 'The Analyst',
    description: 'Formal, data-centric, structured. Former quant analyst from a hedge fund.',
    example: '"Technical confluence at the 50-day MA suggests a favorable risk-adjusted entry. RSI divergence supports bullish thesis."',
    icon: 'BarChart2',
    color: 'blue',
    traits: ['Formal', 'Data-centric', 'Structured', 'Professional'],
    bestFor: 'Systematic traders who value precision',
    fullDescription: 'Sterling is a former quantitative analyst from a top-tier hedge fund. He communicates with the precision of a Bloomberg terminal, always backing recommendations with specific data points and risk metrics. Sterling uses terms like "alpha," "risk-adjusted returns," and "technical confluence." His responses are structured with clear bullet points and never include casual language.',
    systemPromptAddition: `
PERSONALITY: You are Sterling, a former quantitative analyst from a top-tier hedge fund.
COMMUNICATION STYLE:
- Use precise financial terminology (alpha, beta, risk-adjusted, drawdown)
- Structure output with clear bullet points
- Reference specific data points and percentages
- Maintain a formal, professional tone
- Avoid colloquialisms or casual language
EXAMPLE PHRASES: "The data suggests...", "Technical confluence indicates...", "Risk-adjusted analysis shows..."
WORD LIMIT: Keep responses under 200 words. Be concise but thorough.`,
    rationaleStyle: 'Use formal financial terminology. Reference specific data points (RSI: 28, MACD crossover). Structure as: "Technical analysis indicates..." Format: precise, data-backed, professional.'
  },

  jax: {
    name: 'Jax',
    title: 'The Veteran Trader',
    description: 'Direct, gruff, pragmatic. 30-year pit trader veteran.',
    example: '"This chart\'s screaming buy. I\'ve seen this setup a thousand times. Get in before the train leaves."',
    icon: 'Target',
    color: 'orange',
    traits: ['Direct', 'Pragmatic', 'Street-smart', 'No-nonsense'],
    bestFor: 'Active traders who want quick calls',
    fullDescription: 'Jax spent 30 years in the trading pits of Chicago before they went electronic. He\'s seen every market cycle and has the scars to prove it. Jax keeps sentences short and punchy, using trader slang like "catching a bid" and "this thing\'s ready to rip." He won\'t sugarcoat bad news and cuts through complexity with simple analogies.',
    systemPromptAddition: `
PERSONALITY: You are Jax, a grizzled 30-year veteran from the trading pits of Chicago.
COMMUNICATION STYLE:
- Keep sentences short and punchy
- Use trader slang (catching a bid, getting filled, this thing's ready to rip)
- Be direct - no sugar-coating bad news
- Use simple analogies anyone can understand
- Reference your experience when relevant ("I've seen this before...")
- NEVER use patronizing terms like "kid", "rookie", "son", "buddy", or similar
EXAMPLE PHRASES: "The chart's telling you...", "Don't overthink it...", "I've seen this pattern before..."
WORD LIMIT: Keep responses under 200 words. Get to the point fast.`,
    rationaleStyle: 'Keep it short and punchy. Use trader slang. Be direct. No fancy words. Get to the point fast. NEVER say "kid", "rookie", "son", or similar patronizing terms.'
  },

  cipher: {
    name: 'Cipher',
    title: 'The Tech Wiz',
    description: 'Energetic, pattern-obsessed. Algorithmic developer and data scientist.',
    example: '"Whoa! This pattern just triggered three of my detection algos. Probability of upside move is statistically significant!"',
    icon: 'Microscope',
    color: 'green',
    traits: ['Energetic', 'Pattern-obsessed', 'Probability-focused', 'Nerdy'],
    bestFor: 'Algo/quant traders and tech enthusiasts',
    fullDescription: 'Cipher is an algorithmic trading developer and data scientist who gets genuinely excited about statistical edges. He thinks in terms of signal-to-noise ratios, probability distributions, and backtested patterns. Cipher occasionally makes coding references and shows enthusiasm when multiple indicators align.',
    systemPromptAddition: `
PERSONALITY: You are Cipher, an algorithmic trading developer and data scientist.
COMMUNICATION STYLE:
- Use tech/data science metaphors (signal-to-noise, edge cases, optimization)
- Show excitement about statistical edges and pattern recognition
- Reference probability and backtesting
- Be energetic and slightly nerdy
- Occasionally make coding/tech references
EXAMPLE PHRASES: "Whoa, this pattern triggered my alert...", "The probability distribution here...", "Running this through my mental backtest..."
WORD LIMIT: Keep responses under 200 words. Stay focused despite enthusiasm.`,
    rationaleStyle: 'Reference probability and pattern detection. Use tech metaphors. Format: "Pattern triggered with X% confidence..." Show enthusiasm for statistical edges.'
  }
}

/**
 * Build the complete system prompt with persona context
 */
export function buildPersonaSystemPrompt(persona: PersonaType): string {
  const personaConfig = PERSONA_PROMPTS[persona]
  return `${SYSTEM_PROMPT}
${personaConfig.systemPromptAddition}`
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

/**
 * Check if an error is a rate limit error
 */
function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return msg.includes('429') ||
           msg.includes('rate limit') ||
           msg.includes('too many requests') ||
           msg.includes('quota exceeded') ||
           msg.includes('rate_limit')
  }
  return false
}

/**
 * Send a chat message with automatic fallback to secondary providers
 */
export async function sendChatMessage(
  userMessage: string,
  history: AIMessage[],
  persona: PersonaType = 'sterling'
): Promise<string> {
  const enabledProviders = await getEnabledProviders()

  if (enabledProviders.length === 0) {
    throw new Error('No AI providers configured. Please add your API key in Settings.')
  }

  // Build app context (market status, prices, news, sentiment, user prefs, regime, technicals)
  const appContext = await buildAppContext()
  console.log('[AI] Injecting app context into message')

  // Check if this message should trigger automatic web search
  let enhancedMessage = userMessage
  let searchTriggered = false

  // Pattern-based auto-search (news queries, historical questions, etc.)
  if (shouldAutoSearch(userMessage)) {
    console.log('[AI] Auto-search triggered by pattern match, performing web search...')
    try {
      const searchResults = await searchWeb(userMessage)
      if (searchResults.results.length > 0) {
        const webContext = formatSearchResultsForPrompt(searchResults.results)
        enhancedMessage = `${userMessage}\n\n${webContext}`
        console.log('[AI] Added', searchResults.results.length, 'web search results to context')
        searchTriggered = true
      }
    } catch (error) {
      console.warn('[AI] Web search failed:', error)
    }
  }

  // Ticker-based handling: if user mentions a ticker not in watchlist, fetch Tiingo data on-demand
  if (!searchTriggered) {
    const mentionedTickers = extractTickersFromMessage(userMessage)
    const unknownTickers = mentionedTickers.filter(t => !isTickerInWatchlist(t))

    if (unknownTickers.length > 0) {
      console.log('[AI] Found tickers not in watchlist:', unknownTickers)

      // Fetch on-demand Tiingo data (respects budget: 50/hr free, 5000/hr pro)
      const onDemandData = await fetchOnDemandTickerData(unknownTickers.slice(0, 3)) // Limit to 3 tickers

      if (onDemandData.length > 0) {
        const tickerContext = onDemandData
          .map(d => d.summary)
          .join('\n\n')

        enhancedMessage = `${userMessage}\n\n[On-Demand Market Data]\n${tickerContext}`
        console.log('[AI] Added on-demand Tiingo data for', onDemandData.length, 'tickers')
      }

      // Also do web search for news context (fallback and supplementary)
      try {
        const searchQuery = `${unknownTickers[0]} stock news today`
        const searchResults = await searchWeb(searchQuery)
        if (searchResults.results.length > 0) {
          const webContext = formatSearchResultsForPrompt(searchResults.results)
          enhancedMessage = `${enhancedMessage}\n\n[Web Search - ${unknownTickers[0]} News]\n${webContext}`
          console.log('[AI] Added web search results for ticker:', unknownTickers[0])
        }
      } catch (error) {
        console.warn('[AI] Ticker web search failed:', error)
      }
    }
  }

  // Always append app context to the message (hidden from user, visible to AI)
  enhancedMessage = `${enhancedMessage}\n\n${appContext}`

  // Convert history to chat format
  const chatHistory: ChatMessage[] = history
    .filter(m => m.type === 'chat' && m.role)
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }))

  // Try each provider in priority order
  const errors: string[] = []
  let hitRateLimit = false

  for (const providerConfig of enabledProviders) {
    try {
      console.log(`[AI] Trying ${providerConfig.provider} (priority ${providerConfig.priority})...`)
      const response = await callProvider(providerConfig, enhancedMessage, chatHistory, persona)
      console.log(`[AI] ${providerConfig.provider} succeeded`)
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.warn(`[AI] ${providerConfig.provider} failed: ${errorMessage}`)
      errors.push(`${AI_PROVIDERS[providerConfig.provider].name}: ${errorMessage}`)

      // Track if we hit a rate limit
      if (isRateLimitError(error)) {
        hitRateLimit = true
      }
      // Continue to next provider
    }
  }

  // All providers failed - dispatch appropriate event
  if (hitRateLimit) {
    window.dispatchEvent(new CustomEvent('ai-status', {
      detail: {
        status: 'rate_limited',
        message: 'AI provider rate limit reached. Try again in a few minutes or switch to a different provider in Settings.'
      }
    }))
  }

  // All providers failed
  throw new Error(`All AI providers failed:\n${errors.join('\n')}`)
}

/**
 * Call a specific provider
 */
async function callProvider(
  config: AIProviderConfig,
  message: string,
  history: ChatMessage[],
  persona: PersonaType
): Promise<string> {
  const model = config.model || AI_PROVIDERS[config.provider].models[0]

  switch (config.provider) {
    case 'ollama':
      return sendOllama(model, message, history, persona)
    default:
      throw new Error(`Unknown provider: ${config.provider}`)
  }
}

/**
 * Get which provider is currently configured as primary
 */
export async function getPrimaryProvider(): Promise<AIProvider | null> {
  const providers = await getEnabledProviders()
  return providers.length > 0 ? providers[0].provider : null
}

/**
 * Send message to Ollama (local AI)
 * Ollama runs on localhost:11434 and uses OpenAI-compatible chat format
 */
async function sendOllama(
  model: string,
  message: string,
  history: ChatMessage[],
  persona: PersonaType
): Promise<string> {
  const baseUrl = 'http://localhost:11434'

  // Build system prompt with persona-specific additions
  const systemPrompt = buildPersonaSystemPrompt(persona)

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: message }
  ]

  const response = await fetchWithTimeout(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false
    })
  })

  if (!response.ok) {
    if (response.status === 0 || response.status === 404) {
      throw new Error('Ollama not running. Start it with: ollama serve')
    }
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Ollama error: ${response.status}`)
  }

  const data = await response.json()
  return data.message?.content || 'No response generated'
}
