import { create } from 'zustand'
import type { DetectedPattern } from '../../services/candlestickPatterns'

interface TooltipPosition {
  x: number
  y: number
}

interface PatternState {
  // State
  patterns: DetectedPattern[]
  selectedPattern: DetectedPattern | null
  tooltipPosition: TooltipPosition | null
  showPatterns: boolean
  showNews: boolean

  // Actions
  setPatterns: (patterns: DetectedPattern[]) => void
  selectPattern: (pattern: DetectedPattern | null, position?: TooltipPosition) => void
  clearSelection: () => void
  togglePatterns: () => void
  toggleNews: () => void
  setShowPatterns: (show: boolean) => void
  setShowNews: (show: boolean) => void
}

export const usePatternStore = create<PatternState>((set) => ({
  // Initial state
  patterns: [],
  selectedPattern: null,
  tooltipPosition: null,
  showPatterns: true,  // Pattern markers on by default
  showNews: true,      // News markers on by default

  // Set all detected patterns
  setPatterns: (patterns) => {
    set({ patterns })
  },

  // Select a pattern to show in tooltip
  selectPattern: (pattern, position) => {
    set({
      selectedPattern: pattern,
      tooltipPosition: position ?? null,
    })
  },

  // Clear current selection
  clearSelection: () => {
    set({
      selectedPattern: null,
      tooltipPosition: null,
    })
  },

  // Toggle pattern markers visibility
  togglePatterns: () => {
    set((state) => ({ showPatterns: !state.showPatterns }))
  },

  // Toggle news markers visibility
  toggleNews: () => {
    set((state) => ({ showNews: !state.showNews }))
  },

  // Direct setters for visibility
  setShowPatterns: (show) => {
    set({ showPatterns: show })
  },

  setShowNews: (show) => {
    set({ showNews: show })
  },
}))
