import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import { getAIPerformanceStats } from '../../lib/db'
import { MarketStatusIndicator } from '../Chart/MarketStatusIndicator'

export function MarketOverview() {
  const [aiWinRate, setAiWinRate] = useState<{ winRate: number; record: string } | null>(null)

  // Load AI performance
  useEffect(() => {
    async function loadAIPerformance() {
      try {
        const stats = await getAIPerformanceStats(30)
        if (stats.completed > 0) {
          setAiWinRate({
            winRate: stats.winRate,
            record: `${stats.wins}-${stats.losses}`
          })
        }
      } catch (error) {
        console.error('Failed to load AI performance:', error)
      }
    }

    loadAIPerformance()
    // Refresh every 5 minutes
    const interval = setInterval(loadAIPerformance, 300000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="h-8 bg-terminal-panel border-b border-terminal-border flex items-center px-4 gap-6">
      {/* AI Performance Badge */}
      {aiWinRate && (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Trophy className="w-3 h-3 text-terminal-amber" />
          <span className="text-gray-400 text-xs">AI</span>
          <span className={`text-xs font-mono font-medium ${aiWinRate.winRate >= 50 ? 'text-terminal-up' : 'text-terminal-down'}`}>
            {aiWinRate.winRate.toFixed(0)}%
          </span>
          <span className="text-gray-500 text-xs">({aiWinRate.record})</span>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Market Status - uses shared component with proper timezone handling */}
      <MarketStatusIndicator />
    </div>
  )
}
