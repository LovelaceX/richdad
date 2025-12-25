import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type ThemeId, applyTheme, getSavedTheme } from '../lib/themes'
import { POLLING_INTERVALS } from '../lib/constants'

interface SettingsState {
  cvdMode: boolean
  showVolume: boolean
  refreshInterval: number
  zoomLevel: number
  tickerSpeed: number  // Duration in seconds per headline (30-120)
  theme: ThemeId
  isLiveDataEnabled: boolean  // Controls whether live data fetching is active
  panelSizes: {
    leftPanel: number    // percentage (default 20)
    rightPanel: number   // percentage (default 25)
    bottomPanel: number  // percentage (default 5)
  }
  panelVisibility: {
    leftPanelVisible: boolean    // Market Watch
    rightPanelVisible: boolean   // AI Copilot
    chartVisible: boolean        // Live Chart
    newsTickerVisible: boolean   // News Ticker
  }

  // Actions
  toggleCvdMode: () => void
  toggleVolume: () => void
  setRefreshInterval: (interval: number) => void
  setZoomLevel: (level: number) => void
  setTickerSpeed: (speed: number) => void
  setTheme: (theme: ThemeId) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  setPanelSize: (panel: 'left' | 'right' | 'bottom', size: number) => void
  resetPanelSizes: () => void
  toggleLeftPanel: () => void
  toggleRightPanel: () => void
  toggleChart: () => void
  toggleNewsTicker: () => void
  toggleLiveData: () => void
  setLiveDataEnabled: (enabled: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      cvdMode: false,
      showVolume: true,
      refreshInterval: POLLING_INTERVALS.free,  // Default to free tier (60s)
      zoomLevel: 100,
      tickerSpeed: 60,  // Default middle speed (60 seconds - readable pace)
      theme: getSavedTheme(),
      isLiveDataEnabled: true,  // Auto-enabled - data flows on app launch
      panelSizes: {
        leftPanel: 15,  // Reduced from 20% to give more space to chart
        rightPanel: 20, // Reduced from 25% to give more space to chart
        bottomPanel: 5,
      },
      panelVisibility: {
        leftPanelVisible: true,
        rightPanelVisible: true,
        chartVisible: true,
        newsTickerVisible: true,
      },

      setTheme: (theme: ThemeId) => {
        applyTheme(theme)
        set({ theme })
      },

      toggleCvdMode: () => {
        set(state => {
          const newCvdMode = !state.cvdMode
          if (newCvdMode) {
            document.body.classList.add('cvd-mode')
          } else {
            document.body.classList.remove('cvd-mode')
          }
          return { cvdMode: newCvdMode }
        })
      },

      toggleVolume: () => {
        set(state => ({ showVolume: !state.showVolume }))
      },

      setRefreshInterval: (interval) => {
        set({ refreshInterval: interval })
      },

      setTickerSpeed: (speed) => {
        set({ tickerSpeed: speed })
      },

      setZoomLevel: (level) => {
        const validLevels = [90, 100, 110, 125, 150]
        if (!validLevels.includes(level)) return
        set({ zoomLevel: level })
      },

      zoomIn: () => {
        set(state => {
          const levels = [90, 100, 110, 125, 150]
          const currentIndex = levels.indexOf(state.zoomLevel)
          const nextIndex = Math.min(currentIndex + 1, levels.length - 1)
          return { zoomLevel: levels[nextIndex] }
        })
      },

      zoomOut: () => {
        set(state => {
          const levels = [90, 100, 110, 125, 150]
          const currentIndex = levels.indexOf(state.zoomLevel)
          const prevIndex = Math.max(currentIndex - 1, 0)
          return { zoomLevel: levels[prevIndex] }
        })
      },

      resetZoom: () => {
        set({ zoomLevel: 100 })
      },

      setPanelSize: (panel, size) => {
        set(state => ({
          panelSizes: {
            ...state.panelSizes,
            [`${panel}Panel`]: size,
          }
        }))
      },

      resetPanelSizes: () => {
        set({
          panelSizes: {
            leftPanel: 20,
            rightPanel: 25,
            bottomPanel: 5,
          }
        })
      },

      toggleLeftPanel: () => {
        set(state => ({
          panelVisibility: {
            ...state.panelVisibility,
            leftPanelVisible: !state.panelVisibility.leftPanelVisible,
          }
        }))
      },

      toggleRightPanel: () => {
        set(state => ({
          panelVisibility: {
            ...state.panelVisibility,
            rightPanelVisible: !state.panelVisibility.rightPanelVisible,
          }
        }))
      },

      toggleChart: () => {
        set(state => ({
          panelVisibility: {
            ...state.panelVisibility,
            chartVisible: !state.panelVisibility.chartVisible,
          }
        }))
      },

      toggleNewsTicker: () => {
        set(state => ({
          panelVisibility: {
            ...state.panelVisibility,
            newsTickerVisible: !state.panelVisibility.newsTickerVisible,
          }
        }))
      },

      toggleLiveData: () => {
        set(state => {
          const newState = !state.isLiveDataEnabled
          // Emit event for data heartbeat service to react
          window.dispatchEvent(new CustomEvent('live-data-toggle', { detail: { enabled: newState } }))
          return { isLiveDataEnabled: newState }
        })
      },

      setLiveDataEnabled: (enabled: boolean) => {
        set({ isLiveDataEnabled: enabled })
        window.dispatchEvent(new CustomEvent('live-data-toggle', { detail: { enabled } }))
      },
    }),
    {
      name: 'richdad-settings',
      version: 3,
      migrate: (persistedState, version) => {
        const state = persistedState as SettingsState
        // Migration v0 -> v1: Fix tickerSpeed if out of old range (10-60)
        if (version === 0) {
          if (state.tickerSpeed === undefined || state.tickerSpeed > 60 || state.tickerSpeed < 10) {
            state.tickerSpeed = 60
            console.log('[Settings] Migrated tickerSpeed to new default (60)')
          }
        }
        // Migration v1 -> v2: Expand tickerSpeed range to 30-120 for better readability
        // Values below 30 should be bumped up, values above 120 should be capped
        if (version <= 1) {
          if (state.tickerSpeed === undefined || state.tickerSpeed < 30) {
            state.tickerSpeed = 60
            console.log('[Settings] Migrated tickerSpeed to readable default (60)')
          } else if (state.tickerSpeed > 120) {
            state.tickerSpeed = 120
            console.log('[Settings] Capped tickerSpeed to max (120)')
          }
        }
        // Migration v2 -> v3: Update refreshInterval from 5s to 60s (free tier default)
        // Old 5s interval was too aggressive and caused rate limit issues
        if (version <= 2) {
          if (state.refreshInterval === undefined || state.refreshInterval < 30000) {
            state.refreshInterval = POLLING_INTERVALS.free  // 60s
            console.log('[Settings] Migrated refreshInterval to 60s (free tier)')
          }
        }
        return state
      },
    }
  )
)

// Listen for plan changes and update polling interval
if (typeof window !== 'undefined') {
  window.addEventListener('plan-changed', (event) => {
    const { pollingInterval } = (event as CustomEvent).detail
    useSettingsStore.getState().setRefreshInterval(pollingInterval)
    console.log(`[Settings] Polling interval updated to: ${pollingInterval}ms`)
  })
}
