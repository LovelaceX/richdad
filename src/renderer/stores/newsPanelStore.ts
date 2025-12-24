import { create } from 'zustand'

interface NewsPanelState {
  isOpen: boolean

  // Actions
  openPanel: () => void
  closePanel: () => void
  togglePanel: () => void
}

export const useNewsPanelStore = create<NewsPanelState>((set) => ({
  isOpen: false,

  openPanel: () => set({ isOpen: true }),
  closePanel: () => set({ isOpen: false }),
  togglePanel: () => set((state) => ({ isOpen: !state.isOpen })),
}))

// Convenience function for use outside React components
export const openNewsPanel = () => {
  useNewsPanelStore.getState().openPanel()
}
