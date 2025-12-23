import { create } from 'zustand'
import type { EconomicEvent } from '../types'
import { fetchEconomicCalendar } from '../../services/finnhubEconomicCalendar'
import { getSettings } from '../lib/db'

interface EconomicCalendarState {
  events: EconomicEvent[]
  loading: boolean
  error: string | null
  lastUpdated: number
  importanceFilter: 'all' | 'high' | 'medium' | 'low'

  // Actions
  setEvents: (events: EconomicEvent[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setImportanceFilter: (filter: 'all' | 'high' | 'medium' | 'low') => void
  fetchEvents: () => Promise<void>
  getFilteredEvents: () => EconomicEvent[]
  getUpcomingHighImportance: (limit?: number) => EconomicEvent[]
}

export const useEconomicCalendarStore = create<EconomicCalendarState>((set, get) => ({
  events: [],
  loading: false,
  error: null,
  lastUpdated: 0,
  importanceFilter: 'all',

  setEvents: (events) => set({ events, lastUpdated: Date.now(), error: null }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error, loading: false }),

  setImportanceFilter: (importanceFilter) => set({ importanceFilter }),

  fetchEvents: async () => {
    set({ loading: true, error: null })

    try {
      const settings = await getSettings()

      if (!settings.finnhubApiKey) {
        set({
          events: [],
          loading: false,
          error: 'Add Finnhub API key in Settings for economic calendar'
        })
        return
      }

      // Finnhub service gets API key from settings internally
      const events = await fetchEconomicCalendar()

      set({
        events,
        loading: false,
        lastUpdated: Date.now(),
        error: null
      })
    } catch (error) {
      console.error('[EconomicCalendarStore] Fetch failed:', error)
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch calendar'
      })
    }
  },

  getFilteredEvents: () => {
    const { events, importanceFilter } = get()
    if (importanceFilter === 'all') return events
    return events.filter(e => e.importance === importanceFilter)
  },

  getUpcomingHighImportance: (limit = 5) => {
    const { events } = get()
    const now = new Date()
    return events
      .filter(e => e.importance === 'high' && e.date > now)
      .slice(0, limit)
  }
}))

// Helper to get countdown string for an event
function getEventCountdown(eventDate: Date): string {
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

// Helper to format event for ticker display
export function formatEventForTicker(event: EconomicEvent): string {
  const countdown = getEventCountdown(event.date)
  return `${event.event} in ${countdown}`
}
