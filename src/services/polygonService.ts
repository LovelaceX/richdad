/**
 * Polygon.io (Massive) Market Data Service
 *
 * Provides market quotes and historical data via Polygon.io API.
 * Free tier: 5 requests/minute, 15-min delayed data
 *
 * API Docs: https://polygon.io/docs/stocks
 */

import type { Quote, CandleData } from '../renderer/types'

const POLYGON_BASE_URL = 'https://api.polygon.io'
const RATE_LIMIT_DELAY_MS = 12000 // 5 calls/min = 12s between calls

let lastCallTime = 0

// Cache for quotes
let cachedQuotes: Quote[] = []
let quoteCacheTimestamp = 0
const QUOTE_CACHE_DURATION_MS = 60000 // 1 minute (data is 15-min delayed anyway)

// Cache for historical data
const historicalCache: Map<string, { data: CandleData[], timestamp: number }> = new Map()
const HISTORICAL_CACHE_DURATION_MS = 300000 // 5 minutes

/**
 * Rate limit helper - ensures we don't exceed 5 calls/minute
 */
async function respectRateLimit(): Promise<void> {
  const now = Date.now()
  const timeSinceLastCall = now - lastCallTime
  if (timeSinceLastCall < RATE_LIMIT_DELAY_MS) {
    await new Promise(resolve =>
      setTimeout(resolve, RATE_LIMIT_DELAY_MS - timeSinceLastCall)
    )
  }
  lastCallTime = Date.now()
}

/**
 * Fetch quotes for multiple symbols from Polygon
 * Uses the Previous Close endpoint for each symbol
 */
export async function fetchPolygonQuotes(symbols: string[], apiKey: string): Promise<Quote[]> {
  // Check cache first
  const now = Date.now()
  if (cachedQuotes.length > 0 && (now - quoteCacheTimestamp) < QUOTE_CACHE_DURATION_MS) {
    console.log('[Polygon] Serving quotes from cache')
    return cachedQuotes
  }

  const quotes: Quote[] = []

  for (const symbol of symbols) {
    try {
      await respectRateLimit()

      // Use Previous Day Aggs endpoint for quote data
      const url = `${POLYGON_BASE_URL}/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${apiKey}`
      const response = await fetch(url)

      if (!response.ok) {
        console.warn(`[Polygon] Failed to fetch ${symbol}: ${response.status}`)
        continue
      }

      const data = await response.json()

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0]
        const price = result.c // Close price
        const open = result.o  // Open price
        const high = result.h  // High price
        const low = result.l   // Low price
        const previousClose = result.c // Use close as previous close for prev day data
        const change = price - open
        const changePercent = open > 0 ? ((change / open) * 100) : 0

        quotes.push({
          symbol,
          price,
          change,
          changePercent,
          volume: result.v || 0,
          high,
          low,
          open,
          previousClose,
          timestamp: result.t || Date.now()
        })
      }
    } catch (error) {
      console.error(`[Polygon] Error fetching ${symbol}:`, error)
    }
  }

  // Update cache
  if (quotes.length > 0) {
    cachedQuotes = quotes
    quoteCacheTimestamp = now
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

    if (!response.ok) {
      throw new Error(`Polygon API error: ${response.status}`)
    }

    const data = await response.json()

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
