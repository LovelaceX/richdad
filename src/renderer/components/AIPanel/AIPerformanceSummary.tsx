import { useState, useEffect, useRef } from 'react'
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

/**
 * Simple one-liner showing AI accuracy
 * Hidden when no data, shows "AI accuracy: 71% (5W-2L)" when data exists
 * Full stats available in Settings → Performance Summary
 */
export function AIPerformanceSummary() {
  const [stats, setStats] = useState<PerformanceStats | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true

    const loadStats = async () => {
      try {
        const data = await getAIPerformanceStats(30)
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

  // Hide if no stats loaded
  if (!stats) {
    return null
  }

  // Hide if no data yet (no wins, losses, or pending)
  const hasData = stats.wins + stats.losses + stats.pending > 0
  if (!hasData) {
    return null
  }

  const winRate = Math.round(stats.winRate)

  return (
    <div className="px-4 py-2 border-t border-terminal-border">
      <span className="text-xs text-gray-400">
        AI accuracy: <span className="text-terminal-amber font-medium">{winRate}%</span>
        <span className="text-gray-500 ml-1.5">({stats.wins}W-{stats.losses}L)</span>
      </span>
    </div>
  )
}
