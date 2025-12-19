import { getSettings } from '../renderer/lib/db'
import type { Quote } from '../renderer/types'
import type { DataProvider, DataSource } from '../renderer/stores/marketStore'
import type { CandleData } from './technicalIndicators'
import {
  canUseAlphaVantageForMarket,
  canUseAlphaVantageForCharts,
  recordMarketCall,
  recordChartCall,
  getBudgetStatus,
  canUsePolygon,
  recordPolygonCall,
  canUseTwelveData,
  recordTwelveDataCall
} from './apiBudgetTracker'
import { fetchPolygonQuotes, fetchPolygonHistorical, fetchPolygonHistoricalRange } from './polygonService'
import { fetchTwelveDataBatchQuotes, fetchTwelveDataCandles } from './twelveDataService'

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query'

// ==========================================
// RETRY LOGIC WITH EXPONENTIAL BACKOFF
// ==========================================

interface RetryConfig {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
  shouldRetry?: (error: unknown) => boolean
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  // Don't retry on rate limit errors - they won't resolve quickly
  shouldRetry: (error: unknown) => {
    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      // Don't retry rate limits or auth errors
      if (message.includes('rate limit') || message.includes('unauthorized') ||
          message.includes('invalid api key') || message.includes('403') ||
          message.includes('401')) {
        return false
      }
    }
    return true
  }
}

/**
 * Execute a function with exponential backoff retry
 * Handles transient network failures gracefully
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxAttempts, baseDelayMs, maxDelayMs, shouldRetry } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config
  }

  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Check if we should retry this error
      if (shouldRetry && !shouldRetry(error)) {
        console.warn(`[MarketData] Non-retryable error, failing immediately:`, error)
        throw error
      }

      // Don't retry on last attempt
      if (attempt === maxAttempts) {
        console.error(`[MarketData] All ${maxAttempts} attempts failed`)
        throw error
      }

      // Calculate delay with exponential backoff + jitter
      const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1)
      const jitter = Math.random() * 0.3 * exponentialDelay // ±15% jitter
      const delay = Math.min(exponentialDelay + jitter, maxDelayMs)

      console.warn(
        `[MarketData] Attempt ${attempt}/${maxAttempts} failed, retrying in ${Math.round(delay)}ms:`,
        error instanceof Error ? error.message : error
      )

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

// Result type with source metadata for transparency
export interface FetchHistoricalResult {
  candles: CandleData[]
  source: DataSource
}

// Helper to create DataSource object
function createDataSource(
  provider: DataProvider,
  isDelayed: boolean = false,
  cacheAge: number = 0
): DataSource {
  return {
    provider,
    lastUpdated: Date.now(),
    isDelayed,
    cacheAge
  }
}

// ==========================================
// API ERROR PARSING
// ==========================================

export interface ApiError {
  provider: string
  status: number
  message: string
  isRateLimit: boolean
  isAuthError: boolean
  retryAfterSeconds?: number
}

/**
 * Parse API response errors into user-friendly messages
 * Used for showing helpful toasts when API calls fail
 */
export function parseApiError(response: Response, provider: string): ApiError {
  const status = response.status
  const retryAfter = response.headers.get('Retry-After')

  let message: string
  let isRateLimit = false
  let isAuthError = false
  let retryAfterSeconds: number | undefined

  if (status === 429) {
    isRateLimit = true
    retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : 60
    message = `${provider}: Rate limit reached. Try again in ${retryAfterSeconds}s.`
  } else if (status === 401 || status === 403) {
    isAuthError = true
    message = `${provider}: API key doesn't have access to this data.`
  } else if (status >= 500) {
    message = `${provider}: Service temporarily unavailable.`
  } else if (status === 404) {
    message = `${provider}: Data not found for this symbol.`
  } else {
    message = `${provider}: Request failed (${status}).`
  }

  return {
    provider,
    status,
    message,
    isRateLimit,
    isAuthError,
    retryAfterSeconds
  }
}

/**
 * Create a user-friendly error message from a caught error
 */
export function formatApiError(error: unknown, provider: string): string {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return `${provider}: Connection failed. Check your internet.`
  }
  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes('rate limit') || error.message.includes('429')) {
      return `${provider}: Rate limit reached. Try again later.`
    }
    if (error.message.includes('unauthorized') || error.message.includes('401') || error.message.includes('403')) {
      return `${provider}: Invalid or expired API key.`
    }
    if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
      return `${provider}: Request timed out. Try again.`
    }
    return `${provider}: ${error.message}`
  }
  return `${provider}: An unexpected error occurred.`
}

