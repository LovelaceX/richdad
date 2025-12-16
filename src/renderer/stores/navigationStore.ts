import { create } from 'zustand'
import type { PageId } from '../types'

interface NavigationState {
  currentPage: PageId
  previousPage: PageId | null

  // Actions
  setPage: (page: PageId) => void
  goBack: () => void
}

export const useNavigationStore = create<NavigationState>((set, get) => ({
  currentPage: 'dashboard',
  previousPage: null,

  setPage: (page: PageId) => {
    const current = get().currentPage
    if (current !== page) {
      set({ currentPage: page, previousPage: current })
    }
  },

  goBack: () => {
    const previous = get().previousPage
    if (previous) {
      set({ currentPage: previous, previousPage: null })
    }
  },
}))
