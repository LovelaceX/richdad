/**
 * Polygon.io (Massive) Market Data Service
 *
 * Provides market quotes and historical data via Polygon.io API.
 * Free tier: 5 requests/minute, 15-min delayed data
 *
 * API Docs: https://polygon.io/docs/stocks
 */

import type { Quote, CandleData } from '../renderer/types'
import { safeJsonParse } from './safeJson'
import { getCurrentPolygonTier, type PolygonTier } from './apiBudgetTracker'

const POLYGON_BASE_URL = 'https://api.polygon.io'

// Rate limit delays by tier (milliseconds between calls)
// Free: 5/min = 12s, Starter: 100/min = 600ms, Developer: 1000/min = 60ms, Advanced: no limit
const RATE_LIMIT_DELAYS: Record<PolygonTier, number> = {
  free: 12000,      // 5 calls/min
  starter: 600,     // 100 calls/min
  developer: 60,    // 1000 calls/min
  advanced: 0       // Unlimited
}

/**
 * Get the rate limit delay based on current tier
 */
function getRateLimitDelay(): number {
  const tier = getCurrentPolygonTier()
  return RATE_LIMIT_DELAYS[tier]
}

let lastCallTime = 0

// Cache for quotes
let cachedQuotes: Quote[] = []
let quoteCacheTimestamp = 0
const QUOTE_CACHE_DURATION_MS = 60000 // 1 minute (data is 15-min delayed anyway)

// Cache for historical data
const historicalCache: Map<string, { data: CandleData[], timestamp: number }> = new Map()
const HISTORICAL_CACHE_DURATION_MS = 300000 // 5 minutes

/**
 * Rate limit helper - ensures we don't exceed tier-specific limits
 * Free: 5/min, Starter: 100/min, Developer: 1000/min, Advanced: unlimited
 */
async function respectRateLimit(): Promise<void> {
  const delayMs = getRateLimitDelay()

  // No delay for advanced tier
  if (delayMs === 0) {
    lastCallTime = Date.now()
    return
  }

  const now = Date.now()
  const timeSinceLastCall = now - lastCallTime
  if (timeSinceLastCall < delayMs) {
    await new Promise(resolve =>
      setTimeout(resolve, delayMs - timeSinceLastCall)
    )
  }
  lastCallTime = Date.now()
}

/**
 * Fetch quotes for multiple symbols from Polygon using BATCH snapshot endpoint
 * Uses /v2/snapshot/locale/us/markets/stocks/tickers to get ALL symbols in 1 API call
 * This is critical for staying under the 5 calls/minute free tier limit!
 */
