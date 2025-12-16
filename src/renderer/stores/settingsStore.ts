import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  cvdMode: boolean
  showVolume: boolean
  refreshInterval: number
  zoomLevel: number
  panelSizes: {
    leftPanel: number    // percentage (default 20)
    rightPanel: number   // percentage (default 25)
    bottomPanel: number  // percentage (default 5)
  }

  // Actions
  toggleCvdMode: () => void
  toggleVolume: () => void
  setRefreshInterval: (interval: number) => void
  setZoomLevel: (level: number) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  setPanelSize: (panel: 'left' | 'right' | 'bottom', size: number) => void
  resetPanelSizes: () => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      cvdMode: false,
      showVolume: true,
      refreshInterval: 5000,
      zoomLevel: 100,
      panelSizes: {
        leftPanel: 20,
        rightPanel: 25,
        bottomPanel: 5,
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

      setZoomLevel: (level) => {
        const validLevels = [90, 100, 110, 125]
        if (!validLevels.includes(level)) return
        set({ zoomLevel: level })
      },

      zoomIn: () => {
        set(state => {
          const levels = [90, 100, 110, 125]
          const currentIndex = levels.indexOf(state.zoomLevel)
          const nextIndex = Math.min(currentIndex + 1, levels.length - 1)
          return { zoomLevel: levels[nextIndex] }
        })
      },

      zoomOut: () => {
        set(state => {
          const levels = [90, 100, 110, 125]
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
    }),
    {
      name: 'richdad-settings',
    }
  )
)
