import { create } from 'zustand'

export type HelpSection =
  | 'get-started' | 'verify-setup' | 'ollama-setup' | 'whats-new' | 'dashboard' | 'watchlist'
  | 'news' | 'intel-panel' | 'price-alerts'
  | 'chart-guide' | 'ai-copilot' | 'api-limits' | 'shortcuts'
  | 'troubleshooting' | 'faq' | 'terms' | 'privacy'
  | 'security' | 'about' | 'report-issue'

interface HelpState {
  isOpen: boolean
  initialSection?: HelpSection

  // Actions
  openHelp: (section?: HelpSection) => void
  closeHelp: () => void
}

export const useHelpStore = create<HelpState>((set) => ({
  isOpen: false,
  initialSection: undefined,

  openHelp: (section) => set({
    isOpen: true,
    initialSection: section
  }),

  closeHelp: () => set({
    isOpen: false,
    initialSection: undefined
  }),
}))

// Convenience function for use outside React components
export const showHelp = (section?: HelpSection) => {
  useHelpStore.getState().openHelp(section)
}
