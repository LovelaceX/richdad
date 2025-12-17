import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Trophy, Target } from 'lucide-react'
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

export function AIPerformance() {
  const [stats, setStats] = useState<PerformanceStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()

    // Refresh stats every 5 minutes
    const interval = setInterval(loadStats, 300000)
    return () => clearInterval(interval)
  }, [])

  async function loadStats() {
    try {
      const data = await getAIPerformanceStats(30)  // Last 30 days
      setStats(data)
    } catch (error) {
      console.error('Failed to load AI performance stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="panel h-full">
        <div className="panel-header">
          <Trophy size={14} />
          <span>AI Performance</span>
        </div>
        <div className="p-4 text-center">
          <p className="text-gray-400 text-sm">Loading stats...</p>
        </div>
      </div>
    )
  }

  if (!stats || stats.completed === 0) {
    return (
      <div className="panel h-full">
        <div className="panel-header">
          <Trophy size={14} />
          <span>AI Performance</span>
        </div>
        <div className="p-4 text-center">
          <p className="text-gray-400 text-sm">No completed trades yet</p>
          <p className="text-gray-500 text-xs mt-1">
            Execute AI recommendations to track performance
          </p>
        </div>
      </div>
    )
  }

  const battingAverage = (stats.winRate / 100).toFixed(3)  // 0.687 format
  const record = `${stats.wins}-${stats.losses}${stats.pending > 0 ? `-${stats.pending}` : ''}`

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <Trophy size={14} />
        <span>AI Performance (30d)</span>
      </div>

      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {/* Batting Average - Main Stat */}
        <div className="bg-terminal-bg border border-terminal-border rounded-lg p-3">
          <div className="text-center">
            <p className="text-gray-400 text-xs mb-1">Batting Average</p>
            <p className="text-terminal-amber text-3xl font-bold font-mono">
              {battingAverage}
            </p>
            <p className="text-gray-500 text-xs mt-1">{stats.winRate.toFixed(1)}%</p>
          </div>
        </div>

        {/* Record */}
        <div className="bg-terminal-bg border border-terminal-border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-xs">Record</span>
            <span className="text-white text-xs font-mono">{record}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-semantic-up text-lg font-bold">{stats.wins}</p>
              <p className="text-gray-500 text-xs">W</p>
            </div>
            <div>
              <p className="text-semantic-down text-lg font-bold">{stats.losses}</p>
              <p className="text-gray-500 text-xs">L</p>
            </div>
            {stats.pending > 0 && (
              <div>
                <p className="text-gray-400 text-lg font-bold">{stats.pending}</p>
                <p className="text-gray-500 text-xs">P</p>
              </div>
            )}
          </div>
        </div>

        {/* Average Return */}
        <div className="bg-terminal-bg border border-terminal-border rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {stats.avgProfitLoss >= 0 ? (
                <TrendingUp size={14} className="text-semantic-up" />
              ) : (
                <TrendingDown size={14} className="text-semantic-down" />
              )}
              <span className="text-gray-400 text-xs">Avg Return</span>
            </div>
            <span className={`text-sm font-bold ${stats.avgProfitLoss >= 0 ? 'text-semantic-up' : 'text-semantic-down'}`}>
              {stats.avgProfitLoss >= 0 ? '+' : ''}{stats.avgProfitLoss.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Best/Worst Trades */}
        <div className="bg-terminal-bg border border-terminal-border rounded-lg p-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">Best Trade</span>
              <span className="text-semantic-up text-sm font-bold">
                +{stats.bestTrade.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">Worst Trade</span>
              <span className="text-semantic-down text-sm font-bold">
                {stats.worstTrade.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Best Symbol */}
        {stats.bestSymbol && (
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target size={14} className="text-terminal-amber" />
                <span className="text-gray-400 text-xs">Best Symbol</span>
              </div>
              <div className="text-right">
                <p className="text-terminal-amber text-sm font-bold">{stats.bestSymbol}</p>
                <p className="text-gray-500 text-xs">{stats.bestSymbolWinRate.toFixed(0)}% win rate</p>
              </div>
            </div>
          </div>
        )}

        {/* Avg Hold Time */}
        <div className="bg-terminal-bg border border-terminal-border rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-xs">Avg Hold Time</span>
            <span className="text-white text-sm font-mono">
              {stats.avgDaysHeld.toFixed(1)} days
            </span>
          </div>
        </div>

        {/* Total Recommendations */}
        <div className="text-center mt-2">
          <p className="text-gray-500 text-xs">
            {stats.totalRecommendations} total • {stats.completed} completed
          </p>
        </div>
      </div>
    </div>
  )
}
