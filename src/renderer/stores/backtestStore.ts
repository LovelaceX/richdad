/**
 * Backtest Store
 * Manages backtest state using Zustand
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  BacktestConfig,
  BacktestResult,
  BacktestPhase,
  BacktestInsights
} from '../types'
import { runBacktest, estimateAICalls } from '../../services/backtestEngine'
import { analyzeBacktestResults, exportToCSV, generateSummaryText } from '../../services/backtestAnalyzer'
import { generateId } from '../lib/utils'

interface BacktestState {
  // Current backtest state
  isRunning: boolean
  progress: number
  currentPhase: BacktestPhase
  progressMessage: string

  // Abort controller for cancellation
  abortController: AbortController | null

  // Results
  currentResult: BacktestResult | null
  currentInsights: BacktestInsights | null
  savedResults: BacktestResult[]

  // Default config
  defaultConfig: Omit<BacktestConfig, 'id'>

  // Actions
  startBacktest: (config: Omit<BacktestConfig, 'id'>) => Promise<BacktestResult | null>
  cancelBacktest: () => void
  setProgress: (phase: BacktestPhase, progress: number, message: string) => void
  saveResult: (result: BacktestResult) => void
  deleteResult: (id: string) => void
  clearResults: () => void
  loadResult: (id: string) => void
  exportCSV: () => string | null
  exportSummary: () => string | null
  getEstimatedCalls: (config: Omit<BacktestConfig, 'id'>) => number
  updateDefaultConfig: (config: Partial<Omit<BacktestConfig, 'id'>>) => void
}

// Default backtest configuration
const DEFAULT_CONFIG: Omit<BacktestConfig, 'id'> = {
  symbol: 'SPY',
  startDate: Date.now() - (90 * 24 * 60 * 60 * 1000), // 90 days ago
  endDate: Date.now(),
  timeframe: '1d',
  initialCapital: 10000,
  positionSizePercent: 10,
  confidenceThreshold: 70,
  maxConcurrentTrades: 1,
  includeNews: false
}

export const useBacktestStore = create<BacktestState>()(
  persist(
    (set, get) => ({
      // Initial state
      isRunning: false,
      progress: 0,
      currentPhase: 'idle',
      progressMessage: '',
      abortController: null,
      currentResult: null,
      currentInsights: null,
      savedResults: [],
      defaultConfig: DEFAULT_CONFIG,

      // Start a new backtest
      startBacktest: async (config) => {
        const { isRunning } = get()
        if (isRunning) {
          console.warn('[Backtest Store] Already running a backtest')
          return null
        }

        // Create abort controller
        const abortController = new AbortController()

        set({
          isRunning: true,
          progress: 0,
          currentPhase: 'fetching_data',
          progressMessage: 'Starting backtest...',
          abortController,
          currentResult: null,
          currentInsights: null
        })

        try {
          // Create full config with ID
          const fullConfig: BacktestConfig = {
            id: generateId(),
            ...config
          }

          // Run backtest with progress callback
          const result = await runBacktest(
            fullConfig,
            (phase, progress, message) => {
              set({
                currentPhase: phase as BacktestPhase,
                progress,
                progressMessage: message
              })
            },
            abortController.signal
          )

          // Analyze results
          const insights = analyzeBacktestResults(result)

          set({
            isRunning: false,
            progress: 100,
            currentPhase: 'complete',
            progressMessage: 'Backtest complete',
            currentResult: result,
            currentInsights: insights,
            abortController: null
          })

          return result

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          console.error('[Backtest Store] Error:', error)

          set({
            isRunning: false,
            currentPhase: 'error',
            progressMessage: errorMsg,
            abortController: null
          })

          return null
        }
      },

      // Cancel running backtest
      cancelBacktest: () => {
        const { abortController } = get()
        if (abortController) {
          abortController.abort()
        }

        set({
          isRunning: false,
          currentPhase: 'cancelled',
          progressMessage: 'Backtest cancelled',
          abortController: null
        })
      },

      // Update progress (called by engine)
      setProgress: (phase, progress, message) => {
        set({
          currentPhase: phase,
          progress,
          progressMessage: message
        })
      },

      // Save current result to history
      saveResult: (result) => {
        const { savedResults } = get()
        // Keep max 20 saved results
        const updated = [result, ...savedResults].slice(0, 20)
        set({ savedResults: updated })
      },

      // Delete a saved result
      deleteResult: (id) => {
        const { savedResults, currentResult } = get()
        const updated = savedResults.filter(r => r.id !== id)
        set({
          savedResults: updated,
          currentResult: currentResult?.id === id ? null : currentResult
        })
      },

      // Clear all saved results
      clearResults: () => {
        set({
          savedResults: [],
          currentResult: null,
          currentInsights: null
        })
      },

      // Load a saved result
      loadResult: (id) => {
        const { savedResults } = get()
        const result = savedResults.find(r => r.id === id)
        if (result) {
          const insights = analyzeBacktestResults(result)
          set({
            currentResult: result,
            currentInsights: insights,
            currentPhase: 'complete'
          })
        }
      },

      // Export current result to CSV
      exportCSV: () => {
        const { currentResult } = get()
        if (!currentResult) return null
        return exportToCSV(currentResult)
      },

      // Export current result as text summary
      exportSummary: () => {
        const { currentResult } = get()
        if (!currentResult) return null
        return generateSummaryText(currentResult)
      },

      // Get estimated AI calls for a config
      getEstimatedCalls: (config) => {
        const fullConfig: BacktestConfig = {
          id: 'estimate',
          ...config
        }
        return estimateAICalls(fullConfig)
      },

      // Update default config
      updateDefaultConfig: (partialConfig) => {
        const { defaultConfig } = get()
        set({
          defaultConfig: {
            ...defaultConfig,
            ...partialConfig
          }
        })
      }
    }),
    {
      name: 'backtest-storage',
      partialize: (state) => ({
        savedResults: state.savedResults,
        defaultConfig: state.defaultConfig
      })
    }
  )
)

// Selector hooks
export const useBacktestIsRunning = () => useBacktestStore(state => state.isRunning)
export const useBacktestProgress = () => useBacktestStore(state => ({
  progress: state.progress,
  phase: state.currentPhase,
  message: state.progressMessage
}))
export const useBacktestResult = () => useBacktestStore(state => state.currentResult)
export const useBacktestInsights = () => useBacktestStore(state => state.currentInsights)
export const useSavedResults = () => useBacktestStore(state => state.savedResults)
