import { create } from 'zustand'

interface AIModalState {
  isOpen: boolean
  unreadCount: number

  // Actions
  openModal: () => void
  closeModal: () => void
  incrementUnread: () => void
  clearUnread: () => void
}

export const useAIModalStore = create<AIModalState>((set) => ({
  isOpen: false,
  unreadCount: 0,

  openModal: () => set({
    isOpen: true,
    unreadCount: 0  // Clear unread when opened
  }),

  closeModal: () => set({
    isOpen: false
  }),

  incrementUnread: () => set((state) => ({
    // Only increment if modal is closed
    unreadCount: state.isOpen ? state.unreadCount : state.unreadCount + 1
  })),

  clearUnread: () => set({
    unreadCount: 0
  }),
}))

// Convenience function for use outside React components
export const openAIModal = () => {
  useAIModalStore.getState().openModal()
}

export const incrementAIUnread = () => {
  useAIModalStore.getState().incrementUnread()
}
