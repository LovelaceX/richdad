/**
 * News Intelligence Agent
 * Monitors news and surfaces actionable intelligence
 */

import type { NewsItem } from '../../renderer/types'
import type { NewsIntelReport, NewsAlert } from './types'
import { HIGH_IMPACT_KEYWORDS, VELOCITY_SPIKE_THRESHOLD } from './types'

// Track historical article counts for velocity detection
const articleHistory: Map<string, number[]> = new Map()

/**
 * Generate News Intelligence Report from current news
 */
export async function generateNewsIntelReport(
  news: NewsItem[],
  watchlistSymbols: string[]
): Promise<NewsIntelReport> {
  const now = Date.now()
  const oneHourAgo = now - 60 * 60 * 1000

  // Count sentiment
  let bullishCount = 0
  let bearishCount = 0
  let neutralCount = 0

  // Symbol-specific aggregation
  const symbolData: Record<string, {
    bullishCount: number
    bearishCount: number
    neutralCount: number
    headlines: string[]
    recentArticles: number
  }> = {}

  // Initialize symbol data for watchlist
  watchlistSymbols.forEach(symbol => {
    symbolData[symbol] = {
      bullishCount: 0,
      bearishCount: 0,
      neutralCount: 0,
      headlines: [],
      recentArticles: 0
    }
  })

  // Breaking alerts
  const breakingAlerts: NewsAlert[] = []

  // Process each news item
  for (const item of news) {
    // Count overall sentiment
    if (item.sentiment === 'positive') {
      bullishCount++
    } else if (item.sentiment === 'negative') {
      bearishCount++
    } else {
      neutralCount++
    }

    // Find related symbols
    const relatedSymbols = findRelatedSymbols(item, watchlistSymbols)

    // Update symbol data
    for (const symbol of relatedSymbols) {
      if (!symbolData[symbol]) {
        symbolData[symbol] = {
          bullishCount: 0,
          bearishCount: 0,
          neutralCount: 0,
          headlines: [],
          recentArticles: 0
        }
      }

      if (item.sentiment === 'positive') {
        symbolData[symbol].bullishCount++
      } else if (item.sentiment === 'negative') {
        symbolData[symbol].bearishCount++
      } else {
        symbolData[symbol].neutralCount++
      }

      symbolData[symbol].headlines.push(item.headline)

      // Count recent articles (last hour)
      if (item.timestamp > oneHourAgo) {
        symbolData[symbol].recentArticles++
      }
    }

    // Check for breaking news
    if (item.timestamp > oneHourAgo) {
      const impactKeywords = findImpactKeywords(item.headline)

      if (impactKeywords.length > 0) {
        breakingAlerts.push({
          id: item.id,
          headline: item.headline,
          source: item.source,
          timestamp: item.timestamp,
          symbol: relatedSymbols[0],
          sentiment: item.sentiment || 'neutral',
          impactKeywords,
          url: item.url
        })
      }
    }
  }

  // Calculate symbol sentiment
  const symbolSentiment: NewsIntelReport['symbolSentiment'] = {}

  for (const [symbol, data] of Object.entries(symbolData)) {
    const total = data.bullishCount + data.bearishCount + data.neutralCount

    if (total === 0) continue

    let sentiment: 'bullish' | 'bearish' | 'neutral' | 'mixed'

    if (data.bullishCount > data.bearishCount * 1.5) {
      sentiment = 'bullish'
    } else if (data.bearishCount > data.bullishCount * 1.5) {
      sentiment = 'bearish'
    } else if (data.bullishCount > 0 && data.bearishCount > 0) {
      sentiment = 'mixed'
    } else {
      sentiment = 'neutral'
    }

    symbolSentiment[symbol] = {
      sentiment,
      bullishCount: data.bullishCount,
      bearishCount: data.bearishCount,
      neutralCount: data.neutralCount,
      headlines: data.headlines.slice(0, 5) // Top 5 headlines
    }
  }

  // Detect velocity spikes
  const velocitySpikes = detectVelocitySpikes(symbolData)

  // Find top bullish/bearish symbols
  const symbolEntries = Object.entries(symbolSentiment)

  const topBullish = symbolEntries
    .filter(([_, data]) => data.sentiment === 'bullish')
    .sort((a, b) => b[1].bullishCount - a[1].bullishCount)
    .slice(0, 3)
    .map(([symbol]) => symbol)

  const topBearish = symbolEntries
    .filter(([_, data]) => data.sentiment === 'bearish')
    .sort((a, b) => b[1].bearishCount - a[1].bearishCount)
    .slice(0, 3)
    .map(([symbol]) => symbol)

  // Sort breaking alerts by timestamp (newest first)
  breakingAlerts.sort((a, b) => b.timestamp - a.timestamp)

  return {
    timestamp: now,
    bullishCount,
    bearishCount,
    neutralCount,
    totalAnalyzed: news.length,
    breakingAlerts: breakingAlerts.slice(0, 5), // Top 5 breaking
    symbolSentiment,
    velocitySpikes,
    topBullish,
    topBearish
  }
}

