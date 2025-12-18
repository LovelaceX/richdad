import { useState, useEffect } from 'react'
import { BarChart3 } from 'lucide-react'
import { getBudgetStatus } from '../../../services/apiBudgetTracker'
import { getSettings } from '../../lib/db'

interface TwelveDataUsage {
  used: number
  limit: number
  remaining: number
}

export function APIBudgetMeter() {
  const [budget, setBudget] = useState<any>(null)
  const [twelveDataUsage, setTwelveDataUsage] = useState<TwelveDataUsage | null>(null)

  useEffect(() => {
    const updateBudget = () => {
      const status = getBudgetStatus()
      setBudget(status)
    }

    updateBudget()
    const interval = setInterval(updateBudget, 30000)
    return () => clearInterval(interval)
  }, [])

  // Fetch TwelveData usage
  useEffect(() => {
    const fetchTwelveDataUsage = async () => {
      try {
        const settings = await getSettings()
        if (settings?.twelvedataApiKey) {
          const { getTwelveDataUsage } = await import('../../../services/twelveDataService')
          const usage = await getTwelveDataUsage(settings.twelvedataApiKey)
          if (usage) {
            setTwelveDataUsage({
              used: usage.dailyUsage,
              limit: usage.dailyLimit,
              remaining: usage.remaining
            })
          }
        }
      } catch (error) {
        console.error('[APIBudgetMeter] Failed to fetch TwelveData usage:', error)
      }
    }

    fetchTwelveDataUsage()
    const interval = setInterval(fetchTwelveDataUsage, 60000) // Every minute
    return () => clearInterval(interval)
  }, [])

  if (!budget) return null

  const totalUsed = budget.marketCallsUsed + budget.chartCallsUsed + budget.newsCallsUsed
  const totalPercent = (totalUsed / 25) * 100

  const getColor = (percent: number) => {
    if (percent >= 100) return 'bg-red-500'
    if (percent >= 80) return 'bg-yellow-500'
    if (percent >= 50) return 'bg-yellow-600'
    return 'bg-terminal-amber'
  }

  return (
    <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 size={16} className="text-gray-400" />
        <span className="text-white text-sm">API Budget Status</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-terminal-bg rounded-full overflow-hidden mb-3">
        <div
          className={`h-full transition-all ${getColor(totalPercent)}`}
          style={{ width: `${Math.min(100, totalPercent)}%` }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 text-xs">
        <div>
          <div className="text-gray-400">Market Data</div>
          <div className="text-white font-mono">{budget.marketCallsUsed}/23</div>
        </div>
        <div>
          <div className="text-gray-400">Charts</div>
          <div className="text-white font-mono">{budget.chartCallsUsed}/1</div>
        </div>
        <div>
          <div className="text-gray-400">News</div>
          <div className="text-white font-mono">{budget.newsCallsUsed}/1</div>
        </div>
      </div>

      <div className="text-xs text-gray-400 mt-3">
        Resets at: {new Date(budget.resetsAt).toLocaleTimeString()}
      </div>

      {/* TwelveData Budget (if configured) */}
      {twelveDataUsage && (
        <div className="mt-4 pt-4 border-t border-terminal-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400 text-xs">TwelveData</span>
            <span className="text-xs text-gray-400">
              {twelveDataUsage.used}/{twelveDataUsage.limit} calls
            </span>
          </div>
          <div className="w-full h-2 bg-terminal-bg rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${getColor((twelveDataUsage.used / twelveDataUsage.limit) * 100)}`}
              style={{ width: `${Math.min(100, (twelveDataUsage.used / twelveDataUsage.limit) * 100)}%` }}
            />
          </div>
          <p className="text-gray-500 text-xs mt-1">
            {twelveDataUsage.remaining} calls remaining today
          </p>
        </div>
      )}
    </div>
  )
}
