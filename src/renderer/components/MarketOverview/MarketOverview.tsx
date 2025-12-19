import { useEffect, useState } from 'react'
import { Clock, Trophy } from 'lucide-react'
import { getAIPerformanceStats } from '../../lib/db'

function getMarketStatus(): { isOpen: boolean; status: string } {
  const now = new Date()
  const day = now.getDay()
  const hour = now.getHours()
  const minute = now.getMinutes()
  const time = hour * 100 + minute

  // Market hours: 9:30 AM - 4:00 PM ET, Mon-Fri
  // This is simplified and doesn't account for holidays
  const isWeekday = day >= 1 && day <= 5
  const isMarketHours = time >= 930 && time < 1600

  if (!isWeekday) {
    return { isOpen: false, status: 'WEEKEND' }
  }

  if (time < 930) {
    return { isOpen: false, status: 'PRE-MARKET' }
  }

  if (time >= 1600 && time < 2000) {
    return { isOpen: false, status: 'AFTER-HOURS' }
  }

  if (isMarketHours) {
    return { isOpen: true, status: 'MARKET OPEN' }
  }

  return { isOpen: false, status: 'CLOSED' }
}

export function MarketOverview() {
  const [marketStatus, setMarketStatus] = useState(getMarketStatus())
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

  // Update market status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketStatus(getMarketStatus())
    }, 60000) // Check every minute

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

      {/* Market Status */}
      <div className="flex items-center gap-2">
        <Clock className="w-3 h-3 text-gray-500" />
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${marketStatus.isOpen ? 'bg-terminal-up animate-pulse' : 'bg-gray-500'}`} />
          <span className={`text-xs font-medium ${marketStatus.isOpen ? 'text-terminal-up' : 'text-gray-500'}`}>
            {marketStatus.status}
          </span>
        </div>
      </div>
    </div>
  )
}
