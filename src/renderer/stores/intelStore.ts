/**
 * Intel Store
 * State management for Intelligence Agents
 */

import { create } from 'zustand'
import type { NewsIntelReport, NewsAlert, PatternScanReport, PatternSetup } from '../../services/agents/types'

interface IntelState {
  // News Intel
  newsIntel: NewsIntelReport | null
  lastNewsIntelUpdate: number | null
  newsIntelLoading: boolean

  // Pattern Scanner
  patternScan: PatternScanReport | null
  lastPatternScanUpdate: number | null
  patternScanLoading: boolean

  // Breaking alerts that haven't been dismissed
  activeBreakingAlerts: NewsAlert[]

  // UI state
  intelPanelExpanded: boolean
  intelPanelEnabled: boolean
  activeIntelTab: 'news' | 'patterns'

  // Actions
  setNewsIntel: (report: NewsIntelReport) => void
  setNewsIntelLoading: (loading: boolean) => void
  setPatternScan: (report: PatternScanReport) => void
  setPatternScanLoading: (loading: boolean) => void
  dismissBreakingAlert: (alertId: string) => void
  clearBreakingAlerts: () => void
  toggleIntelPanel: () => void
  setIntelPanelEnabled: (enabled: boolean) => void
  setActiveIntelTab: (tab: 'news' | 'patterns') => void
}

export const useIntelStore = create<IntelState>((set, get) => ({
  // Initial state - News Intel
  newsIntel: null,
  lastNewsIntelUpdate: null,
  newsIntelLoading: false,
  activeBreakingAlerts: [],
  intelPanelExpanded: true,
  intelPanelEnabled: true,

  // Initial state - Pattern Scanner
  patternScan: null,
  lastPatternScanUpdate: null,
  patternScanLoading: false,
  activeIntelTab: 'news',

  // Actions
  setNewsIntel: (report: NewsIntelReport) => {
    const currentAlerts = get().activeBreakingAlerts
    const currentAlertIds = new Set(currentAlerts.map(a => a.id))

    // Find new breaking alerts (not already in active list)
    const newAlerts = report.breakingAlerts.filter(
      alert => !currentAlertIds.has(alert.id)
    )

    set({
      newsIntel: report,
      lastNewsIntelUpdate: Date.now(),
      newsIntelLoading: false,
      // Add new alerts to active list
      activeBreakingAlerts: [...newAlerts, ...currentAlerts].slice(0, 10) // Keep max 10
    })
  },

  setNewsIntelLoading: (loading: boolean) => {
    set({ newsIntelLoading: loading })
  },

  setPatternScan: (report: PatternScanReport) => {
    set({
      patternScan: report,
      lastPatternScanUpdate: Date.now(),
      patternScanLoading: false
    })
  },

  setPatternScanLoading: (loading: boolean) => {
    set({ patternScanLoading: loading })
  },

  setActiveIntelTab: (tab: 'news' | 'patterns') => {
    set({ activeIntelTab: tab })
  },

  dismissBreakingAlert: (alertId: string) => {
    set(state => ({
      activeBreakingAlerts: state.activeBreakingAlerts.filter(a => a.id !== alertId)
    }))
  },

  clearBreakingAlerts: () => {
    set({ activeBreakingAlerts: [] })
  },

  toggleIntelPanel: () => {
    set(state => ({ intelPanelExpanded: !state.intelPanelExpanded }))
  },

  setIntelPanelEnabled: (enabled: boolean) => {
    set({ intelPanelEnabled: enabled })
  }
}))

// Selectors
export const selectSentimentRatio = (state: IntelState) => {
  if (!state.newsIntel) return null

  const { bullishCount, bearishCount, neutralCount } = state.newsIntel
  const total = bullishCount + bearishCount + neutralCount

  if (total === 0) return null

  return {
    bullish: Math.round((bullishCount / total) * 100),
    bearish: Math.round((bearishCount / total) * 100),
    neutral: Math.round((neutralCount / total) * 100)
  }
}

export const selectSymbolSentiment = (symbol: string) => (state: IntelState) => {
  if (!state.newsIntel?.symbolSentiment) return null
  return state.newsIntel.symbolSentiment[symbol] || null
}

export const selectHasBreakingAlerts = (state: IntelState) => {
  return state.activeBreakingAlerts.length > 0
}

export const selectUrgencyLevel = (state: IntelState): 'low' | 'medium' | 'high' => {
  if (!state.newsIntel) return 'low'

  const alertCount = state.activeBreakingAlerts.length
  const spikeCount = state.newsIntel.velocitySpikes.length

  if (alertCount > 2 || spikeCount > 2) return 'high'
  if (alertCount > 0 || spikeCount > 0) return 'medium'
  return 'low'
}

// Pattern Scanner Selectors
export const selectTopBullishSetups = (state: IntelState): PatternSetup[] => {
  return state.patternScan?.topBullishSetups || []
}

export const selectTopBearishSetups = (state: IntelState): PatternSetup[] => {
  return state.patternScan?.topBearishSetups || []
}

export const selectPatternSummary = (state: IntelState) => {
  if (!state.patternScan) return null
  return state.patternScan.summary
}

export const selectSetupsForSymbol = (symbol: string) => (state: IntelState): PatternSetup[] => {
  if (!state.patternScan) return []
  return state.patternScan.setupsFound.filter(s => s.symbol === symbol)
}

export const selectHighReliabilitySetups = (state: IntelState): PatternSetup[] => {
  if (!state.patternScan) return []
  return state.patternScan.setupsFound.filter(s => s.reliability === 'High')
}

export const selectHasPatternAlerts = (state: IntelState): boolean => {
  if (!state.patternScan) return false
  return state.patternScan.setupsFound.some(s => s.reliability === 'High' && s.regimeAligned)
}
