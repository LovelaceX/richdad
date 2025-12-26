import { getSettings } from '../renderer/lib/db'
import type { Quote } from '../renderer/types'
import type { DataProvider, DataSource } from '../renderer/stores/marketStore'
import type { CandleData } from './technicalIndicators'
import {
  canUseTiingo,
  recordTiingoCall
} from './apiBudgetTracker'
import {
  fetchTiingoQuotes,
  fetchTiingoHistorical,
  fetchTiingoHistoricalRange
} from './tiingoService'

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
const FRESH_THRESHOLD_MS = 120000 // Data older than 2 minutes is not "fresh" (matches market hours polling)

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
const cachedHistoricalData: Map<string, CandleData[]> = new Map()
const historicalCacheTimestamps: Map<string, number> = new Map()
let historicalCacheLRU: string[] = [] // Track access order for LRU eviction

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
 * Fetch live prices from Tiingo
 * Uses caching to minimize API calls
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
  const tiingoKey = settings.tiingoApiKey

  if (!tiingoKey) {
    console.warn('[Market Data] No Tiingo API key configured')
    return [] // No data available - UI will show setup prompt
  }

  // Check budget before making API call
  if (!canUseTiingo()) {
    console.warn('[Market Data] Tiingo rate limit reached, using cached data')
    // Emit event for UI to show toast notification
    window.dispatchEvent(new CustomEvent('api-budget-exhausted', {
      detail: { provider: 'tiingo', type: 'quotes' }
    }))
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
    console.log('[Market Data] No symbols requested, skipping quote fetch')
    return []
  }

  try {
    const quotes = await withRetry(() => fetchTiingoQuotes(symbols, tiingoKey))
    if (quotes.length > 0) {
      // Record call AFTER successful response (not before)
      recordTiingoCall()
      // Update cache
      cachedQuotes = quotes
      cacheTimestamp = Date.now()
      return addCacheMetadata(quotes, 'api', 0)
    }
  } catch (error) {
    console.error('[Market Data] Tiingo fetch failed after retries:', error)
    // Try cache on error - don't consume budget for failed calls
    const age = Date.now() - cacheTimestamp
    if (cachedQuotes.length > 0) {
      const filtered = cachedQuotes.filter(q => symbols.includes(q.symbol))
      return addCacheMetadata(filtered, 'stale', age)
    }
  }

  // No data available
  return []
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

  return {
    age,
    isFresh,
    budgetRemaining: -1 // Budget tracking is per-provider now, not global
  }
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
  const tiingoKey = settings.tiingoApiKey

  if (!tiingoKey) {
    console.warn('[Market Data] No Tiingo API key configured')
    return {
      candles: [], // No data - UI will show setup prompt
      source: createDataSource(null, false, 0)
    }
  }

  // Check budget before making API call
  if (!canUseTiingo()) {
    console.warn('[Market Data] Tiingo rate limit reached, checking cache')
    // Emit event for UI to show toast notification
    window.dispatchEvent(new CustomEvent('api-budget-exhausted', {
      detail: { provider: 'tiingo', type: 'historical' }
    }))
    // Try to return cached historical data
    const cacheKey = `${symbol}_${interval}`
    if (cachedHistoricalData.has(cacheKey)) {
      const cacheAge = Date.now() - (historicalCacheTimestamps.get(cacheKey) || 0)
      return {
        candles: cachedHistoricalData.get(cacheKey)!,
        source: createDataSource('tiingo', false, cacheAge)
      }
    }
    return {
      candles: [], // Rate limited, no cache - UI will show error state
      source: createDataSource(null, false, 0)
    }
  }

  try {
    checkAborted() // Check before API call
    const candles = await withRetry(() => fetchTiingoHistorical(symbol, interval, tiingoKey))
    if (candles.length > 0) {
      // Record call AFTER successful response (not before)
      recordTiingoCall()
      // Cache the results
      const cacheKey = `${symbol}_${interval}`
      cachedHistoricalData.set(cacheKey, candles)
      historicalCacheTimestamps.set(cacheKey, Date.now())
      trackHistoricalCacheAccess(cacheKey) // LRU tracking
      return {
        candles,
        source: createDataSource('tiingo', false, 0) // Tiingo IEX is real-time
      }
    }
  } catch (error) {
    console.error('[Market Data] Tiingo historical fetch failed after retries:', error)
    // Don't consume budget for failed calls
  }

  // No data available
  return {
    candles: [],
    source: createDataSource(null, false, 0)
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
  const tiingoKey = settings.tiingoApiKey

  if (!tiingoKey) {
    console.warn('[Market Data] No Tiingo API key for backtest data')
    return [] // Return empty - UI should show error state
  }

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

  try {
    const candles = await withRetry(() => fetchTiingoHistoricalRange(
      symbol,
      adjustedStartDate,
      endDate,
      timeframe,
      tiingoKey
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
