/**
 * Backtest Page
 * Main page for running and viewing AI Copilot backtests
 * Requires Pro plan (Tiingo Power tier) to access
 */

import { useState, useMemo, useEffect } from 'react'
import {
  Play,
  Square,
  Download,
  Target,
  AlertTriangle,
  Lock,
  Settings,
  HelpCircle
} from 'lucide-react'
import { getSettings } from '../lib/db'
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
  const [currentPlan, setCurrentPlan] = useState<'free' | 'pro'>('free')
  const [planLoading, setPlanLoading] = useState(true)

  // Check user's plan on mount
  useEffect(() => {
    getSettings().then(settings => {
      setCurrentPlan(settings.plan || 'free')
      setPlanLoading(false)
    })
  }, [])

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

  // Show loading state while checking plan
  if (planLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-terminal-bg">
        <div className="animate-spin w-6 h-6 border-2 border-terminal-amber border-t-transparent rounded-full" />
      </div>
    )
  }

  // Show lock screen for free plan users
  if (currentPlan !== 'pro') {
    return (
      <div className="flex-1 overflow-auto bg-terminal-bg p-4">
        <div className="max-w-2xl mx-auto text-center py-20">
          {/* Lock Icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-terminal-border/50 flex items-center justify-center">
            <Lock className="w-10 h-10 text-gray-500" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-3">
            Backtesting Requires Pro Plan
          </h2>

          {/* Description */}
          <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto leading-relaxed">
            Backtesting uses <span className="text-terminal-amber">Tiingo</span> historical market data API
            to simulate AI trading recommendations against past price movements.
          </p>

          {/* Requirements Box */}
          <div className="bg-terminal-panel border border-terminal-border rounded-lg p-5 mb-6 max-w-md mx-auto text-left">
            <h3 className="text-white text-sm font-medium mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-terminal-amber" />
              How to Enable Backtesting
            </h3>
            <ol className="text-gray-400 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-terminal-amber font-mono">1.</span>
                <span>Get a Tiingo API key (free signup at tiingo.com)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-terminal-amber font-mono">2.</span>
                <span>Go to Settings → Market Data and enter your Tiingo API key</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-terminal-amber font-mono">3.</span>
                <span>Switch your plan from Free to Pro for higher rate limits</span>
              </li>
            </ol>
          </div>

          {/* CTA Button */}
          <a
            href="#/settings"
            className="inline-flex items-center gap-2 px-6 py-3 bg-terminal-amber text-black font-medium rounded-lg hover:bg-terminal-amber/90 transition-colors"
          >
            <Settings className="w-5 h-5" />
            Go to Settings
          </a>

          {/* Footer Note */}
          <p className="text-gray-500 text-xs mt-8 max-w-sm mx-auto">
            Tiingo offers free Starter tier (50 tickers/hour) and Power tier ($10/month)
            for 5,000 tickers/hour with 30+ years of historical data.
          </p>
        </div>
      </div>
    )
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
