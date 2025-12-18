/**
 * Backtest Results Component
 * Displays metrics and insights from a backtest
 */

import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  Award,
  Clock,
  BarChart2,
  Lightbulb
} from 'lucide-react'
import type { BacktestResult, BacktestInsights } from '../../types'

interface BacktestResultsProps {
  result: BacktestResult
  insights: BacktestInsights | null
}

export function BacktestResults({ result, insights }: BacktestResultsProps) {
  const { metrics, config } = result

  // Format percentage with sign
  const formatPercent = (value: number, decimals = 1) => {
    const formatted = value.toFixed(decimals)
    return value >= 0 ? `+${formatted}%` : `${formatted}%`
  }

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Determine if metric is good/bad
  const isGoodWinRate = metrics.winRate >= 50
  const isGoodPF = metrics.profitFactor >= 1.5
  const isGoodReturn = metrics.totalReturnPercent >= 0
  const isLowDrawdown = metrics.maxDrawdownPercent <= 15

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Win Rate */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <Target className="w-4 h-4" />
            Win Rate
          </div>
          <div className={`text-2xl font-bold ${isGoodWinRate ? 'text-green-400' : 'text-red-400'}`}>
            {metrics.winRate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {metrics.winningTrades}W / {metrics.losingTrades}L
          </div>
        </div>

        {/* Profit Factor */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <BarChart2 className="w-4 h-4" />
            Profit Factor
          </div>
          <div className={`text-2xl font-bold ${isGoodPF ? 'text-green-400' : 'text-red-400'}`}>
            {metrics.profitFactor.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {metrics.profitFactor >= 1 ? 'Profitable' : 'Unprofitable'}
          </div>
        </div>

        {/* Total Return */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            {isGoodReturn ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            Total Return
          </div>
          <div className={`text-2xl font-bold ${isGoodReturn ? 'text-green-400' : 'text-red-400'}`}>
            {formatPercent(metrics.totalReturnPercent)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {formatCurrency(metrics.totalReturn)}
          </div>
        </div>

        {/* Max Drawdown */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
            <AlertTriangle className="w-4 h-4" />
            Max Drawdown
          </div>
          <div className={`text-2xl font-bold ${isLowDrawdown ? 'text-green-400' : 'text-amber-400'}`}>
            -{metrics.maxDrawdownPercent.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Largest decline from peak
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Performance Metrics */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-terminal-amber" />
            Performance Metrics
          </h3>
          <div className="space-y-3">
            <MetricRow label="Total Trades" value={metrics.totalTrades.toString()} />
            <MetricRow label="Avg Win" value={formatPercent(metrics.avgWin)} good />
            <MetricRow label="Avg Loss" value={formatPercent(-metrics.avgLoss)} bad />
            <MetricRow label="Sharpe Ratio" value={metrics.sharpeRatio.toFixed(2)} />
            <MetricRow label="Expectancy" value={formatPercent(metrics.expectancy)} good={metrics.expectancy > 0} />
            <MetricRow label="Annualized Return" value={formatPercent(metrics.annualizedReturn)} good={metrics.annualizedReturn > 0} />
          </div>
        </div>

        {/* Trade Statistics */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-terminal-amber" />
            Trade Statistics
          </h3>
          <div className="space-y-3">
            <MetricRow label="Avg Holding Days" value={metrics.avgHoldingDays.toFixed(1)} />
            <MetricRow label="Win Streak" value={metrics.longestWinStreak.toString()} />
            <MetricRow label="Lose Streak" value={metrics.longestLoseStreak.toString()} />
            <MetricRow label="Initial Capital" value={formatCurrency(config.initialCapital)} />
            <MetricRow label="Final Equity" value={formatCurrency(config.initialCapital + metrics.totalReturn)} good={metrics.totalReturn > 0} />
            <MetricRow label="Position Size" value={`${config.positionSizePercent}%`} />
          </div>
        </div>
      </div>

      {/* Insights & Suggestions */}
      {insights && insights.suggestions.length > 0 && (
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-terminal-amber" />
            Optimization Suggestions
          </h3>
          <ul className="space-y-2">
            {insights.suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                <span className="text-terminal-amber mt-0.5">•</span>
                {suggestion}
              </li>
            ))}
          </ul>

          {/* Additional Insights */}
          <div className="mt-4 pt-4 border-t border-terminal-border">
            <div className="grid grid-cols-2 gap-4 text-sm">
              {insights.bestDayOfWeek.count > 0 && (
                <div>
                  <span className="text-gray-400">Best Day:</span>
                  <span className="ml-2 text-white">
                    {insights.bestDayOfWeek.day} ({insights.bestDayOfWeek.winRate.toFixed(0)}% win rate)
                  </span>
                </div>
              )}
              <div>
                <span className="text-gray-400">Optimal Confidence:</span>
                <span className="ml-2 text-white">{insights.optimalConfidenceThreshold}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backtest Info */}
      <div className="flex items-center justify-between text-xs text-gray-500 px-2">
        <span>
          Period: {new Date(config.startDate).toLocaleDateString()} - {new Date(config.endDate).toLocaleDateString()}
        </span>
        <span>
          Completed in {(result.duration / 1000).toFixed(1)}s
        </span>
      </div>
    </div>
  )
}

// Helper component for metric rows
function MetricRow({
  label,
  value,
  good,
  bad
}: {
  label: string
  value: string
  good?: boolean
  bad?: boolean
}) {
  let valueColor = 'text-white'
  if (good === true) valueColor = 'text-green-400'
  if (good === false || bad) valueColor = 'text-red-400'

  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`text-sm font-medium ${valueColor}`}>{value}</span>
    </div>
  )
}
