/**
 * TwelveData API Service
 *
 * Free tier: 800 API calls/day, 8 websocket connections
 * Real-time data, 99+ markets, technical indicators
 *
 * API Docs: https://twelvedata.com/docs
 */

import type { CandleData } from '../renderer/types'
import { safeJsonParse } from './safeJson'
import { canUseTwelveData, recordTwelveDataCall, getTwelveDataBudgetStatus } from './apiBudgetTracker'

const BASE_URL = 'https://api.twelvedata.com'

// Rate limiting: 800 calls/day, 8 calls/min free tier
const CALLS_PER_MINUTE = 8
const MINUTE_MS = 60 * 1000

// Rolling window of call timestamps for per-minute limiting
const callTimestamps: number[] = []

/**
 * Check if we can make a call within the per-minute limit
 * Returns wait time in ms if limit reached, 0 if OK to call
 */
function getMinuteWaitTime(): number {
  const now = Date.now()

  // Remove timestamps older than 1 minute
  while (callTimestamps.length > 0 && callTimestamps[0] < now - MINUTE_MS) {
    callTimestamps.shift()
  }

  // If under limit, no wait needed
  if (callTimestamps.length < CALLS_PER_MINUTE) {
    return 0
  }

  // Calculate how long until oldest call expires
  const oldestCall = callTimestamps[0]
  const waitTime = (oldestCall + MINUTE_MS) - now + 100 // +100ms buffer

  return Math.max(0, waitTime)
}

/**
 * Record a call timestamp for per-minute tracking
 */
function recordCallTimestamp(): void {
  callTimestamps.push(Date.now())
}

/**
 * Fetch with rate limiting AND budget tracking
 * Enforces both per-minute rate limit and daily budget
 */
async function rateLimitedFetch(url: string): Promise<Response> {
  // Check daily budget first
  if (!canUseTwelveData()) {
    const status = getTwelveDataBudgetStatus()
    console.warn(`[TwelveData] Daily limit reached: ${status.dailyUsed}/${status.dailyLimit} calls used`)
    throw new Error(`TwelveData daily limit reached (${status.dailyUsed}/${status.dailyLimit}). Resets at midnight.`)
  }

  // Check per-minute limit (8 calls/min on free tier)
  const waitTime = getMinuteWaitTime()
  if (waitTime > 0) {
    console.log(`[TwelveData] Minute limit (${CALLS_PER_MINUTE}/min) reached, waiting ${Math.ceil(waitTime / 1000)}s...`)
    await new Promise(resolve => setTimeout(resolve, waitTime))
  }

  // Record this call timestamp for per-minute tracking
  recordCallTimestamp()

  // Record the call in daily budget tracker (pessimistic tracking)
  recordTwelveDataCall()

  return fetch(url)
}

/**
 * Test TwelveData API connection
 */
export async function testTwelveDataConnection(apiKey: string): Promise<{ success: boolean; message: string }> {
  try {
    const url = `${BASE_URL}/time_series?symbol=AAPL&interval=1min&outputsize=1&apikey=${apiKey}`
    const response = await rateLimitedFetch(url)
    const result = await safeJsonParse<{ status?: string; message?: string; values?: unknown[] }>(response, 'TwelveData')

    if (!result.success) {
      return {
        success: false,
        message: result.error
      }
    }

    const data = result.data
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
    const result = await safeJsonParse<{
      status?: string
      message?: string
      close: string
      change: string
      percent_change: string
      volume: string
      high: string
      low: string
      open: string
      previous_close: string
    }>(response, 'TwelveData')

    if (!result.success) {
      console.error('[TwelveData] Quote error:', result.error)
      return null
    }

    const data = result.data
    if (data.status === 'error') {
      console.error('[TwelveData] Quote error:', data.message)
      return null
    }

    // Parse and validate price - critical field
    const price = parseFloat(data.close)
    if (isNaN(price) || price <= 0) {
      console.warn('[TwelveData] Invalid price data:', data.close)
      return null
    }

    // Parse other fields with NaN fallbacks
    const change = parseFloat(data.change)
    const changePercent = parseFloat(data.percent_change)
    const high = parseFloat(data.high)
    const low = parseFloat(data.low)
    const open = parseFloat(data.open)
    const previousClose = parseFloat(data.previous_close)

    return {
      price,
      change: isNaN(change) ? 0 : change,
      changePercent: isNaN(changePercent) ? 0 : changePercent,
      volume: parseInt(data.volume) || 0,
      high: isNaN(high) ? price : high,
      low: isNaN(low) ? price : low,
      open: isNaN(open) ? price : open,
      previousClose: isNaN(previousClose) ? price : previousClose
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
    const result = await safeJsonParse<{
      status?: string
      message?: string
      values?: Array<{
        datetime: string
        open: string
        high: string
        low: string
        close: string
        volume: string
      }>
    }>(response, 'TwelveData')

    if (!result.success) {
      console.error('[TwelveData] Candles error:', result.error)
      return []
    }

    const data = result.data
    if (data.status === 'error') {
      console.error('[TwelveData] Candles error:', data.message)
      return []
    }

    if (!data.values || !Array.isArray(data.values)) {
      console.error('[TwelveData] No candle data returned')
      return []
    }

    // TwelveData returns newest first, we need oldest first
    // Filter out candles with invalid price data
    const candles: CandleData[] = []

    for (const candle of data.values) {
      const open = parseFloat(candle.open)
      const high = parseFloat(candle.high)
      const low = parseFloat(candle.low)
      const close = parseFloat(candle.close)
      const time = Math.floor(new Date(candle.datetime).getTime() / 1000)

      // Validate critical fields - skip invalid candles
      if (isNaN(close) || isNaN(time) || close <= 0 || time <= 0) {
        continue
      }

      candles.push({
        time,
        open: isNaN(open) ? close : open,
        high: isNaN(high) ? close : high,
        low: isNaN(low) ? close : low,
        close,
        volume: parseInt(candle.volume) || 0
      })
    }

    // Reverse to get oldest first for charting
    candles.reverse()

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
      const result = await safeJsonParse<Record<string, {
        close?: string
        change?: string
        percent_change?: string
        volume?: string
      }>>(response, 'TwelveData')

      if (!result.success) {
        console.error('[TwelveData] Batch quote error:', result.error)
        continue
      }

      const data = result.data

      // Handle single symbol response (object) vs multiple (array in different format)
      if (batch.length === 1) {
        const singleData = data as unknown as { close?: string; change?: string; percent_change?: string; volume?: string }
        if (singleData.close) {
          results.set(batch[0], {
            price: parseFloat(singleData.close),
            change: parseFloat(singleData.change || '0'),
            changePercent: parseFloat(singleData.percent_change || '0'),
            volume: parseInt(singleData.volume || '0') || 0
          })
        }
      } else {
        // Multiple symbols - TwelveData returns object with symbol keys
        for (const symbol of batch) {
          const quote = data[symbol]
          if (quote && quote.close) {
            results.set(symbol, {
              price: parseFloat(quote.close),
              change: parseFloat(quote.change || '0'),
              changePercent: parseFloat(quote.percent_change || '0'),
              volume: parseInt(quote.volume || '0') || 0
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
    const result = await safeJsonParse<{
      status?: string
      current_usage?: number
      plan_limit?: number
    }>(response, 'TwelveData')

    if (!result.success) {
      console.error('[TwelveData] Usage error:', result.error)
      return null
    }

    const data = result.data
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
