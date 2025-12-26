/**
 * News Service
 * RSS-only news architecture
 * - RSS feeds: Native browser parsing, free, unlimited sources
 * - Note: Neither TwelveData nor Polygon include news in their APIs
 */

import { parseRSSFeed } from './rssParser'
import { db } from '../renderer/lib/db'
import type { NewsItem } from '../renderer/types'

const RSS_FETCH_TIMEOUT_MS = 10000 // 10 seconds per feed

export interface NewsResponse {
  articles: NewsItem[]
  source: 'rss' | 'cache' | 'empty'
  hasSentiment: boolean
  error?: string
}

/**
 * Fetch news from RSS feeds (primary source)
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
 * Unified news fetcher
 * All users get RSS feeds (neither TwelveData nor Polygon include news)
 */
export async function fetchNews(): Promise<NewsResponse> {
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

