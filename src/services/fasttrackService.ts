/**
 * FastTrack.net Portfolio Analytics Service
 *
 * Provides portfolio analytics data including:
 * - 40,000+ securities with 37 years of history
 * - Risk metrics: Sharpe Ratio, Sortino Ratio, Alpha, Beta
 * - Performance metrics: returns, drawdowns, correlations
 *
 * Free tier: 2,000 API calls/month
 * API Docs: https://api.fasttrack.net/docs
 *
 * Signup: https://app.fasttrack.net/
 * 1. Create account
 * 2. Navigate to API Keys section
 * 3. Generate new API key
 */

import type { CandleData } from '../renderer/types'

const FASTTRACK_BASE_URL = 'https://api.fasttrack.net/v1'

// Cache for analytics data
const analyticsCache: Map<string, { data: PortfolioAnalytics, timestamp: number }> = new Map()
const ANALYTICS_CACHE_DURATION_MS = 300000 // 5 minutes

// Rate limiting (conservative for free tier)
let callCount = 0
let callCountResetTime = Date.now()
const CALLS_PER_MONTH = 2000
const MONTH_MS = 30 * 24 * 60 * 60 * 1000

export interface RiskMetrics {
  sharpeRatio: number      // Risk-adjusted return (higher = better)
  sortinoRatio: number     // Downside risk-adjusted return
  alpha: number            // Excess return vs benchmark
  beta: number             // Market sensitivity (1 = moves with market)
  standardDeviation: number // Volatility
  maxDrawdown: number      // Worst peak-to-trough decline (%)
  calmarRatio: number      // Return / Max Drawdown
}

export interface PerformanceMetrics {
  returnYTD: number        // Year-to-date return (%)
  return1Y: number         // 1-year return (%)
  return3Y: number         // 3-year annualized return (%)
  return5Y: number         // 5-year annualized return (%)
  return10Y: number        // 10-year annualized return (%)
  returnSinceInception: number
  cagr: number             // Compound annual growth rate
}

export interface CorrelationData {
  spy: number              // Correlation to SPY
  qqq: number              // Correlation to QQQ
  bonds: number            // Correlation to bonds (AGG/BND)
  gold: number             // Correlation to gold (GLD)
}

export interface PortfolioAnalytics {
  symbol: string
  name: string
  assetClass: string
  risk: RiskMetrics
  performance: PerformanceMetrics
  correlation: CorrelationData
  timestamp: number
}

/**
 * Check if we're within API rate limits
 */
function checkRateLimit(): boolean {
  const now = Date.now()

  // Reset counter if month has passed
  if (now - callCountResetTime > MONTH_MS) {
    callCount = 0
    callCountResetTime = now
  }

  if (callCount >= CALLS_PER_MONTH) {
    console.warn('[FastTrack] Monthly API limit reached (2,000 calls)')
    return false
  }

  return true
}

/**
 * Record an API call for rate limiting
 */
function recordCall(): void {
  callCount++
  console.log(`[FastTrack] API calls this month: ${callCount}/${CALLS_PER_MONTH}`)
}

/**
 * Test API connection with provided key
 */
export async function testFastTrackConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${FASTTRACK_BASE_URL}/account/status`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      const data = await response.json()
      return {
        success: true,
        message: `Connected. Credits remaining: ${data.creditsRemaining ?? 'Unknown'}`
      }
    } else if (response.status === 401) {
      return { success: false, message: 'Invalid API key' }
    } else {
      return { success: false, message: `API error: ${response.status}` }
    }
  } catch (error) {
    return { success: false, message: 'Connection failed - check network' }
  }
}

/**
 * Fetch portfolio analytics for a symbol
 */
export async function fetchPortfolioAnalytics(
  symbol: string,
  apiKey: string
): Promise<PortfolioAnalytics | null> {
  // Check cache
  const cacheKey = symbol.toUpperCase()
  const cached = analyticsCache.get(cacheKey)
  const now = Date.now()

  if (cached && (now - cached.timestamp) < ANALYTICS_CACHE_DURATION_MS) {
    console.log(`[FastTrack] Serving ${symbol} analytics from cache`)
    return cached.data
  }

  // Check rate limit
  if (!checkRateLimit()) {
    // Return cached data if available, even if stale
    if (cached) {
      console.log(`[FastTrack] Rate limited, returning stale cache for ${symbol}`)
      return cached.data
    }
    return null
  }

  try {
    const response = await fetch(`${FASTTRACK_BASE_URL}/securities/${symbol}/analytics`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    recordCall()

    if (!response.ok) {
      console.warn(`[FastTrack] Failed to fetch ${symbol}: ${response.status}`)
      return null
    }

    const data = await response.json()

    const analytics: PortfolioAnalytics = {
      symbol: symbol.toUpperCase(),
      name: data.name || symbol,
      assetClass: data.assetClass || 'Equity',
      risk: {
        sharpeRatio: data.sharpeRatio ?? 0,
        sortinoRatio: data.sortinoRatio ?? 0,
        alpha: data.alpha ?? 0,
        beta: data.beta ?? 1,
        standardDeviation: data.stdDev ?? 0,
        maxDrawdown: data.maxDrawdown ?? 0,
        calmarRatio: data.calmarRatio ?? 0
      },
      performance: {
        returnYTD: data.returnYTD ?? 0,
        return1Y: data.return1Y ?? 0,
        return3Y: data.return3Y ?? 0,
        return5Y: data.return5Y ?? 0,
        return10Y: data.return10Y ?? 0,
        returnSinceInception: data.returnSinceInception ?? 0,
        cagr: data.cagr ?? 0
      },
      correlation: {
        spy: data.correlationSPY ?? 0,
        qqq: data.correlationQQQ ?? 0,
        bonds: data.correlationBonds ?? 0,
        gold: data.correlationGold ?? 0
      },
      timestamp: now
    }

    // Update cache
    analyticsCache.set(cacheKey, { data: analytics, timestamp: now })

    console.log(`[FastTrack] Fetched analytics for ${symbol}`)
    return analytics

  } catch (error) {
    console.error(`[FastTrack] Error fetching ${symbol}:`, error)
    return null
  }
}

/**
 * Fetch historical price data from FastTrack
 */
export async function fetchFastTrackHistorical(
  symbol: string,
  timeframe: string,
  apiKey: string
): Promise<CandleData[]> {
  if (!checkRateLimit()) {
    return []
  }

  try {
    // Calculate date range based on timeframe
    const { from, to, interval } = calculateDateRange(timeframe)

    const response = await fetch(
      `${FASTTRACK_BASE_URL}/securities/${symbol}/history?from=${from}&to=${to}&interval=${interval}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    recordCall()

    if (!response.ok) {
      console.warn(`[FastTrack] Historical data failed for ${symbol}: ${response.status}`)
      return []
    }

    const data = await response.json()

    if (!data.prices || !Array.isArray(data.prices)) {
      return []
    }

    const candles: CandleData[] = data.prices.map((bar: any) => ({
      time: Math.floor(new Date(bar.date).getTime() / 1000),
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume || 0
    }))

    console.log(`[FastTrack] Fetched ${candles.length} candles for ${symbol}`)
    return candles

  } catch (error) {
    console.error(`[FastTrack] Historical error for ${symbol}:`, error)
    return []
  }
}

