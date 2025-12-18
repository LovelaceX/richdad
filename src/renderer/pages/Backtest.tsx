/**
 * Backtest Page
 * Main page for running and viewing AI Copilot backtests
 */

import { useState, useMemo } from 'react'
import {
  Play,
  Square,
  Download,
  Target,
  AlertTriangle
} from 'lucide-react'
import {
  useBacktestStore,
  useBacktestIsRunning,
  useBacktestProgress,
  useBacktestResult,
  useBacktestInsights
} from '../stores/backtestStore'
import { BacktestConfig } from './BacktestConfig'
import { BacktestResults } from '../components/Backtest/BacktestResults'
import { BacktestTradeTable } from '../components/Backtest/BacktestTradeTable'

export function Backtest() {
  const isRunning = useBacktestIsRunning()
  const { progress, phase, message } = useBacktestProgress()
  const result = useBacktestResult()
  const insights = useBacktestInsights()

  const {
    startBacktest,
    cancelBacktest,
    exportCSV,
    exportSummary,
    defaultConfig,
    getEstimatedCalls,
    saveResult
  } = useBacktestStore()

  const [config, setConfig] = useState(defaultConfig)

  const estimatedCalls = useMemo(() => {
    return getEstimatedCalls(config)
  }, [config, getEstimatedCalls])

  const handleRunBacktest = async () => {
    const result = await startBacktest(config)
    if (result && result.trades.length > 0) {
      // Auto-save successful results
      saveResult(result)
    }
  }

  const handleExportCSV = () => {
    const csv = exportCSV()
    if (csv) {
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backtest_${config.symbol}_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleExportSummary = () => {
    const summary = exportSummary()
    if (summary) {
      const blob = new Blob([summary], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `backtest_summary_${config.symbol}_${new Date().toISOString().split('T')[0]}.txt`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="flex-1 overflow-auto bg-terminal-bg p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Backtest AI Copilot</h1>
            <p className="text-gray-500 text-sm mt-1">
              Test AI trading recommendations against historical data
            </p>
          </div>

          {result && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-terminal-border text-white rounded hover:bg-terminal-border/80 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={handleExportSummary}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-terminal-border text-white rounded hover:bg-terminal-border/80 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export Summary
              </button>
            </div>
          )}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column: Configuration */}
          <div className="lg:col-span-1 space-y-4">
            <BacktestConfig
              config={config}
              onChange={setConfig}
              disabled={isRunning}
            />

            {/* Estimated Cost */}
            <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
              <h3 className="text-sm font-medium text-white mb-3">Estimated Cost</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">AI API Calls:</span>
                  <span className="text-white">{estimatedCalls}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Duration:</span>
                  <span className="text-white">~{Math.ceil(estimatedCalls * 2 / 60)} min</span>
                </div>
              </div>
              {estimatedCalls > 100 && (
                <div className="flex items-start gap-2 mt-3 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-400">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Large number of AI calls. Consider using daily timeframe or shorter date range.</span>
                </div>
              )}
            </div>

            {/* Run Button */}
            <div className="space-y-2">
              {isRunning ? (
                <button
                  onClick={cancelBacktest}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  <Square className="w-5 h-5" />
                  Cancel Backtest
                </button>
              ) : (
                <button
                  onClick={handleRunBacktest}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-terminal-amber text-black rounded-lg font-medium hover:bg-terminal-amber/90 transition-colors"
                >
                  <Play className="w-5 h-5" />
                  Run Backtest
                </button>
              )}

              {/* Progress */}
              {isRunning && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{phase.replace('_', ' ')}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-terminal-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-terminal-amber transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">{message}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-3 space-y-6">
            {result ? (
              <>
                <BacktestResults result={result} insights={insights} />
                <BacktestTradeTable trades={result.trades} />
              </>
            ) : (
              <div className="bg-terminal-panel border border-terminal-border rounded-lg p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-terminal-border/50 flex items-center justify-center">
                  <Target className="w-8 h-8 text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No Results Yet</h3>
                <p className="text-gray-400 text-sm max-w-md mx-auto">
                  Configure your backtest parameters and click "Run Backtest" to evaluate the AI Copilot's historical performance.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Backtest
