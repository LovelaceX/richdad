import { useState, useEffect } from 'react'
import { BarChart3 } from 'lucide-react'
import { getBudgetStatus } from '../../../services/apiBudgetTracker'

export function APIBudgetMeter() {
  const [budget, setBudget] = useState<any>(null)

  useEffect(() => {
    const updateBudget = () => {
      const status = getBudgetStatus()
      setBudget(status)
    }

    updateBudget()
    const interval = setInterval(updateBudget, 30000)
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
    </div>
  )
}
