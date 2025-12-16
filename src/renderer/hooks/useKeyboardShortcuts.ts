import { useEffect } from 'react'
import { useMarketStore } from '../stores/marketStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useNavigationStore } from '../stores/navigationStore'
import type { PageId } from '../types'

export function useKeyboardShortcuts() {
  const setSelectedTicker = useMarketStore(state => state.setSelectedTicker)
  const watchlist = useMarketStore(state => state.watchlist)
  const selectedTicker = useMarketStore(state => state.selectedTicker)
  const toggleCvdMode = useSettingsStore(state => state.toggleCvdMode)
  const setPage = useNavigationStore(state => state.setPage)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K: Focus command input
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        const input = document.querySelector('[data-command-input]') as HTMLInputElement
        input?.focus()
        return
      }

      // Cmd/Ctrl + 1-3: Navigate to pages
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
        const pageMap: Record<string, PageId> = {
          '1': 'dashboard',
          '2': 'news',
          '3': 'settings',
        }
        if (pageMap[e.key]) {
          e.preventDefault()
          setPage(pageMap[e.key])
          return
        }
      }

      // Number keys 1-9: Select watchlist item
      if (e.key >= '1' && e.key <= '9' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT') {
          const index = parseInt(e.key) - 1
          if (watchlist[index]) {
            setSelectedTicker(watchlist[index].symbol)
          }
        }
      }

      // Arrow Up/Down: Navigate watchlist
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const target = e.target as HTMLElement
        if (target.tagName !== 'INPUT') {
          e.preventDefault()
          const currentIndex = watchlist.findIndex(w => w.symbol === selectedTicker)
          let newIndex = currentIndex

          if (e.key === 'ArrowUp' && currentIndex > 0) {
            newIndex = currentIndex - 1
          } else if (e.key === 'ArrowDown' && currentIndex < watchlist.length - 1) {
            newIndex = currentIndex + 1
          }

          if (newIndex !== currentIndex) {
            setSelectedTicker(watchlist[newIndex].symbol)
          }
        }
      }

      // Cmd/Ctrl + Shift + C: Toggle CVD mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault()
        toggleCvdMode()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [watchlist, selectedTicker, setSelectedTicker, toggleCvdMode, setPage])
}