export async function fetchPolygonQuotes(symbols: string[], apiKey: string): Promise<Quote[]> {
  // Check cache first
  const now = Date.now()
  if (cachedQuotes.length > 0 && (now - quoteCacheTimestamp) < QUOTE_CACHE_DURATION_MS) {
    console.log('[Polygon] Serving quotes from cache')
    // Filter cached quotes to requested symbols
    const filtered = cachedQuotes.filter(q => symbols.includes(q.symbol))
    if (filtered.length > 0) {
      return filtered
    }
  }

  if (symbols.length === 0) {
    return []
  }

  await respectRateLimit()

  // Use BATCH snapshot endpoint - gets ALL tickers in ONE call!
  // Format: /v2/snapshot/locale/us/markets/stocks/tickers?tickers=AAPL,MSFT,GOOGL
  const tickerList = symbols.join(',')
  const url = `${POLYGON_BASE_URL}/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${tickerList}&apiKey=${apiKey}`

  console.log(`[Polygon] Batch fetch for ${symbols.length} symbols (1 API call)`)

  try {
    const response = await fetch(url)

    // Handle rate limit specifically before parsing
    if (response.status === 429) {
      console.warn('[Polygon] Rate limit hit (429), returning cached data')
      return cachedQuotes.filter(q => symbols.includes(q.symbol))
    }

    const result = await safeJsonParse<{
      status: string
      tickers?: Array<{
        ticker: string
        day?: { c?: number; o?: number; h?: number; l?: number; v?: number }
        prevDay?: { c?: number; o?: number }
      }>
    }>(response, 'Polygon')

    if (!result.success) {
      console.error('[Polygon] API error:', result.error)
      // Return cached data on error
      return cachedQuotes.filter(q => symbols.includes(q.symbol))
    }

    const data = result.data
    if (data.status !== 'OK' || !data.tickers || data.tickers.length === 0) {
      console.warn('[Polygon] No snapshot data returned, trying fallback')
      // Fallback to previous close for individual symbols (only if batch fails)
      return await fetchPolygonQuotesFallback(symbols, apiKey)
    }

    // Type for Polygon ticker response
    interface PolygonTicker {
      ticker: string
      day?: { o?: number; h?: number; l?: number; c?: number; v?: number }
      prevDay?: { c?: number; o?: number; h?: number; l?: number; v?: number }
      updated?: number
    }

    const quotes: Quote[] = (data.tickers as PolygonTicker[])
      .map((ticker) => {
        const day = ticker.day || {}
        const prevDay = ticker.prevDay || {}
        const price = day.c || prevDay.c || 0
        const open = day.o || prevDay.o || price
        const previousClose = prevDay.c || price
        const change = price - previousClose
        // Guard against division by zero
        const changePercent = previousClose > 0 ? ((change / previousClose) * 100) : 0

        return {
          symbol: ticker.ticker,
          price,
          change,
          changePercent,
          volume: day.v || prevDay.v || 0,
          high: day.h || prevDay.h || price,
          low: day.l || prevDay.l || price,
          open,
          previousClose,
          timestamp: ticker.updated || Date.now()
        }
      })
      // Filter out quotes with invalid symbols or zero prices
      .filter(q => q.symbol && q.price > 0)

    // Update cache
    if (quotes.length > 0) {
      // Merge with existing cache (keep quotes for symbols not in this request)
      const otherQuotes = cachedQuotes.filter(q => !symbols.includes(q.symbol))
      cachedQuotes = [...otherQuotes, ...quotes]
      quoteCacheTimestamp = now
    }

    console.log(`[Polygon] Batch fetch successful: ${quotes.length} quotes`)
    return quotes

  } catch (error) {
    console.error('[Polygon] Batch fetch error:', error)
    // Return cached data on error
    return cachedQuotes.filter(q => symbols.includes(q.symbol))
  }
}

/**
 * Fallback: Fetch quotes one-by-one using Previous Close endpoint
 * Only used if the batch snapshot endpoint fails (e.g., on Basic plan)
 */
async function fetchPolygonQuotesFallback(symbols: string[], apiKey: string): Promise<Quote[]> {
  console.warn('[Polygon] Using fallback (individual calls) - this uses more API quota!')
  const quotes: Quote[] = []

  // Limit to first 5 symbols to stay under rate limit
  const limitedSymbols = symbols.slice(0, 5)

  for (const symbol of limitedSymbols) {
    try {
      await respectRateLimit()

      const url = `${POLYGON_BASE_URL}/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${apiKey}`
      const response = await fetch(url)

      const parseResult = await safeJsonParse<{
        status: string
        results?: Array<{ c: number; o: number; h: number; l: number; v: number; t?: number }>
      }>(response, 'Polygon')

      if (!parseResult.success) {
        console.warn(`[Polygon] Fallback parse error for ${symbol}:`, parseResult.error)
        continue
      }

      const data = parseResult.data
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0]
        const price = result.c
        const open = result.o
        const change = price - open
        const changePercent = open > 0 ? ((change / open) * 100) : 0

        quotes.push({
          symbol,
          price,
          change,
          changePercent,
          volume: result.v || 0,
          high: result.h,
          low: result.l,
          open,
          previousClose: result.c,
          timestamp: result.t || Date.now()
        })
      }
    } catch (error) {
      console.error(`[Polygon] Fallback error for ${symbol}:`, error)
    }
  }

  return quotes
}

