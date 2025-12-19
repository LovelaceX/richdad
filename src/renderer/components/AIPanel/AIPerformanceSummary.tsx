import { useState, useEffect, useRef } from 'react'
import { ChevronDown, ChevronUp, BarChart3 } from 'lucide-react'
import { getAIPerformanceStats } from '../../lib/db'

interface PerformanceStats {
  totalRecommendations: number
  completed: number
  pending: number
  wins: number
  losses: number
  neutral: number
  winRate: number
  avgProfitLoss: number
  bestTrade: number
  worstTrade: number
  avgDaysHeld: number
  bestSymbol: string
  bestSymbolWinRate: number
}

export function AIPerformanceSummary() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [stats, setStats] = useState<PerformanceStats | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true

    const loadStats = async () => {
      try {
        const data = await getAIPerformanceStats(30)
        // Only update state if component is still mounted
        if (isMountedRef.current) {
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to load performance stats:', error)
      }
    }

    loadStats()
    // Refresh every 5 minutes
    const interval = setInterval(loadStats, 5 * 60 * 1000)

    return () => {
      isMountedRef.current = false
      clearInterval(interval)
    }
  }, [])

  if (!stats) {
    return null
  }

  const battingAvg = (stats.winRate / 100).toFixed(3)
  const hasData = stats.wins + stats.losses + stats.pending > 0

  if (!hasData) {
    return (
      <div className="border-t border-terminal-border px-3 py-2">
        <div className="flex items-center gap-2 text-gray-500 text-xs">
          <BarChart3 size={12} />
          <span>No performance data yet</span>
        </div>
      </div>
    )
  }

  return (
    <div className="border-t border-terminal-border">
      {/* Compact Stats Bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-terminal-border/30 transition-colors"
      >
        <div className="flex items-center gap-3 text-xs">
          <BarChart3 size={12} className="text-terminal-amber" />
          <span className="text-gray-300 font-mono">
            {stats.wins}W-{stats.losses}L-{stats.pending}P
          </span>
          <span className="text-gray-500">•</span>
          <span className="text-terminal-amber font-mono">{battingAvg}</span>
          <span className="text-gray-500">•</span>
          <span className={`font-mono ${stats.avgProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {stats.avgProfitLoss >= 0 ? '+' : ''}{stats.avgProfitLoss.toFixed(2)}%
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp size={14} className="text-gray-500" />
        ) : (
          <ChevronDown size={14} className="text-gray-500" />
        )}
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Record</span>
              <span className="text-gray-300 font-mono">{stats.wins}W - {stats.losses}L - {stats.pending}P</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Batting Avg</span>
              <span className="text-terminal-amber font-mono">{battingAvg} ({stats.winRate.toFixed(1)}%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Avg Return</span>
              <span className={`font-mono ${stats.avgProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.avgProfitLoss >= 0 ? '+' : ''}{stats.avgProfitLoss.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Trades</span>
              <span className="text-gray-300 font-mono">{stats.wins + stats.losses + stats.pending}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Best Trade</span>
              <span className="text-green-400 font-mono">+{stats.bestTrade.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Worst Trade</span>
              <span className="text-red-400 font-mono">{stats.worstTrade.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Avg Hold</span>
              <span className="text-gray-300 font-mono">{stats.avgDaysHeld.toFixed(1)} days</span>
            </div>
            {stats.bestSymbol && (
              <div className="flex justify-between">
                <span className="text-gray-500">Best Symbol</span>
                <span className="text-terminal-amber font-mono">{stats.bestSymbol} ({stats.bestSymbolWinRate.toFixed(0)}%)</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
