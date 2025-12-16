import { create } from 'zustand'
import type { NewsItem } from '../types'
import { MOCK_NEWS } from '../lib/mockData'
import { generateId } from '../lib/utils'

interface NewsState {
  headlines: NewsItem[]
  loading: boolean

  // Actions
  addHeadline: (headline: Omit<NewsItem, 'id' | 'timestamp'>) => void
  removeHeadline: (id: string) => void
  setNews: (news: NewsItem[]) => void
  setLoading: (loading: boolean) => void
  refreshNews: () => void
}

export const useNewsStore = create<NewsState>((set) => ({
  headlines: MOCK_NEWS,
  loading: false,

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
    set({ headlines: news })
  },

  setLoading: (loading: boolean) => {
    set({ loading })
  },

  refreshNews: () => {
    // In real app, this would fetch from API
    set({ headlines: MOCK_NEWS })
  },
}))