const CACHE_DURATION_MS = 3600000 // 1 hour (3600 seconds)
const RATE_LIMIT_DELAY_MS = 12000 // 5 calls/min = 12s between calls
const FRESH_THRESHOLD_MS = 60000 // Data older than 1 minute is not "fresh"

let lastCallTime = 0
let cachedQuotes: Quote[] = []
let cacheTimestamp = 0

// ==========================================
// REQUEST DEDUPLICATION
// ==========================================

/**
 * In-flight request tracking for deduplication
 * Prevents duplicate API calls when multiple components request same data simultaneously
 */
const pendingQuoteRequests = new Map<string, Promise<Quote[]>>()
const pendingHistoricalRequests = new Map<string, Promise<FetchHistoricalResult>>()

/**
 * Create a normalized cache key from symbols array
 */
function createQuoteCacheKey(symbols: string[]): string {
  return [...symbols].sort().join(',')
}

/**
 * Create cache key for historical data
 */
function createHistoricalCacheKey(symbol: string, interval: string): string {
  return `${symbol}_${interval}`
}

/**
 * Add cache metadata to quotes for UI transparency
 */
function addCacheMetadata(
  quotes: Quote[],
  source: 'api' | 'cache' | 'stale' | 'mock',
  cacheAge: number = 0
): Quote[] {
  const isFresh = source === 'api' || (source === 'cache' && cacheAge < FRESH_THRESHOLD_MS)

  return quotes.map(q => ({
    ...q,
    dataSource: source,
    cacheAge,
    isFresh
  }))
}

// Historical data cache (for candlestick charts)
// Limited to prevent unbounded memory growth
const MAX_HISTORICAL_CACHE_ENTRIES = 50
let cachedHistoricalData: Map<string, CandleData[]> = new Map()
let historicalCacheTimestamps: Map<string, number> = new Map()
let historicalCacheLRU: string[] = [] // Track access order for LRU eviction
const HISTORICAL_CACHE_DURATION_MS = 86400000 // 24 hours

/**
 * Track historical cache access for LRU cleanup
 */
function trackHistoricalCacheAccess(cacheKey: string): void {
  const idx = historicalCacheLRU.indexOf(cacheKey)
  if (idx !== -1) {
    historicalCacheLRU.splice(idx, 1)
  }
  historicalCacheLRU.push(cacheKey)

  // Evict oldest entries if over limit
  while (historicalCacheLRU.length > MAX_HISTORICAL_CACHE_ENTRIES) {
    const evict = historicalCacheLRU.shift()
    if (evict) {
      cachedHistoricalData.delete(evict)
      historicalCacheTimestamps.delete(evict)
    }
  }
}

/**
 * Fetch live prices from configured provider (Polygon or Alpha Vantage)
 * Uses caching to minimize API calls
 * Falls back to mock data on error
 *
 * DEDUPLICATION: If an identical request is already in flight, returns the same promise
 */
export async function fetchLivePrices(symbols: string[]): Promise<Quote[]> {
  // Create cache key for deduplication
  const dedupeKey = createQuoteCacheKey(symbols)

  // Check for in-flight request with same symbols
  const pendingRequest = pendingQuoteRequests.get(dedupeKey)
  if (pendingRequest) {
    console.log('[MarketData] Deduplicating quote request for:', symbols.length, 'symbols')
    return pendingRequest
  }

  // Create new request and track it
  const request = fetchLivePricesInternal(symbols).finally(() => {
    // Clean up tracking once request completes (success or failure)
    pendingQuoteRequests.delete(dedupeKey)
  })

  pendingQuoteRequests.set(dedupeKey, request)
  return request
}

/**
 * Internal implementation of fetchLivePrices
 * Separated for deduplication wrapper
 */