/**
 * Fetch historical candle data from Polygon
 *
 * @param symbol - Stock ticker
 * @param timeframe - RichDad timeframe format
 * @param apiKey - Polygon API key
 */
export async function fetchPolygonHistorical(
  symbol: string,
  timeframe: string,
  apiKey: string
): Promise<CandleData[]> {
  // Check cache
  const cacheKey = `${symbol}-${timeframe}`
  const cached = historicalCache.get(cacheKey)
  const now = Date.now()

  if (cached && (now - cached.timestamp) < HISTORICAL_CACHE_DURATION_MS) {
    console.log(`[Polygon] Serving ${cacheKey} from cache`)
    return cached.data
  }

  await respectRateLimit()

  // Convert RichDad timeframe to Polygon format
  const { multiplier, timespan, from, to } = convertTimeframe(timeframe)

  const url = `${POLYGON_BASE_URL}/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${from}/${to}?adjusted=true&sort=asc&limit=500&apiKey=${apiKey}`

  try {
    const response = await fetch(url)

    const result = await safeJsonParse<{
      status: string
      results?: Array<{ t: number; o: number; h: number; l: number; c: number; v: number }>
    }>(response, 'Polygon')

    if (!result.success) {
      throw new Error(result.error)
    }

    const data = result.data

    if (data.status !== 'OK' || !data.results) {
      console.warn('[Polygon] No historical data returned')
      return []
    }

    const candles: CandleData[] = data.results.map((bar: any) => ({
      time: Math.floor(bar.t / 1000), // Convert ms to seconds for Lightweight Charts
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v
    }))

    // Update cache
    historicalCache.set(cacheKey, { data: candles, timestamp: now })

    console.log(`[Polygon] Fetched ${candles.length} candles for ${symbol} (${timeframe})`)
    return candles

  } catch (error) {
    console.error('[Polygon] Historical data error:', error)
    return []
  }
}

/**
 * Convert RichDad timeframe to Polygon API format
 */
function convertTimeframe(timeframe: string): {
  multiplier: number
  timespan: 'minute' | 'hour' | 'day' | 'week'
  from: string
  to: string
} {
  const today = new Date()
  const to = today.toISOString().split('T')[0]

  // Calculate 'from' date based on timeframe
  let daysBack = 30 // Default
  let multiplier = 1
  let timespan: 'minute' | 'hour' | 'day' | 'week' = 'day'

  switch (timeframe) {
    case '1min':
      multiplier = 1
      timespan = 'minute'
      daysBack = 1 // Intraday = today only
      break
    case '5min':
      multiplier = 5
      timespan = 'minute'
      daysBack = 1
      break
    case '15min':
      multiplier = 15
      timespan = 'minute'
      daysBack = 1
      break
    case '30min':
      multiplier = 30
      timespan = 'minute'
      daysBack = 1
      break
    case '45min':
      multiplier = 45
      timespan = 'minute'
      daysBack = 1
      break
    case '60min':
      multiplier = 1
      timespan = 'hour'
      daysBack = 5
      break
    case '120min':
      multiplier = 2
      timespan = 'hour'
      daysBack = 10
      break
    case '240min':
      multiplier = 4
      timespan = 'hour'
      daysBack = 20
      break
    case '300min':
      multiplier = 5
      timespan = 'hour'
      daysBack = 20
      break
    case 'daily':
      multiplier = 1
      timespan = 'day'
      daysBack = 90
      break
    case 'weekly':
      multiplier = 1
      timespan = 'week'
      daysBack = 365
      break
    default:
      multiplier = 1
      timespan = 'day'
      daysBack = 90
  }

  const fromDate = new Date(today)
  fromDate.setDate(fromDate.getDate() - daysBack)
  const from = fromDate.toISOString().split('T')[0]

  return { multiplier, timespan, from, to }
}

