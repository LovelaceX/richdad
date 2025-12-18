/**
 * FRED (Federal Reserve Economic Data) Service
 *
 * Provides US economic calendar data via the free FRED API.
 * Free tier: 120 requests/minute
 *
 * API Docs: https://fred.stlouisfed.org/docs/api/fred/
 */

import type { EconomicEvent } from '../renderer/types'

const FRED_BASE_URL = 'https://api.stlouisfed.org/fred'
const RATE_LIMIT_DELAY_MS = 500 // 120 calls/min = 0.5s between calls to be safe

let lastCallTime = 0

// Cache for calendar events
let cachedEvents: EconomicEvent[] = []
let eventCacheTimestamp = 0
const EVENT_CACHE_DURATION_MS = 300000 // 5 minutes

// Major US economic releases to track (FRED release IDs)
const MAJOR_RELEASES: Record<number, { name: string; importance: 'low' | 'medium' | 'high' }> = {
  // High importance
  50: { name: 'Employment Situation', importance: 'high' },       // Jobs Report
  10: { name: 'Consumer Price Index', importance: 'high' },       // CPI
  53: { name: 'GDP', importance: 'high' },                        // GDP
  101: { name: 'FOMC Statement', importance: 'high' },            // Fed Decision
  // Medium importance
  46: { name: 'Retail Sales', importance: 'medium' },
  13: { name: 'Industrial Production', importance: 'medium' },
  12: { name: 'Producer Price Index', importance: 'medium' },     // PPI
  21: { name: 'Housing Starts', importance: 'medium' },
  86: { name: 'Durable Goods Orders', importance: 'medium' },
  57: { name: 'Consumer Confidence', importance: 'medium' },
  // Low importance
  20: { name: 'Personal Income', importance: 'low' },
  11: { name: 'International Trade', importance: 'low' },
  32: { name: 'Construction Spending', importance: 'low' },
  15: { name: 'Business Inventories', importance: 'low' },
}

/**
 * Rate limit helper - ensures we don't exceed 120 calls/minute
 */
async function respectRateLimit(): Promise<void> {
  const now = Date.now()
  const timeSinceLastCall = now - lastCallTime
  if (timeSinceLastCall < RATE_LIMIT_DELAY_MS) {
    await new Promise(resolve =>
      setTimeout(resolve, RATE_LIMIT_DELAY_MS - timeSinceLastCall)
    )
  }
  lastCallTime = Date.now()
}

/**
 * Fetch upcoming economic calendar events from FRED
 */
export async function fetchEconomicCalendar(
  apiKey: string,
  daysAhead: number = 30
): Promise<EconomicEvent[]> {
  // Check cache first
  const now = Date.now()
  if (cachedEvents.length > 0 && (now - eventCacheTimestamp) < EVENT_CACHE_DURATION_MS) {
    console.log('[FRED] Serving calendar from cache')
    return cachedEvents
  }

  try {
    await respectRateLimit()

    // Get release dates including future dates
    const startDate = new Date().toISOString().split('T')[0]
    const endDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const url = `${FRED_BASE_URL}/releases/dates?api_key=${apiKey}&file_type=json&include_release_dates_with_no_data=true&realtime_start=${startDate}&realtime_end=${endDate}`

    const response = await fetch(url)

    if (!response.ok) {
      console.error(`[FRED] API error: ${response.status}`)
      return cachedEvents.length > 0 ? cachedEvents : []
    }

    const data = await response.json()

    if (data.error_code) {
      console.error(`[FRED] API error: ${data.error_message}`)
      return cachedEvents.length > 0 ? cachedEvents : []
    }

    const events: EconomicEvent[] = []

    if (data.release_dates && Array.isArray(data.release_dates)) {
      for (const release of data.release_dates) {
        const releaseInfo = MAJOR_RELEASES[release.release_id]

        // Only include tracked major releases
        if (releaseInfo) {
          events.push({
            id: `fred-${release.release_id}-${release.date}`,
            date: new Date(release.date),
            time: '08:30', // Most US releases at 8:30 AM ET
            country: 'US',
            event: releaseInfo.name,
            importance: releaseInfo.importance,
            source: 'FRED',
            url: `https://fred.stlouisfed.org/releases/${release.release_id}`
          })
        }
      }
    }

    // Sort by date (soonest first)
    events.sort((a, b) => a.date.getTime() - b.date.getTime())

    // Update cache
    cachedEvents = events
    eventCacheTimestamp = now

    console.log(`[FRED] Fetched ${events.length} upcoming events`)
    return events

  } catch (error) {
    console.error('[FRED] Error fetching calendar:', error)
    return cachedEvents.length > 0 ? cachedEvents : []
  }
}

/**
 * Get countdown string for an event
 */
export function getEventCountdown(eventDate: Date): string {
  const now = new Date()
  const diff = eventDate.getTime() - now.getTime()

  if (diff < 0) return 'Past'

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) {
    return `${days}d ${hours}h`
  } else if (hours > 0) {
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  } else {
    const minutes = Math.floor(diff / (1000 * 60))
    return `${minutes}m`
  }
}

/**
 * Clear the FRED cache
 */
export function clearFredCache(): void {
  cachedEvents = []
  eventCacheTimestamp = 0
  console.log('[FRED] Cache cleared')
}

/**
 * Filter events by importance
 */
export function filterByImportance(
  events: EconomicEvent[],
  importance: 'low' | 'medium' | 'high' | 'all'
): EconomicEvent[] {
  if (importance === 'all') return events
  return events.filter(e => e.importance === importance)
}

/**
 * Get events happening in the next N days
 */
export function getUpcomingEvents(
  events: EconomicEvent[],
  daysAhead: number = 7
): EconomicEvent[] {
  const cutoff = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
  return events.filter(e => e.date <= cutoff)
}