/**
 * Find symbols related to a news item
 */
function findRelatedSymbols(item: NewsItem, watchlist: string[]): string[] {
  const related: string[] = []

  // Check explicit tickers
  if (item.ticker && watchlist.includes(item.ticker)) {
    related.push(item.ticker)
  }

  if (item.tickers) {
    for (const ticker of item.tickers) {
      if (watchlist.includes(ticker) && !related.includes(ticker)) {
        related.push(ticker)
      }
    }
  }

  // Check headline for symbol mentions
  const headlineUpper = item.headline.toUpperCase()
  const summaryUpper = item.summary?.toUpperCase() || ''

  for (const symbol of watchlist) {
    if (related.includes(symbol)) continue

    // Look for symbol with word boundaries
    const symbolRegex = new RegExp(`\\b${symbol}\\b`)

    if (symbolRegex.test(headlineUpper) || symbolRegex.test(summaryUpper)) {
      related.push(symbol)
    }
  }

  return related
}

/**
 * Find high-impact keywords in a headline
 */
function findImpactKeywords(headline: string): string[] {
  const headlineLower = headline.toLowerCase()
  const found: string[] = []

  for (const keyword of HIGH_IMPACT_KEYWORDS) {
    if (headlineLower.includes(keyword)) {
      found.push(keyword)
    }
  }

  return found
}

/**
 * Detect velocity spikes (unusual news volume)
 */
function detectVelocitySpikes(
  symbolData: Record<string, { recentArticles: number }>
): NewsIntelReport['velocitySpikes'] {
  const spikes: NewsIntelReport['velocitySpikes'] = []

  for (const [symbol, data] of Object.entries(symbolData)) {
    // Get historical average for this symbol
    const history = articleHistory.get(symbol) || []

    // Calculate average (default to 1 if no history)
    const avgArticles = history.length > 0
      ? history.reduce((sum, n) => sum + n, 0) / history.length
      : 1

    // Update history with current count
    const newHistory = [...history.slice(-11), data.recentArticles] // Keep last 12 readings
    articleHistory.set(symbol, newHistory)

    // Check for spike
    if (data.recentArticles >= VELOCITY_SPIKE_THRESHOLD &&
        data.recentArticles > avgArticles * 2) {
      const percentAboveNormal = ((data.recentArticles - avgArticles) / avgArticles) * 100

      spikes.push({
        symbol,
        articleCount: data.recentArticles,
        normalAverage: Math.round(avgArticles * 10) / 10,
        percentAboveNormal: Math.round(percentAboveNormal)
      })
    }
  }

  // Sort by percent above normal
  spikes.sort((a, b) => b.percentAboveNormal - a.percentAboveNormal)

  return spikes.slice(0, 5) // Top 5 spikes
}

/**
 * Get sentiment summary string
 */
export function getSentimentSummary(report: NewsIntelReport): string {
  const total = report.totalAnalyzed

  if (total === 0) return 'No news analyzed'

  const bullishPct = Math.round((report.bullishCount / total) * 100)
  const bearishPct = Math.round((report.bearishCount / total) * 100)

  if (bullishPct > bearishPct + 20) {
    return `Bullish (${bullishPct}% positive)`
  } else if (bearishPct > bullishPct + 20) {
    return `Bearish (${bearishPct}% negative)`
  } else {
    return `Mixed (${bullishPct}% pos / ${bearishPct}% neg)`
  }
}

/**
 * Check if there are any breaking alerts
 */
export function hasBreakingAlerts(report: NewsIntelReport): boolean {
  return report.breakingAlerts.length > 0
}

/**
 * Get urgency level based on report
 */
export function getUrgencyLevel(report: NewsIntelReport): 'low' | 'medium' | 'high' {
  if (report.breakingAlerts.length > 2 || report.velocitySpikes.length > 2) {
    return 'high'
  }

  if (report.breakingAlerts.length > 0 || report.velocitySpikes.length > 0) {
    return 'medium'
  }

  return 'low'
}
