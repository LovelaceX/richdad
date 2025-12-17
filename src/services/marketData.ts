import { getSettings } from '../renderer/lib/db'
import { generateQuote } from '../renderer/lib/mockData'
import type { Quote } from '../renderer/types'
import { canUseAlphaVantageForMarket, canUseAlphaVantageForCharts, recordMarketCall, recordChartCall, getBudgetStatus } from './apiBudgetTracker'

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query'
const CACHE_DURATION_MS = 3600000 // 1 hour (3600 seconds)
const RATE_LIMIT_DELAY_MS = 12000 // 5 calls/min = 12s between calls

let lastCallTime = 0
let cachedQuotes: Quote[] = []
let cacheTimestamp = 0

// Historical data cache (for candlestick charts)
let cachedHistoricalData: Map<string, any[]> = new Map()
let historicalCacheTimestamps: Map<string, number> = new Map()
const HISTORICAL_CACHE_DURATION_MS = 86400000 // 24 hours

/**
 * Fetch live prices from Alpha Vantage (batch endpoint)
 * Uses 1-hour client-side cache to avoid exceeding daily API limit
 * (1 call every ~60 min = ~24 calls/day, within 25/day free tier limit)
 * Falls back to mock data on error
 */
export async function fetchLivePrices(symbols: string[]): Promise<Quote[]> {
  const settings = await getSettings()
  const apiKey = settings.alphaVantageApiKey

  // Fallback to mock if no API key
  if (!apiKey) {
    console.warn('No Alpha Vantage API key configured, using mock data')
    return symbols.map(symbol => generateQuote(symbol))
  }

  // Check cache first (1-hour cache)
  const now = Date.now()
  const cacheAge = now - cacheTimestamp

  if (cachedQuotes.length > 0 && cacheAge < CACHE_DURATION_MS) {
    console.log(`[Market Data] Serving from cache (age: ${Math.round(cacheAge / 60000)}m ${Math.round((cacheAge % 60000) / 1000)}s)`)
    return cachedQuotes
  }

  // Check API budget before making call
  if (!canUseAlphaVantageForMarket()) {
    console.warn('[Market Data] Budget exhausted, serving from stale cache or mock')
    if (cachedQuotes.length > 0) {
      return cachedQuotes
    }
    return symbols.map(symbol => generateQuote(symbol))
  }

  try {
    // Respect rate limit (5 calls/min)
    const timeSinceLastCall = now - lastCallTime
    if (timeSinceLastCall < RATE_LIMIT_DELAY_MS) {
      await new Promise(resolve =>
        setTimeout(resolve, RATE_LIMIT_DELAY_MS - timeSinceLastCall)
      )
    }
    lastCallTime = Date.now()

    // Batch quote endpoint (up to 100 symbols)
    const symbolsParam = symbols.join(',')
    const url = `${ALPHA_VANTAGE_BASE_URL}?function=BATCH_STOCK_QUOTES&symbols=${symbolsParam}&apikey=${apiKey}`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`)
    }

    const data = await response.json()

    // Check for API error messages
    if (data['Error Message']) {
      throw new Error(data['Error Message'])
    }

    // Check for rate limit message
    if (data['Note']) {
      console.warn('Alpha Vantage rate limit hit:', data['Note'])
      throw new Error('Rate limit exceeded')
    }

    // Parse batch quotes
    const quotes: Quote[] = data['Stock Quotes']?.map((item: any) => ({
      symbol: item['1. symbol'],
      price: parseFloat(item['2. price']),
      change: parseFloat(item['3. change'] || '0'),
      changePercent: parseFloat(item['4. change percent']?.replace('%', '') || '0'),
      volume: parseInt(item['5. volume'] || '0', 10),
      timestamp: Date.now()
    })) || []

    // Update cache
    cachedQuotes = quotes
    cacheTimestamp = Date.now()
    console.log('[Market Data] Cache updated, fresh data fetched')

    // Record API call in budget tracker
    recordMarketCall()

    return quotes

  } catch (error) {
    console.error('Failed to fetch live prices, falling back to mock:', error)
    // If we have stale cache, return it instead of mock
    if (cachedQuotes.length > 0) {
      console.warn('[Market Data] Using stale cache due to API error')
      return cachedQuotes
    }
    return symbols.map(symbol => generateQuote(symbol))
  }
}

/**
 * Get cache metadata for UI display
 */
export function getCacheStatus(): {
  age: number
  isFresh: boolean
  budgetRemaining: number
} {
  const age = Date.now() - cacheTimestamp
  const isFresh = age < CACHE_DURATION_MS
  const budget = getBudgetStatus()

  return {
    age,
    isFresh,
    budgetRemaining: budget.marketCallsRemaining
  }
}

/**
 * Fetch historical OHLCV data for charts
 */
export async function fetchHistoricalData(
  symbol: string,
  interval: 'daily' | '1min' | '5min' | '15min' | '30min' | '60min' = 'daily'
): Promise<any[]> {

  // Check 24h cache first (cache key includes interval)
  const cacheKey = `${symbol}-${interval}`
  const cached = cachedHistoricalData.get(cacheKey)
  const cacheTime = historicalCacheTimestamps.get(cacheKey) || 0
  const cacheAge = Date.now() - cacheTime

  if (cached && cacheAge < HISTORICAL_CACHE_DURATION_MS) {
    console.log(`[Market Data] Serving ${symbol} (${interval}) chart from cache (age: ${Math.round(cacheAge / 3600000)}h)`)
    return cached
  }

  // Check API budget before making call
  if (!canUseAlphaVantageForCharts()) {
    console.warn('[Market Data] Chart budget exhausted, serving from stale cache or mock')

    if (cached) {
      console.log('[Market Data] Returning stale cached data (budget exhausted)')
      return cached
    }

    // No cache - fall back to mock
    const { generateCandleData } = await import('../renderer/lib/mockData')
    return generateCandleData(symbol, 100)
  }

  const settings = await getSettings()
  const apiKey = settings.alphaVantageApiKey

  if (!apiKey) {
    console.warn('[Market Data] No API key configured, falling back to mock data')
    const { generateCandleData } = await import('../renderer/lib/mockData')
    return generateCandleData(symbol, 100)
  }

  try {
    const functionName = interval === 'daily'
      ? 'TIME_SERIES_DAILY'
      : 'TIME_SERIES_INTRADAY'

    console.log(`[Market Data] Fetching historical data for ${symbol} (${interval})`)

    const params = new URLSearchParams({
      function: functionName,
      symbol,
      apikey: apiKey,
      ...(interval !== 'daily' ? { interval } : {})
    })

    const response = await fetch(`${ALPHA_VANTAGE_BASE_URL}?${params}`)
    const data = await response.json()

    // Parse time series data
    const timeSeriesKey = Object.keys(data).find(key => key.includes('Time Series'))
    if (!timeSeriesKey) throw new Error('No time series data in response')

    const timeSeries = data[timeSeriesKey]

    // Transform to CandleData format
    const candles = Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
      time: new Date(date).getTime() / 1000, // lightweight-charts expects seconds
      open: parseFloat(values['1. open']),
      high: parseFloat(values['2. high']),
      low: parseFloat(values['3. low']),
      close: parseFloat(values['4. close']),
      volume: parseInt(values['5. volume'], 10)
    }))

    // Sort oldest to newest (required by lightweight-charts)
    candles.sort((a, b) => a.time - b.time)

    // Slice based on interval type
    let filtered: any[]

    if (interval !== 'daily') {
      // For intraday intervals (1min, 5min, 15min, 30min, 60min):
      // Show all available candles (compact = ~8 hours for most intervals)
      // No slicing needed - already limited by API compact output
      filtered = candles
      console.log(`[Market Data] Returning ${filtered.length} intraday candles (${interval} interval)`)
    } else {
      // For daily: Slice to last 90 days (user preference from previous plan)
      const ninetyDaysAgo = Date.now() / 1000 - (90 * 24 * 60 * 60)
      filtered = candles.filter(c => c.time >= ninetyDaysAgo)
      console.log(`[Market Data] Filtered to ${filtered.length} daily candles (last 90 days)`)
    }

    // Cache the result for 24 hours
    cachedHistoricalData.set(cacheKey, filtered)
    historicalCacheTimestamps.set(cacheKey, Date.now())
    console.log(`[Market Data] Cached ${filtered.length} candles for ${symbol} (${interval})`)

    // Record API call in budget tracker
    recordChartCall()

    return filtered

  } catch (error) {
    console.error(`[Market Data] Historical data fetch failed for ${symbol}:`, error)
    console.log('[Market Data] Falling back to mock data')

    // Fallback to mock data
    const { generateCandleData } = await import('../renderer/lib/mockData')
    return generateCandleData(symbol, 100)
  }
}
