import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type ThemeId, applyTheme, getSavedTheme } from '../lib/themes'

interface SettingsState {
  cvdMode: boolean
  showVolume: boolean
  refreshInterval: number
  zoomLevel: number
  tickerSpeed: number  // Duration in seconds (60-600)
  theme: ThemeId
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
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      cvdMode: false,
      showVolume: true,
      refreshInterval: 5000,
      zoomLevel: 100,
      tickerSpeed: 180,  // Default 3 minutes
      theme: getSavedTheme(),
      panelSizes: {
        leftPanel: 20,
        rightPanel: 25,
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
    }),
    {
      name: 'richdad-settings',
    }
  )
)
