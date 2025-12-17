import { getSettings } from '../renderer/lib/db'
import { generateQuote } from '../renderer/lib/mockData'
import type { Quote } from '../renderer/types'
import { canUseAlphaVantageForMarket, canUseAlphaVantageForCharts, recordMarketCall, recordChartCall, getBudgetStatus } from './apiBudgetTracker'
import { fetchPolygonQuotes, fetchPolygonHistorical } from './polygonService'

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
 * Fetch live prices from configured provider (Polygon or Alpha Vantage)
 * Uses caching to minimize API calls
 * Falls back to mock data on error
 */
export async function fetchLivePrices(symbols: string[]): Promise<Quote[]> {
  const settings = await getSettings()
  const provider = settings.marketDataProvider || 'polygon'

  // Route to Polygon if configured
  if (provider === 'polygon') {
    const polygonKey = settings.polygonApiKey
    if (!polygonKey) {
      console.warn('[Market Data] No Polygon API key configured, using mock data')
      return symbols.map(symbol => generateQuote(symbol))
    }
    try {
      const quotes = await fetchPolygonQuotes(symbols, polygonKey)
      if (quotes.length > 0) return quotes
    } catch (error) {
      console.error('[Market Data] Polygon fetch failed:', error)
    }
    // Fallback to mock if Polygon fails
    return symbols.map(symbol => generateQuote(symbol))
  }

  // Alpha Vantage path
  const apiKey = settings.alphaVantageApiKey

  // Fallback to mock if no API key
  if (!apiKey) {
    console.warn('[Market Data] No Alpha Vantage API key configured, using mock data')
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

// Map custom intervals to base intervals for API calls
const INTERVAL_MAPPING: Record<string, { baseInterval: string; aggregateCount: number }> = {
  '1min': { baseInterval: '1min', aggregateCount: 1 },
  '5min': { baseInterval: '5min', aggregateCount: 1 },
  '15min': { baseInterval: '15min', aggregateCount: 1 },
  '30min': { baseInterval: '30min', aggregateCount: 1 },
  '45min': { baseInterval: '15min', aggregateCount: 3 },  // 3 x 15min = 45min
  '60min': { baseInterval: '60min', aggregateCount: 1 },
  '120min': { baseInterval: '60min', aggregateCount: 2 }, // 2 x 60min = 2H
  '240min': { baseInterval: '60min', aggregateCount: 4 }, // 4 x 60min = 4H
  '300min': { baseInterval: '60min', aggregateCount: 5 }, // 5 x 60min = 5H
  'daily': { baseInterval: 'daily', aggregateCount: 1 },
  'weekly': { baseInterval: 'daily', aggregateCount: 5 }, // 5 trading days = 1 week
}

/**
 * Aggregate candles into larger timeframes
 */
function aggregateCandles(candles: any[], count: number): any[] {
  if (count <= 1) return candles

  const aggregated: any[] = []

  for (let i = 0; i < candles.length; i += count) {
    const group = candles.slice(i, i + count)
    if (group.length === 0) continue

    aggregated.push({
      time: group[0].time, // Use first candle's time
      open: group[0].open,
      high: Math.max(...group.map(c => c.high)),
      low: Math.min(...group.map(c => c.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((sum, c) => sum + c.volume, 0)
    })
  }

  return aggregated
}

/**
 * Fetch historical OHLCV data for charts
 */
export async function fetchHistoricalData(
  symbol: string,
  interval: string = 'daily'
): Promise<any[]> {
  const settings = await getSettings()
  const provider = settings.marketDataProvider || 'polygon'

  // Route to Polygon if configured
  if (provider === 'polygon') {
    const polygonKey = settings.polygonApiKey
    if (!polygonKey) {
      console.warn('[Market Data] No Polygon API key configured, falling back to mock data')
      const { generateCandleData } = await import('../renderer/lib/mockData')
      return generateCandleData(symbol, 100)
    }
    try {
      const candles = await fetchPolygonHistorical(symbol, interval, polygonKey)
      if (candles.length > 0) return candles
    } catch (error) {
      console.error('[Market Data] Polygon historical fetch failed:', error)
    }
    // Fallback to mock if Polygon fails
    const { generateCandleData } = await import('../renderer/lib/mockData')
    return generateCandleData(symbol, 100)
  }

  // Alpha Vantage path below
  // Get base interval and aggregation config
  const mapping = INTERVAL_MAPPING[interval] || { baseInterval: interval, aggregateCount: 1 }
  const { baseInterval, aggregateCount } = mapping

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

  const apiKey = settings.alphaVantageApiKey

  if (!apiKey) {
    console.warn('[Market Data] No API key configured, falling back to mock data')
    const { generateCandleData } = await import('../renderer/lib/mockData')
    return generateCandleData(symbol, 100)
  }

  try {
    const functionName = baseInterval === 'daily'
      ? 'TIME_SERIES_DAILY'
      : 'TIME_SERIES_INTRADAY'

    console.log(`[Market Data] Fetching historical data for ${symbol} (${interval}, base: ${baseInterval})`)

    const params = new URLSearchParams({
      function: functionName,
      symbol,
      apikey: apiKey,
      ...(baseInterval !== 'daily' ? { interval: baseInterval } : {})
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

    if (baseInterval !== 'daily') {
      // For intraday intervals: Show all available candles
      filtered = candles
      console.log(`[Market Data] Fetched ${filtered.length} base candles (${baseInterval} interval)`)
    } else {
      // For daily/weekly: Slice to last 90 days
      const ninetyDaysAgo = Date.now() / 1000 - (90 * 24 * 60 * 60)
      filtered = candles.filter(c => c.time >= ninetyDaysAgo)
      console.log(`[Market Data] Filtered to ${filtered.length} daily candles (last 90 days)`)
    }

    // Aggregate if needed (for 45min, 2H, 4H, 5H, weekly)
    if (aggregateCount > 1) {
      filtered = aggregateCandles(filtered, aggregateCount)
      console.log(`[Market Data] Aggregated to ${filtered.length} candles (${aggregateCount}x aggregation for ${interval})`)
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