async function fetchLivePricesInternal(symbols: string[]): Promise<Quote[]> {
  const settings = await getSettings()
  const provider = settings.marketDataProvider || 'polygon'

  // Route to Polygon if configured
  if (provider === 'polygon') {
    const polygonKey = settings.polygonApiKey
    if (!polygonKey) {
      console.warn('[Market Data] No Polygon API key configured')
      return [] // No data available - UI will show setup prompt
    }

    // Check budget before making API call
    if (!canUsePolygon()) {
      console.warn('[Market Data] Polygon rate limit reached, using cached/mock data')
      // Try to return cached data if available
      const age = Date.now() - cacheTimestamp
      if (cachedQuotes.length > 0 && age < CACHE_DURATION_MS * 2) {
        const filtered = cachedQuotes.filter(q => symbols.includes(q.symbol))
        return addCacheMetadata(filtered, age > CACHE_DURATION_MS ? 'stale' : 'cache', age)
      }
      return [] // Rate limited, no cache - UI will show error state
    }

    // Skip API call if no symbols requested (prevents phantom budget usage)
    if (symbols.length === 0) {
      console.log('[Market Data] No symbols requested, skipping Polygon quote fetch')
      return []
    }

    try {
      recordPolygonCall()
      const quotes = await withRetry(() => fetchPolygonQuotes(symbols, polygonKey))
      if (quotes.length > 0) {
        // Update cache
        cachedQuotes = quotes
        cacheTimestamp = Date.now()
        return addCacheMetadata(quotes, 'api', 0)
      }
    } catch (error) {
      console.error('[Market Data] Polygon fetch failed after retries:', error)
      // Try cache on error
      const age = Date.now() - cacheTimestamp
      if (cachedQuotes.length > 0) {
        const filtered = cachedQuotes.filter(q => symbols.includes(q.symbol))
        return addCacheMetadata(filtered, 'stale', age)
      }
    }
    // No data available
    return []
  }

  // Route to TwelveData if configured
  if (provider === 'twelvedata') {
    const twelveDataKey = settings.twelvedataApiKey
    if (!twelveDataKey) {
      console.warn('[Market Data] No TwelveData API key configured')
      return [] // No data available - UI will show setup prompt
    }

    // Check budget before making API call
    if (!canUseTwelveData()) {
      console.warn('[Market Data] TwelveData rate limit reached, using cached data')
      const age = Date.now() - cacheTimestamp
      if (cachedQuotes.length > 0 && age < CACHE_DURATION_MS * 2) {
        const filtered = cachedQuotes.filter(q => symbols.includes(q.symbol))
        return addCacheMetadata(filtered, age > CACHE_DURATION_MS ? 'stale' : 'cache', age)
      }
      return [] // Rate limited, no cache - UI will show error state
    }

    // Skip API call if no symbols requested (prevents phantom budget usage)
    if (symbols.length === 0) {
      console.log('[Market Data] No symbols requested, skipping TwelveData quote fetch')
      return []
    }

    try {
      recordTwelveDataCall()
      const quotesMap = await withRetry(() => fetchTwelveDataBatchQuotes(symbols, twelveDataKey))
      const quotes: Quote[] = symbols
        .map(symbol => {
          const data = quotesMap.get(symbol)
          if (data) {
            return {
              symbol,
              price: data.price,
              change: data.change,
              changePercent: data.changePercent,
              volume: data.volume,
              high: data.price * 1.01, // Approximate if not available
              low: data.price * 0.99,
              open: data.price - data.change,
              previousClose: data.price - data.change,
              timestamp: Date.now()
            }
          }
          return null // No data for this symbol
        })
        .filter((q): q is Quote => q !== null) // Filter out nulls
      // Update cache
      cachedQuotes = quotes
      cacheTimestamp = Date.now()
      return addCacheMetadata(quotes, 'api', 0)
    } catch (error) {
      console.error('[Market Data] TwelveData fetch failed after retries:', error)
      // Try cache on error
      const age = Date.now() - cacheTimestamp
      if (cachedQuotes.length > 0) {
        const filtered = cachedQuotes.filter(q => symbols.includes(q.symbol))
        return addCacheMetadata(filtered, 'stale', age)
      }
    }
    // No data available
    return []
  }

  // Alpha Vantage path
  const apiKey = settings.alphaVantageApiKey

  // No API key configured
  if (!apiKey) {
    console.warn('[Market Data] No Alpha Vantage API key configured')
    return [] // No data available - UI will show setup prompt
  }

  // Check cache first (1-hour cache)
  const now = Date.now()
  const currentCacheAge = now - cacheTimestamp

  if (cachedQuotes.length > 0 && currentCacheAge < CACHE_DURATION_MS) {
    console.log(`[Market Data] Serving from cache (age: ${Math.round(currentCacheAge / 60000)}m ${Math.round((currentCacheAge % 60000) / 1000)}s)`)
    return addCacheMetadata(cachedQuotes, 'cache', currentCacheAge)
  }

  // Check API budget before making call
  if (!canUseAlphaVantageForMarket()) {
    console.warn('[Market Data] Budget exhausted, serving from stale cache')
    if (cachedQuotes.length > 0) {
      return addCacheMetadata(cachedQuotes, 'stale', currentCacheAge)
    }
    return [] // Budget exhausted, no cache - UI will show error state
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

    // Fetch with retry logic
    const data = await withRetry(async () => {
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status}`)
      }

      const json = await response.json()

      // Check for API error messages
      if (json['Error Message']) {
        throw new Error(json['Error Message'])
      }

      // Check for rate limit message
      if (json['Note']) {
        console.warn('Alpha Vantage rate limit hit:', json['Note'])
        throw new Error('Rate limit exceeded')
      }

      return json
    })

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

    return addCacheMetadata(quotes, 'api', 0)

  } catch (error) {
    console.error('Failed to fetch live prices after retries:', error)
    // If we have stale cache, return it
    if (cachedQuotes.length > 0) {
      console.warn('[Market Data] Using stale cache due to API error')
      const staleCacheAge = Date.now() - cacheTimestamp
      return addCacheMetadata(cachedQuotes, 'stale', staleCacheAge)
    }
    return [] // No data available - UI will show error state
  }
}

// Cache status type for UI display
export type CacheStatus = {
  age: number
  isFresh: boolean
  budgetRemaining: number
}

/**
 * Get cache metadata for UI display
 */
export function getCacheStatus(): CacheStatus {
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
function aggregateCandles(candles: CandleData[], count: number): CandleData[] {
  if (count <= 1) return candles

  const aggregated: CandleData[] = []

  for (let i = 0; i < candles.length; i += count) {
    const group = candles.slice(i, i + count)
    if (group.length === 0) continue

    aggregated.push({
      time: group[0].time, // Use first candle's time
      open: group[0].open,
      high: Math.max(...group.map(c => c.high)),
      low: Math.min(...group.map(c => c.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((sum, c) => sum + (c.volume ?? 0), 0)
    })
  }

  return aggregated
}

/**
 * Options for fetchHistoricalData
 */
interface FetchHistoricalOptions {
  /** AbortSignal for request cancellation */
  signal?: AbortSignal
}

/**
 * Fetch historical OHLCV data for charts
 * Returns candles AND source metadata for transparency
 *
 * DEDUPLICATION: If an identical request is already in flight, returns the same promise
 * CANCELLATION: Pass options.signal to abort in-flight requests
 */
export async function fetchHistoricalData(
  symbol: string,
  interval: string = 'daily',
  options?: FetchHistoricalOptions
): Promise<FetchHistoricalResult> {
  // Check if already aborted before starting
  if (options?.signal?.aborted) {
    return {
      candles: [],
      source: createDataSource(null, false, 0)
    }
  }

  // Create cache key for deduplication
  const dedupeKey = createHistoricalCacheKey(symbol, interval)

  // Check for in-flight request
  const pendingRequest = pendingHistoricalRequests.get(dedupeKey)
  if (pendingRequest) {
    console.log(`[MarketData] Deduplicating historical request for: ${symbol} (${interval})`)
    return pendingRequest
  }

  // Create new request and track it
  const request = fetchHistoricalDataInternal(symbol, interval, options).finally(() => {
    pendingHistoricalRequests.delete(dedupeKey)
  })

  pendingHistoricalRequests.set(dedupeKey, request)
  return request
}

/**
 * Internal implementation of fetchHistoricalData
 * Separated for deduplication wrapper
 */
async function fetchHistoricalDataInternal(
  symbol: string,
  interval: string = 'daily',
  options?: FetchHistoricalOptions
): Promise<FetchHistoricalResult> {
  // Check abort signal periodically during long operations
  const checkAborted = () => {
    if (options?.signal?.aborted) {
      throw new DOMException('Request was aborted', 'AbortError')
    }
  }
  const settings = await getSettings()
  const provider = settings.marketDataProvider || 'polygon'

  // Route to Polygon if configured
  if (provider === 'polygon') {
    const polygonKey = settings.polygonApiKey
    if (!polygonKey) {
      console.warn('[Market Data] No Polygon API key configured')
      return {
        candles: [], // No data - UI will show setup prompt
        source: createDataSource(null, false, 0)
      }
    }

    // Check budget before making API call
    if (!canUsePolygon()) {
      console.warn('[Market Data] Polygon rate limit reached, checking cache')
      // Try to return cached historical data
      const cacheKey = `${symbol}_${interval}`
      if (cachedHistoricalData.has(cacheKey)) {
        const cacheAge = Date.now() - (historicalCacheTimestamps.get(cacheKey) || 0)
        return {
          candles: cachedHistoricalData.get(cacheKey)!,
          source: createDataSource('polygon', true, cacheAge)
        }
      }
      return {
        candles: [], // Rate limited, no cache - UI will show error state
        source: createDataSource(null, false, 0)
      }
    }

    try {
      checkAborted() // Check before API call
      recordPolygonCall()
      const candles = await withRetry(() => fetchPolygonHistorical(symbol, interval, polygonKey))
      if (candles.length > 0) {
        // Cache the results
        const cacheKey = `${symbol}_${interval}`
        cachedHistoricalData.set(cacheKey, candles)
        historicalCacheTimestamps.set(cacheKey, Date.now())
        trackHistoricalCacheAccess(cacheKey) // LRU tracking
        return {
          candles,
          source: createDataSource('polygon', true, 0) // Polygon free tier is 15-min delayed
        }
      }
    } catch (error) {
      console.error('[Market Data] Polygon historical fetch failed after retries:', error)
    }
    // No data available
    return {
      candles: [],
      source: createDataSource(null, false, 0)
    }
  }

  // Route to TwelveData if configured
  if (provider === 'twelvedata') {
    const twelveDataKey = settings.twelvedataApiKey
    if (!twelveDataKey) {
      console.warn('[Market Data] No TwelveData API key configured')
      return {
        candles: [], // No data - UI will show setup prompt
        source: createDataSource(null, false, 0)
      }
    }

    // Check budget before making API call
    if (!canUseTwelveData()) {
      console.warn('[Market Data] TwelveData rate limit reached, checking cache')
      const cacheKey = `${symbol}_${interval}`
      if (cachedHistoricalData.has(cacheKey)) {
        const cacheAge = Date.now() - (historicalCacheTimestamps.get(cacheKey) || 0)
        return {
          candles: cachedHistoricalData.get(cacheKey)!,
          source: createDataSource('twelvedata', false, cacheAge)
        }
      }
      return {
        candles: [], // Rate limited, no cache - UI will show error state
        source: createDataSource(null, false, 0)
      }
    }

    try {
      checkAborted() // Check before API call
      recordTwelveDataCall()
      const candles = await withRetry(() => fetchTwelveDataCandles(symbol, interval, twelveDataKey))
      if (candles.length > 0) {
        return {
          candles,
          source: createDataSource('twelvedata', false, 0) // TwelveData is real-time
        }
      }
    } catch (error) {
      console.error('[Market Data] TwelveData historical fetch failed after retries:', error)
    }
    // No data available
    return {
      candles: [],
      source: createDataSource(null, false, 0)
    }
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
    return {
      candles: cached,
      source: createDataSource('alphavantage', false, cacheAge)
    }
  }

  // Check API budget before making call
  if (!canUseAlphaVantageForCharts()) {
    console.warn('[Market Data] Chart budget exhausted, serving from stale cache')

    if (cached) {
      console.log('[Market Data] Returning stale cached data (budget exhausted)')
      return {
        candles: cached,
        source: createDataSource('alphavantage', false, cacheAge)
      }
    }

    // No cache available
    return {
      candles: [], // Budget exhausted, no cache - UI will show error state
      source: createDataSource(null, false, 0)
    }
  }

  const apiKey = settings.alphaVantageApiKey

  if (!apiKey) {
    console.warn('[Market Data] No API key configured')
    return {
      candles: [], // No data - UI will show setup prompt
      source: createDataSource(null, false, 0)
    }
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

    // Fetch with retry logic
    const data = await withRetry(async () => {
      const response = await fetch(`${ALPHA_VANTAGE_BASE_URL}?${params}`)
      return response.json()
    })

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
    trackHistoricalCacheAccess(cacheKey) // LRU tracking
    console.log(`[Market Data] Cached ${filtered.length} candles for ${symbol} (${interval})`)

    // Record API call in budget tracker
    recordChartCall()

    return {
      candles: filtered,
      source: createDataSource('alphavantage', false, 0)
    }

  } catch (error) {
    console.error(`[Market Data] Historical data fetch failed for ${symbol} after retries:`, error)

    // No data available
    return {
      candles: [], // API failed - UI will show error state
      source: createDataSource(null, false, 0)
    }
  }
}

/**
 * Fetch historical data for a specific date range
 * Used for backtesting to get extended historical data
 *
 * @param symbol - Stock ticker
 * @param startDate - Start date (Unix timestamp in ms)
 * @param endDate - End date (Unix timestamp in ms)
 * @param timeframe - Timeframe (1d, 1h, 15m)
 * @param includeIndicatorLookback - Add extra days for indicator calculation (default: 200)
 */
export async function fetchHistoricalDataRange(
  symbol: string,
  startDate: number,
  endDate: number,
  timeframe: '1d' | '1h' | '15m' = '1d',
  includeIndicatorLookback: number = 200
): Promise<CandleData[]> {
  const settings = await getSettings()

  // Calculate adjusted start date to include lookback for indicators
  // For daily timeframe, we need 200 extra trading days (~280 calendar days)
  // For hourly, ~200 hours (~8.5 days)
  // For 15min, ~200 candles (~50 hours)
  let lookbackMs = 0
  switch (timeframe) {
    case '1d':
      lookbackMs = includeIndicatorLookback * 1.4 * 24 * 60 * 60 * 1000 // ~280 calendar days
      break
    case '1h':
      lookbackMs = includeIndicatorLookback * 60 * 60 * 1000 // 200 hours
      break
    case '15m':
      lookbackMs = includeIndicatorLookback * 15 * 60 * 1000 // 200 * 15min
      break
  }

  const adjustedStartDate = startDate - lookbackMs

  console.log(`[Market Data] Fetching range for ${symbol}: ${new Date(adjustedStartDate).toISOString().split('T')[0]} to ${new Date(endDate).toISOString().split('T')[0]} (${timeframe})`)

  // Only Polygon supports date range queries well
  const polygonKey = settings.polygonApiKey
  if (!polygonKey) {
    console.warn('[Market Data] No Polygon API key for backtest data')
    return [] // Return empty - UI should show error state
  }

  try {
    const candles = await withRetry(() => fetchPolygonHistoricalRange(
      symbol,
      adjustedStartDate,
      endDate,
      timeframe,
      polygonKey
    ))

    if (candles.length > 0) {
      console.log(`[Market Data] Fetched ${candles.length} candles for backtest`)
      return candles
    }
  } catch (error) {
    console.error('[Market Data] Range fetch failed after retries:', error)
  }

  // No fallback - return empty array so UI shows error state
  console.warn('[Market Data] No data available for backtest')
  return []
}

/**
 * Validate candle data for backtest
 * Checks for gaps, anomalies, and data quality issues
 */
export function validateCandleData(candles: CandleData[]): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []

  if (!candles || candles.length === 0) {
    return { valid: false, issues: ['No candle data'] }
  }

  // Check for chronological order
  for (let i = 1; i < candles.length; i++) {
    if (candles[i].time <= candles[i - 1].time) {
      issues.push(`Out of order at index ${i}: ${candles[i].time} <= ${candles[i - 1].time}`)
    }
  }

  // Check for negative prices
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]
    if (c.open < 0 || c.high < 0 || c.low < 0 || c.close < 0) {
      issues.push(`Negative price at index ${i}`)
    }
  }

  // Check for OHLC consistency
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i]
    if (c.high < c.low) {
      issues.push(`High < Low at index ${i}`)
    }
    if (c.high < c.open || c.high < c.close) {
      issues.push(`High not highest at index ${i}`)
    }
    if (c.low > c.open || c.low > c.close) {
      issues.push(`Low not lowest at index ${i}`)
    }
  }

  // Check for large gaps (more than 3 expected intervals)
  // This is a rough check for daily data
  for (let i = 1; i < candles.length; i++) {
    const gap = candles[i].time - candles[i - 1].time
    const expectedGap = 86400 // 1 day in seconds
    if (gap > expectedGap * 5) { // Allow up to 5 days (weekends + holidays)
      const gapDays = Math.round(gap / 86400)
      issues.push(`Large gap of ${gapDays} days at index ${i}`)
    }
  }

  return {
    valid: issues.length === 0,
    issues
  }
}
