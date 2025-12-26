/**
 * Tiingo News Service
 * Fetches news from Tiingo News API for Pro users with Power tier
 *
 * Note: Tiingo News API requires Power tier ($10/mo) - NOT included in free Starter tier
 * Falls back to RSS if Tiingo News fails or user doesn't have access
 */

import { fetch } from '@tauri-apps/plugin-http'
import { getSettings } from '../renderer/lib/db'
import type { NewsItem } from '../renderer/types'

const TIINGO_NEWS_BASE_URL = 'https://api.tiingo.com/tiingo/news'
const NEWS_FETCH_TIMEOUT_MS = 10000

export interface TiingoNewsArticle {
  id: number
  publishedDate: string
  title: string
  url: string
  source: string
  tickers: string[]
  tags: string[]
  description: string
  crawlDate: string
}

export interface TiingoNewsResponse {
  articles: NewsItem[]
  source: 'tiingo' | 'error'
  error?: string
}

/**
 * Check if user has Tiingo News enabled and configured
 */
export async function canUseTiingoNews(): Promise<boolean> {
  try {
    const settings = await getSettings()

    // Must be Pro plan
    if (settings.plan !== 'pro') {
      return false
    }

    // Must have Tiingo API key
    if (!settings.tiingoApiKey) {
      return false
    }

    // Must have Tiingo News enabled in settings
    if (!settings.useTiingoNews) {
      return false
    }

    return true
  } catch {
    return false
  }
}

/**
 * Fetch news from Tiingo News API
 * @param tickers - Optional array of ticker symbols to filter news
 * @param limit - Max number of articles to fetch (default 20)
 */
export async function fetchTiingoNews(
  tickers?: string[],
  limit: number = 20
): Promise<TiingoNewsResponse> {
  try {
    const settings = await getSettings()
    const apiKey = settings.tiingoApiKey

    if (!apiKey) {
      return {
        articles: [],
        source: 'error',
        error: 'No Tiingo API key configured'
      }
    }

    // Build query params
    const params = new URLSearchParams({
      token: apiKey,
      limit: limit.toString(),
      sortBy: 'publishedDate'
    })

    // Add tickers filter if provided
    if (tickers && tickers.length > 0) {
      params.append('tickers', tickers.join(','))
    }

    const url = `${TIINGO_NEWS_BASE_URL}?${params.toString()}`

    console.log(`[Tiingo News] Fetching news${tickers ? ` for ${tickers.join(', ')}` : ''}`)

    // Fetch with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), NEWS_FETCH_TIMEOUT_MS)

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      // Check for specific error codes
      if (response.status === 401) {
        return {
          articles: [],
          source: 'error',
          error: 'Invalid API key or News API not included in your Tiingo tier'
        }
      }
      if (response.status === 403) {
        return {
          articles: [],
          source: 'error',
          error: 'Tiingo News API requires Power tier ($10/mo). Upgrade at tiingo.com'
        }
      }
      throw new Error(`HTTP ${response.status}`)
    }

    const data: TiingoNewsArticle[] = await response.json()

    // Convert to NewsItem format
    const articles: NewsItem[] = data.map(article => ({
      id: `tiingo-${article.id}`,
      headline: article.title,
      summary: article.description,
      source: article.source,
      url: article.url,
      timestamp: new Date(article.publishedDate).getTime(),
      tickers: article.tickers,
      sentiment: undefined, // Will be analyzed by sentiment service
      tags: article.tags
    }))

    console.log(`[Tiingo News] Fetched ${articles.length} articles`)

    return {
      articles,
      source: 'tiingo'
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    if (errorMessage.includes('abort')) {
      console.warn('[Tiingo News] Request timed out')
      return {
        articles: [],
        source: 'error',
        error: 'Request timed out'
      }
    }

    console.error('[Tiingo News] Fetch failed:', errorMessage)
    return {
      articles: [],
      source: 'error',
      error: errorMessage
    }
  }
}

/**
 * Test Tiingo News API connection
 * Returns success/failure with message
 */
export async function testTiingoNewsConnection(apiKey: string): Promise<{
  success: boolean
  message: string
}> {
  try {
    const url = `${TIINGO_NEWS_BASE_URL}?token=${apiKey}&limit=1`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (response.status === 401) {
      return {
        success: false,
        message: 'Invalid API key'
      }
    }

    if (response.status === 403) {
      return {
        success: false,
        message: 'News API requires Tiingo Power tier ($10/mo)'
      }
    }

    if (!response.ok) {
      return {
        success: false,
        message: `API error: ${response.status}`
      }
    }

    const data = await response.json()

    return {
      success: true,
      message: `Connected! Found ${Array.isArray(data) ? data.length : 0} recent articles`
    }

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      message: msg.includes('abort') ? 'Connection timed out' : msg
    }
  }
}
