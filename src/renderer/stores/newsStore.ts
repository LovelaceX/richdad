import { create } from 'zustand'
import type { NewsItem } from '../types'
import { generateId } from '../lib/utils'

interface NewsState {
  headlines: NewsItem[]
  loading: boolean
  lastUpdated: number | null  // Timestamp of last news update

  // Actions
  addHeadline: (headline: Omit<NewsItem, 'id' | 'timestamp'>) => void
  removeHeadline: (id: string) => void
  setNews: (news: NewsItem[]) => void
  setLoading: (loading: boolean) => void
  refreshNews: () => void
}

export const useNewsStore = create<NewsState>((set) => ({
  headlines: [],  // Empty until real data is fetched from API
  loading: false,
  lastUpdated: null,

  addHeadline: (headline) => {
    set(state => ({
      headlines: [
        {
          ...headline,
          id: generateId(),
          timestamp: Date.now(),
        },
        ...state.headlines.slice(0, 19), // Keep max 20 headlines
      ],
    }))
  },

  removeHeadline: (id) => {
    set(state => ({
      headlines: state.headlines.filter(h => h.id !== id),
    }))
  },

  setNews: (news: NewsItem[]) => {
    set({ headlines: news, lastUpdated: Date.now() })
  },

  setLoading: (loading: boolean) => {
    set({ loading })
  },

  refreshNews: () => {
    // No-op - news refresh is handled by DataHeartbeatService
  },
}))
