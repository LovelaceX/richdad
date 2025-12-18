import { create } from 'zustand'
import type { EconomicEvent } from '../types'
import { fetchEconomicCalendar, getEventCountdown } from '../../services/fredService'
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

      if (!settings.fredApiKey) {
        set({
          events: [],
          loading: false,
          error: 'FRED API key not configured'
        })
        return
      }

      const events = await fetchEconomicCalendar(settings.fredApiKey, 30)

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

// Helper to format event for ticker display
export function formatEventForTicker(event: EconomicEvent): string {
  const countdown = getEventCountdown(event.date)
  return `${event.event} in ${countdown}`
}
