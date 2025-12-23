/**
 * News Service
 * Hybrid RSS + Alpha Vantage news architecture
 * - RSS feeds (primary): Native browser parsing, free
 * - Alpha Vantage NEWS_SENTIMENT (fallback): 1 call/day budget
 */

import { parseRSSFeed } from './rssParser'
import { canUseAlphaVantageForNews, recordNewsCall, canUseFinnhub, recordFinnhubCall } from './apiBudgetTracker'
import { getSettings, db } from '../renderer/lib/db'
import type { NewsItem } from '../renderer/types'

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query'
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1'
const RSS_FETCH_TIMEOUT_MS = 10000 // 10 seconds per feed
const FINNHUB_FETCH_TIMEOUT_MS = 15000 // 15 seconds for Finnhub

/**
 * Validate and sanitize image URLs from external sources
 * Prevents XSS attacks via javascript: or data: URLs
 * @param url - The URL to validate
 * @returns The URL if valid, undefined if invalid
 */
function sanitizeImageUrl(url: string | undefined | null): string | undefined {
  if (!url || typeof url !== 'string') return undefined

  try {
    const parsed = new URL(url)

    // Only allow http/https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      console.warn(`[News Service] Blocked non-http(s) image URL: ${url.slice(0, 50)}...`)
      return undefined
    }

    // Block suspicious patterns that could be XSS vectors
    const suspicious = [
      'javascript:',
      'data:',
      '<script',
      'onerror=',
      'onload=',
      'onclick='
    ]

    const lowerUrl = url.toLowerCase()
    if (suspicious.some(pattern => lowerUrl.includes(pattern))) {
      console.warn(`[News Service] Blocked suspicious image URL: ${url.slice(0, 50)}...`)
      return undefined
    }

    return url
  } catch {
    // Invalid URL format
    return undefined
  }
}

export interface NewsResponse {
  articles: NewsItem[]
  source: 'rss' | 'alpha_vantage' | 'finnhub' | 'cache' | 'empty'
  hasSentiment: boolean
  error?: string
}

/**
 * Fetch news from RSS feeds (primary source)
 * Uses native browser DOMParser - zero dependencies
 */
