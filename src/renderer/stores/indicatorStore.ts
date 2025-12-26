/**
 * Indicator Store
 * Manages technical indicator panels (MACD)
 * Persisted to localStorage for session persistence
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type IndicatorType = 'macd'

export interface IndicatorConfig {
  id: string
  type: IndicatorType
  visible: boolean
  height: number  // Panel height in pixels
  settings: {
    // MACD settings
    fastPeriod?: number    // default 12
    slowPeriod?: number    // default 26
    signalPeriod?: number  // default 9
  }
}

interface IndicatorState {
  indicators: IndicatorConfig[]

  // Actions
  toggleIndicator: (type: IndicatorType) => void
  setIndicatorHeight: (id: string, height: number) => void
  updateIndicatorSettings: (id: string, settings: Partial<IndicatorConfig['settings']>) => void
  removeIndicator: (id: string) => void
  reorderIndicators: (fromIndex: number, toIndex: number) => void
  isIndicatorVisible: (type: IndicatorType) => boolean
}

const DEFAULT_INDICATOR_HEIGHT = 120

const DEFAULT_MACD_SETTINGS = {
  fastPeriod: 12,
  slowPeriod: 26,
  signalPeriod: 9
}


export const useIndicatorStore = create<IndicatorState>()(
  persist(
    (set, get) => ({
      indicators: [],

      toggleIndicator: (type) =>
        set((state) => {
          const existingIndex = state.indicators.findIndex(i => i.type === type)

          if (existingIndex >= 0) {
            // Toggle visibility if exists
            const updated = [...state.indicators]
            updated[existingIndex] = {
              ...updated[existingIndex],
              visible: !updated[existingIndex].visible
            }
            return { indicators: updated }
          } else {
            // Add new indicator
            const newIndicator: IndicatorConfig = {
              id: `${type}-${Date.now()}`,
              type,
              visible: true,
              height: DEFAULT_INDICATOR_HEIGHT,
              settings: DEFAULT_MACD_SETTINGS
            }
            return { indicators: [...state.indicators, newIndicator] }
          }
        }),

      setIndicatorHeight: (id, height) =>
        set((state) => ({
          indicators: state.indicators.map(i =>
            i.id === id ? { ...i, height: Math.max(80, Math.min(200, height)) } : i
          )
        })),

      updateIndicatorSettings: (id, settings) =>
        set((state) => ({
          indicators: state.indicators.map(i =>
            i.id === id ? { ...i, settings: { ...i.settings, ...settings } } : i
          )
        })),

      removeIndicator: (id) =>
        set((state) => ({
          indicators: state.indicators.filter(i => i.id !== id)
        })),

      reorderIndicators: (fromIndex, toIndex) =>
        set((state) => {
          const updated = [...state.indicators]
          const [removed] = updated.splice(fromIndex, 1)
          updated.splice(toIndex, 0, removed)
          return { indicators: updated }
        }),

      isIndicatorVisible: (type) => {
        const state = get()
        const indicator = state.indicators.find(i => i.type === type)
        return indicator?.visible ?? false
      }
    }),
    {
      name: 'richdad-indicators',
      version: 1
    }
  )
)

/**
 * Get visible indicators in display order
 */
export function getVisibleIndicators(): IndicatorConfig[] {
  const state = useIndicatorStore.getState()
  return state.indicators.filter(i => i.visible)
}

/**
 * Get indicator config by type
 */
export function getIndicatorConfig(type: IndicatorType): IndicatorConfig | undefined {
  const state = useIndicatorStore.getState()
  return state.indicators.find(i => i.type === type)
}
