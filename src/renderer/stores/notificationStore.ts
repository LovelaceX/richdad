import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AIRecommendation } from '../types'

export interface PendingRecommendation extends AIRecommendation {
  dismissedAt: number
  viewed: boolean
}

interface NotificationState {
  pendingRecommendations: PendingRecommendation[]

  // Actions
  addPending: (rec: AIRecommendation) => void
  removePending: (id: string) => void
  markViewed: (id: string) => void
  markAllViewed: () => void
  clearAll: () => void

  // Computed helper
  getUnviewedCount: () => number
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      pendingRecommendations: [],

      addPending: (rec) => {
        set(state => ({
          pendingRecommendations: [
            {
              ...rec,
              dismissedAt: Date.now(),
              viewed: false,
            },
            ...state.pendingRecommendations,
          ].slice(0, 50)  // Keep max 50 pending
        }))
      },

      removePending: (id) => {
        set(state => ({
          pendingRecommendations: state.pendingRecommendations.filter(r => r.id !== id)
        }))
      },

      markViewed: (id) => {
        set(state => ({
          pendingRecommendations: state.pendingRecommendations.map(r =>
            r.id === id ? { ...r, viewed: true } : r
          )
        }))
      },

      markAllViewed: () => {
        set(state => ({
          pendingRecommendations: state.pendingRecommendations.map(r => ({
            ...r,
            viewed: true,
          }))
        }))
      },

      clearAll: () => {
        set({ pendingRecommendations: [] })
      },

      getUnviewedCount: () => {
        return get().pendingRecommendations.filter(r => !r.viewed).length
      },
    }),
    {
      name: 'richdad-notifications',
    }
  )
)
