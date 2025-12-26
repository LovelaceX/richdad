/**
 * Tiingo Market Data Service
 *
 * Provides market quotes and historical data via Tiingo API.
 * Uses IEX exchange data for real-time quotes (no license fees).
 *
 * Free tier (Starter): 50 unique tickers/hour, 500 lookups/month
 * Power tier ($10/mo): 5,000 unique tickers/hour
 *
 * API Docs: https://api.tiingo.com/documentation
 */

import { fetch } from '@tauri-apps/plugin-http'
import type { Quote, CandleData } from '../renderer/types'
import { safeJsonParse } from './safeJson'

const TIINGO_BASE_URL = 'https://api.tiingo.com'

// Cache for quotes
let cachedQuotes: Quote[] = []
let quoteCacheTimestamp = 0
const QUOTE_CACHE_DURATION_MS = 60000 // 1 minute

// Cache for historical data
const historicalCache: Map<string, { data: CandleData[], timestamp: number }> = new Map()
const HISTORICAL_CACHE_DURATION_MS = 300000 // 5 minutes

/**
 * Build headers for Tiingo API requests
 * Tiingo uses Token-based authentication in the header
 */
function buildHeaders(apiKey: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Token ${apiKey}`
  }
}

/**
 * Test Tiingo API connection
 */
export async function testTiingoConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
  try {
    // Use the meta endpoint to test - doesn't count against quote limits
    const url = `${TIINGO_BASE_URL}/tiingo/daily/AAPL`
    const response = await fetch(url, { headers: buildHeaders(apiKey) })

    const result = await safeJsonParse<{
      ticker?: string
      name?: string
      error?: string
      detail?: string
    }>(response, 'Tiingo')

    if (!result.success) {
      return {
        success: false,
        message: result.error
      }
    }

    const data = result.data

    // Check for Tiingo-specific error responses
    if (data.detail) {
      return {
        success: false,
        message: data.detail
      }
    }

    if (data.ticker && data.name) {
      return {
        success: true,
        message: `Connected! Verified with ${data.name} (${data.ticker})`
      }
    }

    return {
      success: false,
      message: 'Unexpected response from Tiingo'
    }
  } catch (error) {
    console.error('[Tiingo] Connection test failed:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed'
    }
  }
}

/**
 * Fetch real-time quotes for multiple symbols using Tiingo IEX endpoint
 * IEX provides real-time data without exchange license fees
 */
export async function fetchTiingoQuotes(symbols: string[], apiKey: string): Promise<Quote[]> {
  // Check cache first
  const now = Date.now()
  if (cachedQuotes.length > 0 && (now - quoteCacheTimestamp) < QUOTE_CACHE_DURATION_MS) {
    console.log('[Tiingo] Serving quotes from cache')
    const filtered = cachedQuotes.filter(q => symbols.includes(q.symbol))
    if (filtered.length > 0) {
      return filtered
    }
  }

  if (symbols.length === 0) {
    return []
  }

  // Tiingo IEX endpoint supports comma-separated tickers
  const tickerList = symbols.join(',')
  const url = `${TIINGO_BASE_URL}/iex/?tickers=${tickerList}`

  console.log(`[Tiingo] Fetching quotes for ${symbols.length} symbols`)

  try {
    const response = await fetch(url, { headers: buildHeaders(apiKey) })

    // Handle rate limit
    if (response.status === 429) {
      console.warn('[Tiingo] Rate limit hit (429), returning cached data')
      return cachedQuotes.filter(q => symbols.includes(q.symbol))
    }

    const result = await safeJsonParse<Array<{
      ticker: string
      tngoLast: number | null
      last: number | null
      prevClose: number | null
      open: number | null
      high: number | null
      low: number | null
      volume: number | null
      timestamp: string
    }>>(response, 'Tiingo')

    if (!result.success) {
      console.error('[Tiingo] API error:', result.error)
      return cachedQuotes.filter(q => symbols.includes(q.symbol))
    }

    const data = result.data
    if (!Array.isArray(data) || data.length === 0) {
      console.warn('[Tiingo] No quote data returned')
      return cachedQuotes.filter(q => symbols.includes(q.symbol))
    }

    const quotes: Quote[] = data
      .map((ticker) => {
        // Tiingo uses tngoLast for their enhanced price, fall back to last
        const price = ticker.tngoLast ?? ticker.last ?? 0
        const previousClose = ticker.prevClose ?? price
        const open = ticker.open ?? previousClose
        const change = price - previousClose
        const changePercent = previousClose > 0 ? ((change / previousClose) * 100) : 0

        return {
          symbol: ticker.ticker,
          price,
          change,
          changePercent,
          volume: ticker.volume ?? 0,
          high: ticker.high ?? price,
          low: ticker.low ?? price,
          open,
          previousClose,
          timestamp: ticker.timestamp ? new Date(ticker.timestamp).getTime() : Date.now()
        }
      })
      .filter(q => q.symbol && q.price > 0)

    // Update cache
    if (quotes.length > 0) {
      const otherQuotes = cachedQuotes.filter(q => !symbols.includes(q.symbol))
      cachedQuotes = [...otherQuotes, ...quotes]
      quoteCacheTimestamp = now
    }

    console.log(`[Tiingo] Fetched ${quotes.length} quotes`)
    return quotes

  } catch (error) {
    console.error('[Tiingo] Quote fetch error:', error)
    return cachedQuotes.filter(q => symbols.includes(q.symbol))
  }
}

/**
 * Fetch historical candle data from Tiingo
 * Uses IEX intraday for minute/hour intervals, EOD for daily/weekly
 *
 * @param symbol - Stock ticker
 * @param timeframe - RichDad timeframe format (1min, 5min, daily, etc.)
 * @param apiKey - Tiingo API key
 */
export async function fetchTiingoHistorical(
  symbol: string,
  timeframe: string,
  apiKey: string
): Promise<CandleData[]> {
  // Check cache
  const cacheKey = `${symbol}-${timeframe}`
  const cached = historicalCache.get(cacheKey)
  const now = Date.now()

  if (cached && (now - cached.timestamp) < HISTORICAL_CACHE_DURATION_MS) {
    console.log(`[Tiingo] Serving ${cacheKey} from cache`)
    return cached.data
  }

  const { endpoint, params } = buildHistoricalParams(timeframe)
  const url = endpoint === 'iex'
    ? `${TIINGO_BASE_URL}/iex/${symbol}/prices?${params}`
    : `${TIINGO_BASE_URL}/tiingo/daily/${symbol}/prices?${params}`

  try {
    const response = await fetch(url, { headers: buildHeaders(apiKey) })

    const result = await safeJsonParse<Array<{
      date: string
      open: number
      high: number
      low: number
      close: number
      volume: number
      // EOD endpoint has adjusted prices
      adjOpen?: number
      adjHigh?: number
      adjLow?: number
      adjClose?: number
      adjVolume?: number
    }>>(response, 'Tiingo')

    if (!result.success) {
      throw new Error(result.error)
    }

    const data = result.data
    if (!Array.isArray(data)) {
      console.warn('[Tiingo] No historical data returned')
      return []
    }

    // Use adjusted prices for EOD data (if available)
    const candles: CandleData[] = data.map((bar) => ({
      time: Math.floor(new Date(bar.date).getTime() / 1000),
      open: bar.adjOpen ?? bar.open,
      high: bar.adjHigh ?? bar.high,
      low: bar.adjLow ?? bar.low,
      close: bar.adjClose ?? bar.close,
      volume: bar.adjVolume ?? bar.volume
    })).filter(c => c.close > 0 && c.time > 0)

    // Update cache
    historicalCache.set(cacheKey, { data: candles, timestamp: now })

    console.log(`[Tiingo] Fetched ${candles.length} candles for ${symbol} (${timeframe})`)
    return candles

  } catch (error) {
    console.error('[Tiingo] Historical data error:', error)
    return []
  }
}

/**
 * Build parameters for historical data request based on timeframe
 */
function buildHistoricalParams(timeframe: string): { endpoint: 'iex' | 'eod', params: string } {
  const today = new Date()
  const toDate = today.toISOString().split('T')[0]

  // Calculate start date based on timeframe
  let daysBack = 30
  let resampleFreq = '5min'
  let endpoint: 'iex' | 'eod' = 'iex'

  switch (timeframe) {
    case '1min':
      resampleFreq = '1min'
      daysBack = 1
      endpoint = 'iex'
      break
    case '5min':
      resampleFreq = '5min'
      daysBack = 5
      endpoint = 'iex'
      break
    case '15min':
      resampleFreq = '15min'
      daysBack = 10
      endpoint = 'iex'
      break
    case '30min':
      resampleFreq = '30min'
      daysBack = 15
      endpoint = 'iex'
      break
    case '45min':
      resampleFreq = '45min'
      daysBack = 20
      endpoint = 'iex'
      break
    case '60min':
      resampleFreq = '1hour'
      daysBack = 30
      endpoint = 'iex'
      break
    case '120min':
      resampleFreq = '2hour'
      daysBack = 60
      endpoint = 'iex'
      break
    case '240min':
      resampleFreq = '4hour'
      daysBack = 90
      endpoint = 'iex'
      break
    case 'daily':
      daysBack = 365
      endpoint = 'eod'
      break
    case 'weekly':
      daysBack = 365 * 2
      endpoint = 'eod'
      break
    default:
      daysBack = 90
      endpoint = 'eod'
  }

  const fromDate = new Date(today)
  fromDate.setDate(fromDate.getDate() - daysBack)
  const startDate = fromDate.toISOString().split('T')[0]

  if (endpoint === 'iex') {
    return {
      endpoint: 'iex',
      params: `startDate=${startDate}&endDate=${toDate}&resampleFreq=${resampleFreq}`
    }
  } else {
    return {
      endpoint: 'eod',
      params: `startDate=${startDate}&endDate=${toDate}`
    }
  }
}

/**
 * Fetch historical candle data for a specific date range
 * Used for backtesting to get extended historical data
 *
 * @param symbol - Stock ticker
 * @param startDate - Start date (Unix timestamp in ms)
 * @param endDate - End date (Unix timestamp in ms)
 * @param timeframe - RichDad timeframe format
 * @param apiKey - Tiingo API key
 */
export async function fetchTiingoHistoricalRange(
  symbol: string,
  startDate: number,
  endDate: number,
  timeframe: string,
  apiKey: string
): Promise<CandleData[]> {
  // Convert timestamps to YYYY-MM-DD
  const from = new Date(startDate).toISOString().split('T')[0]
  const to = new Date(endDate).toISOString().split('T')[0]

  // Determine if we need intraday (IEX) or EOD endpoint
  const isIntraday = ['1min', '5min', '15min', '15m', '30min', '60min', '1h', '120min', '240min', '4h'].includes(timeframe)

  let url: string
  if (isIntraday) {
    // Map timeframe to Tiingo resampleFreq
    const resampleMap: Record<string, string> = {
      '1min': '1min',
      '5min': '5min',
      '15min': '15min',
      '15m': '15min',
      '30min': '30min',
      '60min': '1hour',
      '1h': '1hour',
      '120min': '2hour',
      '240min': '4hour',
      '4h': '4hour'
    }
    const resampleFreq = resampleMap[timeframe] || '5min'
    url = `${TIINGO_BASE_URL}/iex/${symbol}/prices?startDate=${from}&endDate=${to}&resampleFreq=${resampleFreq}`
  } else {
    // EOD endpoint for daily/weekly
    url = `${TIINGO_BASE_URL}/tiingo/daily/${symbol}/prices?startDate=${from}&endDate=${to}`
  }

  console.log(`[Tiingo] Fetching historical range for ${symbol}: ${from} to ${to} (${timeframe})`)

  try {
    const response = await fetch(url, { headers: buildHeaders(apiKey) })

    const result = await safeJsonParse<Array<{
      date: string
      open: number
      high: number
      low: number
      close: number
      volume: number
      adjOpen?: number
      adjHigh?: number
      adjLow?: number
      adjClose?: number
      adjVolume?: number
    }>>(response, 'Tiingo')

    if (!result.success) {
      console.error('[Tiingo] Range fetch error:', result.error)
      return []
    }

    const data = result.data
    if (!Array.isArray(data)) {
      console.warn('[Tiingo] No data returned for range')
      return []
    }

    // Use adjusted prices for EOD data
    const candles: CandleData[] = data.map((bar) => ({
      time: Math.floor(new Date(bar.date).getTime() / 1000),
      open: bar.adjOpen ?? bar.open,
      high: bar.adjHigh ?? bar.high,
      low: bar.adjLow ?? bar.low,
      close: bar.adjClose ?? bar.close,
      volume: bar.adjVolume ?? bar.volume
    })).filter(c => c.close > 0 && c.time > 0)

    console.log(`[Tiingo] Total candles fetched for range: ${candles.length}`)
    return candles

  } catch (error) {
    console.error('[Tiingo] Historical range error:', error)
    return []
  }
}

/**
 * Clear all caches (useful when switching providers or API key)
 */
export function clearTiingoCache(): void {
  cachedQuotes = []
  quoteCacheTimestamp = 0
  historicalCache.clear()
  console.log('[Tiingo] Cache cleared')
}

/**
 * Fetch a single quote for a symbol
 */
export async function fetchTiingoQuote(symbol: string, apiKey: string): Promise<Quote | null> {
  const quotes = await fetchTiingoQuotes([symbol], apiKey)
  return quotes.find(q => q.symbol === symbol) ?? null
}

/**
 * Fetch just the current price for a symbol
 */
export async function fetchTiingoPrice(symbol: string, apiKey: string): Promise<number | null> {
  const quote = await fetchTiingoQuote(symbol, apiKey)
  return quote?.price ?? null
}