/**
 * Calculate date range for historical data request
 */
function calculateDateRange(timeframe: string): {
  from: string
  to: string
  interval: 'daily' | 'weekly' | 'monthly'
} {
  const today = new Date()
  const to = today.toISOString().split('T')[0]

  let daysBack = 90
  let interval: 'daily' | 'weekly' | 'monthly' = 'daily'

  switch (timeframe) {
    case '1min':
    case '5min':
    case '15min':
    case '30min':
    case '45min':
    case '60min':
      // FastTrack focuses on daily+ data, use daily for intraday requests
      daysBack = 30
      interval = 'daily'
      break
    case '120min':
    case '240min':
    case '300min':
      daysBack = 60
      interval = 'daily'
      break
    case 'daily':
      daysBack = 365
      interval = 'daily'
      break
    case 'weekly':
      daysBack = 365 * 3
      interval = 'weekly'
      break
    default:
      daysBack = 90
      interval = 'daily'
  }

  const fromDate = new Date(today)
  fromDate.setDate(fromDate.getDate() - daysBack)
  const from = fromDate.toISOString().split('T')[0]

  return { from, to, interval }
}

/**
 * Get risk level description based on metrics
 */
export function getRiskLevel(analytics: PortfolioAnalytics): {
  level: 'low' | 'moderate' | 'high' | 'extreme'
  description: string
} {
  const { beta, standardDeviation, maxDrawdown } = analytics.risk

  if (beta < 0.5 && standardDeviation < 10 && maxDrawdown > -10) {
    return { level: 'low', description: 'Low volatility, defensive positioning' }
  } else if (beta < 1.0 && standardDeviation < 20 && maxDrawdown > -25) {
    return { level: 'moderate', description: 'Moderate risk, balanced exposure' }
  } else if (beta < 1.5 && standardDeviation < 30) {
    return { level: 'high', description: 'High volatility, aggressive positioning' }
  } else {
    return { level: 'extreme', description: 'Extreme risk, highly volatile' }
  }
}

/**
 * Format analytics for AI context
 */
export function formatAnalyticsForPrompt(analytics: PortfolioAnalytics): string {
  const riskLevel = getRiskLevel(analytics)

  return `**${analytics.symbol} ANALYTICS (via FastTrack):**
- Asset Class: ${analytics.assetClass}
- Risk Level: ${riskLevel.level.toUpperCase()} (${riskLevel.description})
- Sharpe Ratio: ${analytics.risk.sharpeRatio.toFixed(2)} (risk-adjusted return)
- Beta: ${analytics.risk.beta.toFixed(2)} (market sensitivity)
- Max Drawdown: ${analytics.risk.maxDrawdown.toFixed(1)}%
- YTD Return: ${analytics.performance.returnYTD.toFixed(1)}%
- 1Y Return: ${analytics.performance.return1Y.toFixed(1)}%
- SPY Correlation: ${analytics.correlation.spy.toFixed(2)}`
}

/**
 * Clear FastTrack cache
 */
export function clearFastTrackCache(): void {
  analyticsCache.clear()
  console.log('[FastTrack] Cache cleared')
}

/**
 * Get current API usage stats
 */
export function getApiUsageStats(): {
  callsUsed: number
  callsRemaining: number
  resetDate: Date
} {
  return {
    callsUsed: callCount,
    callsRemaining: Math.max(0, CALLS_PER_MONTH - callCount),
    resetDate: new Date(callCountResetTime + MONTH_MS)
  }
}
