/**
 * News Filter Service
 *
 * Filters news headlines based on relevance to user's interests:
 * - Symbols in watchlist
 * - Symbols in market watch
 * - Currently viewed chart symbol
 *
 * Limits headlines to configurable amount per hour to avoid overload.
 */

import { getSettings, type ProTrader } from '../renderer/lib/db'
import { db } from '../renderer/lib/db'
import type { NewsItem } from '../renderer/types'

// Track headlines shown in the last hour to enforce limit
let recentHeadlines: { id: string; timestamp: number }[] = []
const ONE_HOUR_MS = 60 * 60 * 1000

/**
 * Get news sources with their priorities
 */
async function getSourcesWithPriority(): Promise<Map<string, number>> {
  const sources = await db.proTraders.toArray()
  const priorityMap = new Map<string, number>()

  for (const source of sources) {
    if (source.enabled) {
      // Map source name to priority (lower number = higher priority)
      priorityMap.set(source.name, source.priority || 99)
    }
  }

  return priorityMap
}

/**
 * Smart blend algorithm - balances priority with recency
 * - 40% guaranteed from Priority 1 sources
 * - Remaining fills by most recent across all sources
 */
function smartBlend(
  headlines: NewsItem[],
  sourcePriorities: Map<string, number>,
  limit: number
): NewsItem[] {
  if (headlines.length === 0 || limit === 0) return []

  // Group headlines by source priority
  const byPriority: Map<number, NewsItem[]> = new Map()

  for (const headline of headlines) {
    const sourceName = headline.source || 'Unknown'
    const priority = sourcePriorities.get(sourceName) || 99

    if (!byPriority.has(priority)) {
      byPriority.set(priority, [])
    }
    byPriority.get(priority)!.push(headline)
  }

  // Sort each priority group by timestamp (newest first)
  for (const group of byPriority.values()) {
    group.sort((a, b) => b.datetime - a.datetime)
  }

  const result: NewsItem[] = []

  // Step 1: Guarantee 40% from Priority 1 sources
  const prio1 = byPriority.get(1) || []
  const minPrio1 = Math.min(Math.ceil(limit * 0.4), prio1.length)
  result.push(...prio1.slice(0, minPrio1))

  // Step 2: Merge remaining headlines by timestamp
  const remaining: NewsItem[] = []

  // Add unused Priority 1 headlines
  remaining.push(...prio1.slice(minPrio1))

  // Add all other priority headlines
  for (const [priority, group] of byPriority.entries()) {
    if (priority !== 1) {
      remaining.push(...group)
    }
  }

  // Sort remaining by timestamp (newest first)
  remaining.sort((a, b) => b.datetime - a.datetime)

  // Step 3: Fill up to limit
  const spotsRemaining = limit - result.length
  result.push(...remaining.slice(0, spotsRemaining))

  console.log(
    `[NewsFilter] Smart blend: ${minPrio1} from Prio1, ${Math.min(spotsRemaining, remaining.length)} from others (total: ${result.length})`
  )

  return result
}

/**
 * Get the user's current focus symbols from various sources
 */
async function getUserFocusSymbols(): Promise<Set<string>> {
  const symbols = new Set<string>()

  try {
    // Get from market store (watchlist and selected market)
    const { useMarketStore } = await import('../renderer/stores/marketStore')
    const marketState = useMarketStore.getState()

    // Add watchlist symbols
    if (marketState.watchlist) {
      for (const item of marketState.watchlist) {
        symbols.add(item.symbol.toUpperCase())
      }
    }

    // Add selected ticker (currently viewing)
    if (marketState.selectedTicker) {
      symbols.add(marketState.selectedTicker.toUpperCase())
    }

    // Add market ETFs being watched
    if (marketState.marketSymbols) {
      for (const symbol of marketState.marketSymbols) {
        symbols.add(symbol.toUpperCase())
      }
    }

    // Get settings for selected market
    const settings = await getSettings()
    if (settings.selectedMarket) {
      symbols.add(settings.selectedMarket.etf.toUpperCase())
      // Also add the index symbol without ^ prefix
      const indexSymbol = settings.selectedMarket.index.replace('^', '')
      symbols.add(indexSymbol.toUpperCase())
    }

    // Add common market symbols that are always relevant
    symbols.add('SPY')
    symbols.add('QQQ')
    symbols.add('DIA')

  } catch (error) {
    console.warn('[NewsFilter] Error getting focus symbols:', error)
    // Return at least the common ones
    return new Set(['SPY', 'QQQ', 'DIA'])
  }

  return symbols
}

/**
 * Calculate relevance score for a headline based on user's focus symbols
 * Higher score = more relevant
 */
