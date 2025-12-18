/**
 * TwelveData API Service
 *
 * Free tier: 800 API calls/day, 8 websocket connections
 * Real-time data, 99+ markets, technical indicators
 *
 * API Docs: https://twelvedata.com/docs
 */

import type { CandleData } from '../renderer/types'

const BASE_URL = 'https://api.twelvedata.com'

// Rate limiting: 800 calls/day = ~33/hour = ~0.5/minute
// But burst of 8 per second allowed
let lastCallTime = 0
const MIN_CALL_INTERVAL = 125 // 8 calls/second max

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now()
  const timeSinceLastCall = now - lastCallTime

  if (timeSinceLastCall < MIN_CALL_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_CALL_INTERVAL - timeSinceLastCall))
  }

  lastCallTime = Date.now()
  return fetch(url)
}

/**
 * Test TwelveData API connection
 */
export async function testTwelveDataConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const url = `${BASE_URL}/time_series?symbol=AAPL&interval=1min&outputsize=1&apikey=${apiKey}`
    const response = await rateLimitedFetch(url)
    const data = await response.json()

    if (data.status === 'error') {
      return {
        success: false,
        message: data.message || 'Invalid API key'
      }
    }

    if (data.values && data.values.length > 0) {
      return {
        success: true,
        message: 'Connection successful! API key is valid.'
      }
    }

    return {
      success: false,
      message: 'Unexpected response from TwelveData'
    }
  } catch (error) {
    console.error('[TwelveData] Connection test failed:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed'
    }
  }
}

/**
 * Fetch quote data for a symbol
 */
export async function fetchTwelveDataQuote(symbol: string, apiKey: string): Promise<{
  price: number
  change: number
  changePercent: number
  volume: number
  high: number
  low: number
  open: number
  previousClose: number
} | null> {
  try {
    const url = `${BASE_URL}/quote?symbol=${symbol}&apikey=${apiKey}`
    const response = await rateLimitedFetch(url)
    const data = await response.json()

    if (data.status === 'error') {
      console.error('[TwelveData] Quote error:', data.message)
      return null
    }

    return {
      price: parseFloat(data.close),
      change: parseFloat(data.change),
      changePercent: parseFloat(data.percent_change),
      volume: parseInt(data.volume) || 0,
      high: parseFloat(data.high),
      low: parseFloat(data.low),
      open: parseFloat(data.open),
      previousClose: parseFloat(data.previous_close)
    }
  } catch (error) {
    console.error('[TwelveData] Failed to fetch quote:', error)
    return null
  }
}

/**
 * Convert TwelveData interval to API format
 */
function convertInterval(interval: string): string {
  const intervalMap: Record<string, string> = {
    '1min': '1min',
    '5min': '5min',
    '15min': '15min',
    '30min': '30min',
    '45min': '45min',
    '60min': '1h',
    '120min': '2h',
    '240min': '4h',
    '300min': '1day', // No 5h in TwelveData, fallback to daily
    'daily': '1day',
    'weekly': '1week'
  }
  return intervalMap[interval] || '1day'
}

/**
 * Get output size based on interval
 */
function getOutputSize(interval: string): number {
  switch (interval) {
    case '1min': return 390  // Full trading day
    case '5min': return 78
    case '15min': return 26
    case '30min': return 13
    case '45min': return 9
    case '60min': return 50
    case '120min': return 30
    case '240min': return 20
    case 'daily': return 90
    case 'weekly': return 52
    default: return 90
  }
}

/**
 * Fetch candlestick data for charting
 */
export async function fetchTwelveDataCandles(
  symbol: string,
  interval: string,
  apiKey: string
): Promise<CandleData[]> {
  try {
    const twelveInterval = convertInterval(interval)
    const outputSize = getOutputSize(interval)

    const url = `${BASE_URL}/time_series?symbol=${symbol}&interval=${twelveInterval}&outputsize=${outputSize}&apikey=${apiKey}`
    const response = await rateLimitedFetch(url)
    const data = await response.json()

    if (data.status === 'error') {
      console.error('[TwelveData] Candles error:', data.message)
      return []
    }

    if (!data.values || !Array.isArray(data.values)) {
      console.error('[TwelveData] No candle data returned')
      return []
    }

    // TwelveData returns newest first, we need oldest first
    const candles: CandleData[] = data.values
      .map((candle: any) => ({
        time: Math.floor(new Date(candle.datetime).getTime() / 1000),
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
        volume: parseInt(candle.volume) || 0
      }))
      .reverse() // Oldest first for charting

    console.log(`[TwelveData] Fetched ${candles.length} candles for ${symbol}`)
    return candles
  } catch (error) {
    console.error('[TwelveData] Failed to fetch candles:', error)
    return []
  }
}

/**
 * Fetch real-time price (uses quote endpoint)
 */
export async function fetchTwelveDataPrice(symbol: string, apiKey: string): Promise<number | null> {
  const quote = await fetchTwelveDataQuote(symbol, apiKey)
  return quote?.price ?? null
}

/**
 * Batch fetch quotes for multiple symbols
 * TwelveData supports comma-separated symbols
 */
export async function fetchTwelveDataBatchQuotes(
  symbols: string[],
  apiKey: string
): Promise<Map<string, { price: number; change: number; changePercent: number; volume: number }>> {
  const results = new Map()

  try {
    // TwelveData allows up to 8 symbols per request on free tier
    const batchSize = 8
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize)
      const symbolList = batch.join(',')

      const url = `${BASE_URL}/quote?symbol=${symbolList}&apikey=${apiKey}`
      const response = await rateLimitedFetch(url)
      const data = await response.json()

      // Handle single symbol response (object) vs multiple (array in different format)
      if (batch.length === 1) {
        if (data.close) {
          results.set(batch[0], {
            price: parseFloat(data.close),
            change: parseFloat(data.change),
            changePercent: parseFloat(data.percent_change),
            volume: parseInt(data.volume) || 0
          })
        }
      } else {
        // Multiple symbols - TwelveData returns object with symbol keys
        for (const symbol of batch) {
          const quote = data[symbol]
          if (quote && quote.close) {
            results.set(symbol, {
              price: parseFloat(quote.close),
              change: parseFloat(quote.change),
              changePercent: parseFloat(quote.percent_change),
              volume: parseInt(quote.volume) || 0
            })
          }
        }
      }
    }
  } catch (error) {
    console.error('[TwelveData] Batch quote fetch failed:', error)
  }

  return results
}

/**
 * Get API usage info (calls remaining)
 */
export async function getTwelveDataUsage(apiKey: string): Promise<{
  dailyUsage: number
  dailyLimit: number
  remaining: number
} | null> {
  try {
    const url = `${BASE_URL}/api_usage?apikey=${apiKey}`
    const response = await rateLimitedFetch(url)
    const data = await response.json()

    if (data.status === 'error') {
      return null
    }

    return {
      dailyUsage: data.current_usage || 0,
      dailyLimit: data.plan_limit || 800,
      remaining: (data.plan_limit || 800) - (data.current_usage || 0)
    }
  } catch (error) {
    console.error('[TwelveData] Failed to get usage:', error)
    return null
  }
}