/**
 * Clear all caches (useful when switching providers)
 */
export function clearPolygonCache(): void {
  cachedQuotes = []
  quoteCacheTimestamp = 0
  historicalCache.clear()
  console.log('[Polygon] Cache cleared')
}

/**
 * Fetch historical candle data for a specific date range
 * Used for backtesting to get extended historical data
 *
 * @param symbol - Stock ticker
 * @param startDate - Start date (Unix timestamp in ms)
 * @param endDate - End date (Unix timestamp in ms)
 * @param timeframe - RichDad timeframe format
 * @param apiKey - Polygon API key
 */
export async function fetchPolygonHistoricalRange(
  symbol: string,
  startDate: number,
  endDate: number,
  timeframe: string,
  apiKey: string
): Promise<CandleData[]> {
  // Convert timestamps to YYYY-MM-DD
  const from = new Date(startDate).toISOString().split('T')[0]
  const to = new Date(endDate).toISOString().split('T')[0]

  // Convert timeframe to Polygon format
  let multiplier = 1
  let timespan: 'minute' | 'hour' | 'day' | 'week' = 'day'

  switch (timeframe) {
    case '1min':
      multiplier = 1
      timespan = 'minute'
      break
    case '5min':
      multiplier = 5
      timespan = 'minute'
      break
    case '15min':
    case '15m':
      multiplier = 15
      timespan = 'minute'
      break
    case '30min':
      multiplier = 30
      timespan = 'minute'
      break
    case '1h':
    case '60min':
      multiplier = 1
      timespan = 'hour'
      break
    case '4h':
    case '240min':
      multiplier = 4
      timespan = 'hour'
      break
    case '1d':
    case 'daily':
      multiplier = 1
      timespan = 'day'
      break
    case 'weekly':
      multiplier = 1
      timespan = 'week'
      break
    default:
      multiplier = 1
      timespan = 'day'
  }

  const allCandles: CandleData[] = []
  let currentFrom = from
  const finalTo = to
  const MAX_RESULTS = 50000 // Polygon max per request

  console.log(`[Polygon] Fetching historical range for ${symbol}: ${from} to ${to} (${timeframe})`)

  // Polygon limits results, may need multiple requests for large date ranges
  while (currentFrom <= finalTo) {
    await respectRateLimit()

    const url = `${POLYGON_BASE_URL}/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${currentFrom}/${finalTo}?adjusted=true&sort=asc&limit=${MAX_RESULTS}&apiKey=${apiKey}`

    try {
      const response = await fetch(url)

      const result = await safeJsonParse<{
        status: string
        results?: Array<{ t: number; o: number; h: number; l: number; c: number; v: number }>
      }>(response, 'Polygon')

      if (!result.success) {
        console.error('[Polygon] Pagination error:', result.error)
        break
      }

      const data = result.data
      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        console.log(`[Polygon] No more results from ${currentFrom}`)
        break
      }

      const candles: CandleData[] = data.results.map((bar) => ({
        time: Math.floor(bar.t / 1000), // Convert ms to seconds
        open: bar.o,
        high: bar.h,
        low: bar.l,
        close: bar.c,
        volume: bar.v
      }))

      allCandles.push(...candles)

      // If we got the max results, there might be more data
      if (data.results.length >= MAX_RESULTS) {
        // Move start date to after the last result
        const lastTimestamp = data.results[data.results.length - 1].t
        currentFrom = new Date(lastTimestamp + 86400000).toISOString().split('T')[0] // Next day
        console.log(`[Polygon] Pagination: fetched ${candles.length}, continuing from ${currentFrom}`)
      } else {
        break
      }
    } catch (error) {
      console.error('[Polygon] Historical range error:', error)
      break
    }
  }

  console.log(`[Polygon] Total candles fetched for range: ${allCandles.length}`)
  return allCandles
}