function calculateRelevanceScore(headline: NewsItem, focusSymbols: Set<string>): number {
  let score = 0
  const text = `${headline.headline} ${headline.summary || ''}`.toUpperCase()

  // Check if headline mentions any focus symbols
  for (const symbol of focusSymbols) {
    if (text.includes(symbol)) {
      // Direct symbol mention = high relevance
      score += 10

      // Even higher if in headline title specifically
      if (headline.headline.toUpperCase().includes(symbol)) {
        score += 5
      }
    }
  }

  // Check tickers array if available
  if (headline.tickers) {
    for (const ticker of headline.tickers) {
      if (focusSymbols.has(ticker.toUpperCase())) {
        score += 15  // Tagged ticker is very relevant
      }
    }
  }

  // Boost for breaking news or major market moves
  const breakingPatterns = [
    /breaking/i,
    /just in/i,
    /market (surge|crash|plunge|rally)/i,
    /fed (rate|decision|announce)/i,
    /earnings (beat|miss)/i,
    /upgrade|downgrade/i,
    /record high|all-time high/i
  ]

  for (const pattern of breakingPatterns) {
    if (pattern.test(headline.headline)) {
      score += 3
    }
  }

  // Small boost for recency (prefer newer headlines)
  const ageMs = Date.now() - headline.datetime
  const ageHours = ageMs / (60 * 60 * 1000)
  if (ageHours < 1) {
    score += 2  // Very recent
  } else if (ageHours < 4) {
    score += 1  // Somewhat recent
  }

  return score
}

/**
 * Clean up old entries from recent headlines tracking
 */
function cleanupRecentHeadlines(): void {
  const cutoff = Date.now() - ONE_HOUR_MS
  recentHeadlines = recentHeadlines.filter(h => h.timestamp > cutoff)
}

/**
 * Filter and rank news headlines based on user relevance
 *
 * @param headlines - Raw headlines from RSS/API
 * @param options - Filter options
 * @returns Filtered and ranked headlines
 */
export async function filterNewsByRelevance(
  headlines: NewsItem[],
  options: {
    enforceLimit?: boolean  // Whether to enforce hourly limit
    limitOverride?: number  // Override the limit from settings
  } = {}
): Promise<NewsItem[]> {
  if (headlines.length === 0) {
    return []
  }

  // Get user settings
  const settings = await getSettings()
  const aiFilteringEnabled = settings.aiNewsFiltering ?? false
  const hourlyLimit = options.limitOverride ?? settings.headlineLimit ?? 20

  // Get source priorities for smart blend
  const sourcePriorities = await getSourcesWithPriority()

  // Clean up old tracking data
  cleanupRecentHeadlines()

  // Filter out already-shown headlines first
  const seenIds = new Set(recentHeadlines.map(h => h.id))
  const unseenHeadlines = headlines.filter(h => !seenIds.has(h.id))

  // If AI filtering is disabled, use smart blend with source priorities
  if (!aiFilteringEnabled) {
    // Apply limit if enabled
    if (options.enforceLimit !== false) {
      const remaining = Math.max(0, hourlyLimit - recentHeadlines.length)

      // Use smart blend to pick headlines respecting source priority
      const blended = smartBlend(unseenHeadlines, sourcePriorities, remaining)

      // Track these headlines
      for (const h of blended) {
        recentHeadlines.push({ id: h.id, timestamp: Date.now() })
      }

      return blended
    }

    return unseenHeadlines
  }

  // AI filtering is enabled - score by relevance to user's interests
  const focusSymbols = await getUserFocusSymbols()
  console.log(`[NewsFilter] Filtering against ${focusSymbols.size} focus symbols`)

  // Score and rank headlines
  const scoredHeadlines = unseenHeadlines.map(headline => ({
    headline,
    score: calculateRelevanceScore(headline, focusSymbols)
  }))

  // Sort by score (highest first)
  scoredHeadlines.sort((a, b) => b.score - a.score)

  // Extract sorted headlines
  const rankedHeadlines = scoredHeadlines.map(s => s.headline)

  // Apply hourly limit if enforcing
  if (options.enforceLimit !== false) {
    const remaining = Math.max(0, hourlyLimit - recentHeadlines.length)

    // Use smart blend on the ranked headlines (preserves relevance order but ensures source diversity)
    const blended = smartBlend(rankedHeadlines.slice(0, remaining * 2), sourcePriorities, remaining)

    // Track these headlines
    for (const h of blended) {
      recentHeadlines.push({ id: h.id, timestamp: Date.now() })
    }

    console.log(`[NewsFilter] Returning ${blended.length} headlines (${remaining} remaining in hour limit)`)
    return blended
  }

  return rankedHeadlines
}

/**
 * Check if a single headline is relevant to user's interests
 * Useful for real-time filtering of incoming headlines
 */
export async function isHeadlineRelevant(headline: NewsItem): Promise<boolean> {
  const focusSymbols = await getUserFocusSymbols()
  const score = calculateRelevanceScore(headline, focusSymbols)
  return score > 0
}

/**
 * Get current stats about the filter
 */
export function getFilterStats(): {
  headlinesThisHour: number
  hourlyLimit: number
} {
  cleanupRecentHeadlines()
  return {
    headlinesThisHour: recentHeadlines.length,
    hourlyLimit: 20  // Default, actual comes from settings
  }
}

/**
 * Reset the hourly tracking (for testing or manual reset)
 */
export function resetHourlyTracking(): void {
  recentHeadlines = []
  console.log('[NewsFilter] Hourly tracking reset')
}
