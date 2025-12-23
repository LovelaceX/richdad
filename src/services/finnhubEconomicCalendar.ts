/**
 * Finnhub Economic Calendar Service
 *
 * Provides economic calendar data via Finnhub API (same API used for news).
 * Free tier: 60 requests/minute
 *
 * API Docs: https://finnhub.io/docs/api/economic-calendar
 */

import type { EconomicEvent } from '../renderer/types'
import { getSettings } from '../renderer/lib/db'

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1'

// Cache for calendar events
let cachedEvents: EconomicEvent[] = []
let eventCacheTimestamp = 0
const EVENT_CACHE_DURATION_MS = 300000 // 5 minutes

// Map Finnhub impact levels to our importance levels
function mapImpact(impact: string | number): 'low' | 'medium' | 'high' {
  if (impact === 'high' || impact === 3) return 'high'
  if (impact === 'medium' || impact === 2) return 'medium'
  return 'low'
}

/**
 * Fetch upcoming economic calendar events from Finnhub
 */
export async function fetchEconomicCalendar(apiKey?: string): Promise<EconomicEvent[]> {
  // Check cache first
  const now = Date.now()
  if (cachedEvents.length > 0 && now - eventCacheTimestamp < EVENT_CACHE_DURATION_MS) {
    console.log('[Finnhub Calendar] Returning cached events')
    return cachedEvents
  }

  // Get API key from settings if not provided
  let key = apiKey
  if (!key) {
    const settings = await getSettings()
    key = settings.finnhubApiKey
  }

  if (!key) {
    console.warn('[Finnhub Calendar] No API key configured')
    return cachedEvents.length > 0 ? cachedEvents : []
  }

  try {
    // Get date range (today to 7 days from now)
    const today = new Date()
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

    const fromDate = today.toISOString().split('T')[0]
    const toDate = nextWeek.toISOString().split('T')[0]

    const url = `${FINNHUB_BASE_URL}/calendar/economic?from=${fromDate}&to=${toDate}&token=${key}`

    console.log('[Finnhub Calendar] Fetching economic calendar...')
    const response = await fetch(url)

    if (!response.ok) {
      if (response.status === 401) {
        console.error('[Finnhub Calendar] Invalid API key')
        return cachedEvents.length > 0 ? cachedEvents : []
      }
      if (response.status === 429) {
        console.warn('[Finnhub Calendar] Rate limited, using cached data')
        return cachedEvents.length > 0 ? cachedEvents : []
      }
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    // Finnhub returns { economicCalendar: [...] }
    const events = data.economicCalendar || []

    // Transform to our EconomicEvent format
    const transformedEvents: EconomicEvent[] = events.map((event: {
      country: string
      event: string
      time: string
      impact: string | number
      actual?: number | string
      estimate?: number | string
      prev?: number | string
      unit?: string
    }, index: number) => {
      // Parse the time string (format: "2025-01-15 08:30:00" or similar)
      const eventDate = new Date(event.time)
      const timeStr = eventDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/New_York'
      })

      return {
        id: `finnhub-${index}-${event.time}`,
        date: eventDate,
        time: timeStr,
        country: event.country || 'US',
        event: event.event,
        importance: mapImpact(event.impact),
        actual: event.actual != null ? `${event.actual}${event.unit || ''}` : undefined,
        forecast: event.estimate != null ? `${event.estimate}${event.unit || ''}` : undefined,
        previous: event.prev != null ? `${event.prev}${event.unit || ''}` : undefined,
        source: 'Finnhub',
        url: undefined
      }
    })

    // Sort by date
    transformedEvents.sort((a, b) => a.date.getTime() - b.date.getTime())

    // Update cache
    cachedEvents = transformedEvents
    eventCacheTimestamp = now

    console.log(`[Finnhub Calendar] Fetched ${transformedEvents.length} events`)
    return transformedEvents

  } catch (error) {
    console.error('[Finnhub Calendar] Error fetching calendar:', error)
    return cachedEvents.length > 0 ? cachedEvents : []
  }
}

/**
 * Clear the calendar cache (useful for forcing a refresh)
 */
export function clearCalendarCache(): void {
  cachedEvents = []
  eventCacheTimestamp = 0
}

/**
 * Get cached events without making an API call
 */
export function getCachedEvents(): EconomicEvent[] {
  return cachedEvents
}
