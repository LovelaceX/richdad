/**
 * Drawing Store
 * Manages chart drawings (horizontal lines, trendlines)
 * Persisted to localStorage for session persistence
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface HorizontalLine {
  id: string
  price: number
  color: string
  label?: string
  symbol: string  // Lines are per-symbol
}

export interface Trendline {
  id: string
  startTime: number
  startPrice: number
  endTime: number
  endPrice: number
  color: string
  symbol: string
}

interface DrawingState {
  horizontalLines: HorizontalLine[]
  trendlines: Trendline[]
  drawingMode: 'horizontal' | 'trendline' | null

  // Actions
  addHorizontalLine: (symbol: string, price: number, color?: string, label?: string) => void
  removeHorizontalLine: (id: string) => void
  addTrendline: (trendline: Omit<Trendline, 'id'>) => void
  removeTrendline: (id: string) => void
  setDrawingMode: (mode: 'horizontal' | 'trendline' | null) => void
  clearDrawings: (symbol: string) => void
  clearAllDrawings: () => void
}

export const useDrawingStore = create<DrawingState>()(
  persist(
    (set) => ({
      horizontalLines: [],
      trendlines: [],
      drawingMode: null,

      addHorizontalLine: (symbol, price, color = '#FFB000', label) =>
        set((state) => ({
          horizontalLines: [...state.horizontalLines, {
            id: `hline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            price: Math.round(price * 100) / 100,  // Round to 2 decimal places
            color,
            label,
            symbol: symbol.toUpperCase()
          }],
          drawingMode: null  // Exit drawing mode after placing
        })),

      removeHorizontalLine: (id) =>
        set((state) => ({
          horizontalLines: state.horizontalLines.filter(l => l.id !== id)
        })),

      addTrendline: (trendline) =>
        set((state) => ({
          trendlines: [...state.trendlines, {
            ...trendline,
            id: `tline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            symbol: trendline.symbol.toUpperCase()
          }],
          drawingMode: null  // Exit drawing mode after placing
        })),

      removeTrendline: (id) =>
        set((state) => ({
          trendlines: state.trendlines.filter(l => l.id !== id)
        })),

      setDrawingMode: (mode) => set({ drawingMode: mode }),

      clearDrawings: (symbol) =>
        set((state) => ({
          horizontalLines: state.horizontalLines.filter(l => l.symbol !== symbol.toUpperCase()),
          trendlines: state.trendlines.filter(l => l.symbol !== symbol.toUpperCase())
        })),

      clearAllDrawings: () =>
        set({
          horizontalLines: [],
          trendlines: []
        })
    }),
    {
      name: 'richdad-drawings',
      version: 1
    }
  )
)

/**
 * Get all drawings for a specific symbol
 */
export function getDrawingsForSymbol(symbol: string) {
  const state = useDrawingStore.getState()
  const upperSymbol = symbol.toUpperCase()
  return {
    horizontalLines: state.horizontalLines.filter(l => l.symbol === upperSymbol),
    trendlines: state.trendlines.filter(l => l.symbol === upperSymbol)
  }
}