export async function fetchNewsFromRSS(): Promise<NewsItem[]> {
  try {
    // Query database for enabled RSS feeds
    const enabledSources = await db.newsSources
      .where('enabled')
      .equals(1)
      .toArray()

    if (enabledSources.length === 0) {
      console.warn('[News Service] No enabled RSS sources')
      return []
    }

    console.log(`[News Service] Fetching from ${enabledSources.length} RSS feeds`)

    const allHeadlines: NewsItem[] = []
    const seenKeys = new Set<string>() // For deduplication

    // Fetch all feeds in parallel
    const feedPromises = enabledSources.map(async source => {
      try {
        // Create abort controller for timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), RSS_FETCH_TIMEOUT_MS)

        const response = await fetch(source.url, {
          headers: {
            Accept: 'application/rss+xml, application/xml, text/xml, application/atom+xml'
          },
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const xmlText = await response.text()
        const items = parseRSSFeed(xmlText, source.name)

        console.log(`[News Service] Fetched ${items.length} items from ${source.name}`)

        return items
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.warn(`[News Service] Failed to fetch RSS from ${source.name}:`, errorMessage)
        return []
      }
    })

    const feedResults = await Promise.all(feedPromises)

    // Aggregate all items and deduplicate
    for (const items of feedResults) {
      for (const item of items) {
        // Deduplication key: headline + date
        const dateKey = new Date(item.timestamp).toDateString()
        const dedupeKey = `${item.headline.trim().toLowerCase()}|${dateKey}`

        if (seenKeys.has(dedupeKey)) {
          continue // Skip duplicate
        }
        seenKeys.add(dedupeKey)

        allHeadlines.push(item)
      }
    }

    // Sort by timestamp (newest first)
    allHeadlines.sort((a, b) => b.timestamp - a.timestamp)

    console.log(`[News Service] RSS fetch complete: ${allHeadlines.length} unique headlines`)

    return allHeadlines
  } catch (error) {
    console.error('[News Service] RSS fetch failed:', error)
    return []
  }
}

/**
 * Fetch news from Alpha Vantage NEWS_SENTIMENT API
 * Uses 1 of 25 daily API calls
 */
export async function fetchNewsFromAlphaVantage(): Promise<NewsItem[]> {
  try {
    const settings = await getSettings()
    const apiKey = settings.alphaVantageApiKey

    if (!apiKey) {
      throw new Error('No Alpha Vantage API key configured')
    }

    if (!canUseAlphaVantageForNews()) {
      throw new Error('News API budget exhausted (1 call/day)')
    }

    console.log('[News Service] Fetching from Alpha Vantage NEWS_SENTIMENT')

    // Get watchlist tickers to filter news
    const tickers = await getWatchlistTickers()
    const tickersParam = tickers.length > 0 ? `&tickers=${tickers.slice(0, 50).join(',')}` : ''

    const url = `${ALPHA_VANTAGE_BASE_URL}?function=NEWS_SENTIMENT${tickersParam}&limit=50&apikey=${apiKey}`

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`)
    }

    const data = await response.json()

    // Check for API errors
    if (data['Error Message']) {
      throw new Error(`Alpha Vantage error: ${data['Error Message']}`)
    }

    if (data['Note']) {
      throw new Error(`Rate limit: ${data['Note']}`)
    }

    if (data['Information']) {
      // Premium tier required - this is a graceful failure, not an error
      console.warn('[News Service] NEWS_SENTIMENT requires premium tier, falling back to RSS')
      throw new Error('Premium tier required')
    }

    if (!data.feed || !Array.isArray(data.feed)) {
      throw new Error('Invalid response format from NEWS_SENTIMENT')
    }

    // Parse feed items
    const newsItems: NewsItem[] = data.feed.map((item: any) => ({
      id: item.url || `av-${Date.now()}-${Math.random()}`,
      headline: item.title || '',
      source: item.source || 'Alpha Vantage',
      url: item.url || '#',
      timestamp: parseAVTimestamp(item.time_published),
      summary: item.summary || '',
      sentiment: mapAVSentiment(item.overall_sentiment_label),
      tickers: item.ticker_sentiment?.map((t: any) => t.ticker) || [],
      imageUrl: sanitizeImageUrl(item.banner_image)
    }))

    // Record the API call in budget
    recordNewsCall()

    console.log(`[News Service] Alpha Vantage fetch complete: ${newsItems.length} headlines`)

    return newsItems
  } catch (error) {
    console.error('[News Service] Alpha Vantage fetch failed:', error)
    throw error // Re-throw so caller can handle fallback
  }
}

/**
 * Fetch ticker-specific news from Finnhub API
 * Uses minute-based rate limiting (60 calls/min)
 * @param symbol - Stock symbol (e.g., "AAPL") for company-specific news, or undefined for general market news
 */
export async function fetchNewsFromFinnhub(symbol?: string): Promise<NewsItem[]> {
  try {
    const settings = await getSettings()
    const apiKey = settings.finnhubApiKey

    if (!apiKey) {
      throw new Error('No Finnhub API key configured')
    }

    if (!canUseFinnhub()) {
      throw new Error('Finnhub rate limit reached (60 calls/min)')
    }

    console.log(`[News Service] Fetching from Finnhub${symbol ? ` for ${symbol}` : ' (general news)'}`)

    // Build URL based on whether we want company-specific or general news
    let url: string
    if (symbol) {
      // Company news endpoint - requires date range
      const today = new Date()
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const fromDate = weekAgo.toISOString().split('T')[0]
      const toDate = today.toISOString().split('T')[0]
      url = `${FINNHUB_BASE_URL}/company-news?symbol=${symbol}&from=${fromDate}&to=${toDate}&token=${apiKey}`
    } else {
      // General market news
      url = `${FINNHUB_BASE_URL}/news?category=general&token=${apiKey}`
    }

    // Fetch with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FINNHUB_FETCH_TIMEOUT_MS)

    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('Invalid Finnhub API key')
      }
      if (response.status === 429) {
        throw new Error('Finnhub rate limit exceeded')
      }
      throw new Error(`Finnhub API error: ${response.status}`)
    }

    const data = await response.json()

    // Check for API errors
    if (data.error) {
      throw new Error(`Finnhub error: ${data.error}`)
    }

    if (!Array.isArray(data)) {
      throw new Error('Invalid response format from Finnhub')
    }

    // Record the API call
    recordFinnhubCall()

    // Parse Finnhub news items to our format
    const newsItems: NewsItem[] = data.map((item: any) => ({
      id: `fh-${item.id || Date.now()}-${Math.random().toString(36).slice(2)}`,
      headline: item.headline || '',
      source: item.source || 'Finnhub',
      url: item.url || '#',
      timestamp: item.datetime ? item.datetime * 1000 : Date.now(), // Finnhub uses Unix seconds
      summary: item.summary || '',
      tickers: item.related ? item.related.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      imageUrl: sanitizeImageUrl(item.image)
      // Note: Finnhub doesn't provide sentiment - will be analyzed by FinBERT if needed
    }))

    console.log(`[News Service] Finnhub fetch complete: ${newsItems.length} headlines${symbol ? ` for ${symbol}` : ''}`)

    return newsItems
  } catch (error) {
    console.error('[News Service] Finnhub fetch failed:', error)
    throw error
  }
}

/**
 * Unified news fetcher with intelligent fallback
 * Respects user preference toggle
 */
export async function fetchNews(): Promise<NewsResponse> {
  const settings = await getSettings()
  const useAVForNews = settings.useAlphaVantageForNews || false

  console.log(`[News Service] Fetch strategy: ${useAVForNews ? 'AV Priority' : 'RSS Priority'}`)

  // Strategy 1: Alpha Vantage Priority (toggle ON)
  if (useAVForNews) {
    // Try Alpha Vantage first
    try {
      const articles = await fetchNewsFromAlphaVantage()
      return {
        articles,
        source: 'alpha_vantage',
        hasSentiment: true
      }
    } catch (error) {
      console.warn('[News Service] AV failed, falling back to RSS:', error)
    }

    // Fallback to RSS
    try {
      const articles = await fetchNewsFromRSS()
      return {
        articles,
        source: 'rss',
        hasSentiment: false
      }
    } catch (error) {
      console.error('[News Service] RSS fallback failed:', error)
      return {
        articles: [],
        source: 'empty',
        hasSentiment: false,
        error: String(error)
      }
    }
  }

  // Strategy 2: RSS Priority (toggle OFF - default)
  else {
    // Try RSS first
    try {
      const articles = await fetchNewsFromRSS()
      if (articles.length > 0) {
        return {
          articles,
          source: 'rss',
          hasSentiment: false
        }
      }
      console.warn('[News Service] RSS returned no articles, trying AV fallback')
    } catch (error) {
      console.warn('[News Service] RSS failed, trying AV fallback:', error)
    }

    // Fallback to Alpha Vantage (if budget allows)
    if (canUseAlphaVantageForNews()) {
      try {
        const articles = await fetchNewsFromAlphaVantage()
        return {
          articles,
          source: 'alpha_vantage',
          hasSentiment: true
        }
      } catch (error) {
        console.warn('[News Service] AV fallback failed:', error)
      }
    } else {
      console.warn('[News Service] AV budget exhausted, skipping fallback')
    }

    // Final fallback: empty
    return {
      articles: [],
      source: 'empty',
      hasSentiment: false,
      error: 'All news sources failed'
    }
  }
}

/**
 * Helper: Get watchlist tickers for Alpha Vantage filtering
 */
async function getWatchlistTickers(): Promise<string[]> {
  try {
    const watchlist = await db.watchlist.toArray()
    return watchlist.map(entry => entry.symbol.toUpperCase())
  } catch (error) {
    console.warn('[News Service] Failed to get watchlist tickers:', error)
    return []
  }
}

/**
 * Helper: Parse Alpha Vantage timestamp
 * Format: "20241215T120000"
 */
function parseAVTimestamp(timeStr: string): number {
  if (!timeStr) return Date.now()

  try {
    // Convert "20241215T120000" to "2024-12-15T12:00:00"
    const formatted = timeStr.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')
    const timestamp = new Date(formatted).getTime()
    return isNaN(timestamp) ? Date.now() : timestamp
  } catch {
    return Date.now()
  }
}

/**
 * Helper: Map Alpha Vantage sentiment labels to our type
 */
function mapAVSentiment(label: string): 'positive' | 'negative' | 'neutral' {
  if (!label) return 'neutral'

  const normalized = label.toLowerCase()

  if (normalized.includes('bullish')) return 'positive'
  if (normalized.includes('bearish')) return 'negative'

  return 'neutral'
}
