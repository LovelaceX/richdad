/**
 * News Service
 * Hybrid news architecture: Tiingo News API (Pro) + RSS feeds (all users)
 *
 * - Tiingo News: Pro users with Power tier ($10/mo) can enable ticker-specific news
 * - RSS feeds: Free, unlimited sources, works for all users
 * - Automatic fallback: If Tiingo fails, falls back to RSS
 */

import { parseRSSFeed } from './rssParser'
import { db, getSettings } from '../renderer/lib/db'
import { canUseTiingoNews, fetchTiingoNews } from './tiingoNewsService'
import type { NewsItem } from '../renderer/types'

const RSS_FETCH_TIMEOUT_MS = 10000 // 10 seconds per feed

export interface NewsResponse {
  articles: NewsItem[]
  source: 'tiingo' | 'rss' | 'cache' | 'empty'
  hasSentiment: boolean
  error?: string
}

/**
 * Fetch news from RSS feeds
 * Uses native browser DOMParser - zero dependencies
 */
export async function fetchNewsFromRSS(): Promise<NewsItem[]> {
  try {
    // Query proTraders table for enabled RSS feeds
    // (UI writes to proTraders, not newsSources)
    const enabledFeeds = await db.proTraders
      .where('source')
      .equals('rss')
      .and(item => item.enabled === true)
      .toArray()

    // Filter to only those with a valid feedUrl
    const enabledSources = enabledFeeds.filter(feed => feed.feedUrl && feed.feedUrl.trim() !== '')

    if (enabledSources.length === 0) {
      console.warn('[News Service] No enabled RSS sources configured')
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

        const response = await fetch(source.feedUrl!, {
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

        // Attach source priority to each item for tie-breaking in sort
        return items.map(item => ({
          ...item,
          sourcePriority: source.priority ?? 99
        }))
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

    // Sort by timestamp (newest first), with priority as tie-breaker
    allHeadlines.sort((a, b) => {
      // Primary: timestamp (newest first)
      if (b.timestamp !== a.timestamp) {
        return b.timestamp - a.timestamp
      }
      // Tie-breaker: priority (lower number = higher priority)
      const aPriority = a.sourcePriority ?? 99
      const bPriority = b.sourcePriority ?? 99
      return aPriority - bPriority
    })

    console.log(`[News Service] RSS fetch complete: ${allHeadlines.length} unique headlines`)

    return allHeadlines
  } catch (error) {
    console.error('[News Service] RSS fetch failed:', error)
    return []
  }
}

/**
 * Unified news fetcher
 * Tries Tiingo News first (if enabled), falls back to RSS
 */
export async function fetchNews(): Promise<NewsResponse> {
  // Check if user has Tiingo News enabled and configured
  const useTiingo = await canUseTiingoNews()

  if (useTiingo) {
    console.log('[News Service] Fetching news from Tiingo News API')
    try {
      // Get user's watchlist tickers for filtering
      const settings = await getSettings()
      const watchlistTickers = settings.marketOverviewSymbols || []

      const tiingoResult = await fetchTiingoNews(
        watchlistTickers.length > 0 ? watchlistTickers : undefined,
        30 // Fetch up to 30 articles
      )

      if (tiingoResult.source === 'tiingo' && tiingoResult.articles.length > 0) {
        console.log(`[News Service] Tiingo returned ${tiingoResult.articles.length} articles`)
        return {
          articles: tiingoResult.articles,
          source: 'tiingo',
          hasSentiment: false
        }
      }

      // Tiingo failed or returned no articles, log and fall back to RSS
      if (tiingoResult.error) {
        console.warn(`[News Service] Tiingo News failed: ${tiingoResult.error}, falling back to RSS`)
      } else {
        console.warn('[News Service] Tiingo returned no articles, falling back to RSS')
      }
    } catch (error) {
      console.warn('[News Service] Tiingo News error, falling back to RSS:', error)
    }
  }

  // Default: Fetch from RSS
  console.log('[News Service] Fetching news from RSS feeds')
  try {
    const articles = await fetchNewsFromRSS()
    if (articles.length > 0) {
      return {
        articles,
        source: 'rss',
        hasSentiment: false
      }
    }
    console.warn('[News Service] RSS returned no articles')
  } catch (error) {
    console.warn('[News Service] RSS fetch failed:', error)
  }

  // Final fallback: empty
  return {
    articles: [],
    source: 'empty',
    hasSentiment: false,
    error: 'No news sources available'
  }
}
