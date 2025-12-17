import { useState, useEffect } from 'react'
import { Brain } from 'lucide-react'
import { getAIBudgetStatus, setAIDailyLimit } from '../../../services/aiBudgetTracker'

interface AIBudgetMeterProps {
  showControls?: boolean
  onLimitChange?: (limit: number) => void
}

export function AIBudgetMeter({ showControls = false, onLimitChange }: AIBudgetMeterProps) {
  const [budget, setBudget] = useState<ReturnType<typeof getAIBudgetStatus> | null>(null)
  const [limit, setLimit] = useState(15)

  useEffect(() => {
    const updateBudget = () => {
      const status = getAIBudgetStatus()
      setBudget(status)
      setLimit(status.limit)
    }

    updateBudget()
    const interval = setInterval(updateBudget, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit)
    setAIDailyLimit(newLimit)
    onLimitChange?.(newLimit)
    // Update budget display
    setBudget(getAIBudgetStatus())
  }

  if (!budget) return null

  const getColor = (percent: number) => {
    if (percent >= 100) return 'bg-red-500'
    if (percent >= 80) return 'bg-yellow-500'
    if (percent >= 50) return 'bg-yellow-600'
    return 'bg-terminal-amber'
  }

  const getTextColor = (percent: number) => {
    if (percent >= 100) return 'text-red-400'
    if (percent >= 80) return 'text-yellow-400'
    return 'text-white'
  }

  return (
    <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Brain size={16} className="text-gray-400" />
        <span className="text-white text-sm">AI Budget Status</span>
        <span className={`ml-auto text-sm font-mono ${getTextColor(budget.percentUsed)}`}>
          {budget.used}/{budget.limit}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-terminal-bg rounded-full overflow-hidden mb-3">
        <div
          className={`h-full transition-all ${getColor(budget.percentUsed)}`}
          style={{ width: `${Math.min(100, budget.percentUsed)}%` }}
        />
      </div>

      {/* Stats Row */}
      <div className="flex justify-between text-xs">
        <div>
          <span className="text-gray-400">Remaining: </span>
          <span className={getTextColor(budget.percentUsed)}>{budget.remaining} calls</span>
        </div>
        <div>
          <span className="text-gray-400">Resets: </span>
          <span className="text-gray-300">{new Date(budget.resetsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Optional Controls */}
      {showControls && (
        <div className="mt-4 pt-4 border-t border-terminal-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Daily Limit</span>
            <span className="text-xs text-white font-mono">{limit} calls/day</span>
          </div>
          <input
            type="range"
            min={5}
            max={50}
            value={limit}
            onChange={(e) => handleLimitChange(parseInt(e.target.value))}
            className="w-full h-1 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-terminal-amber"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>5</span>
            <span>Free Tier (15)</span>
            <span>50</span>
          </div>
        </div>
      )}

      {/* Warning Messages */}
      {budget.percentUsed >= 100 && (
        <div className="mt-3 p-2 bg-red-900/30 border border-red-500/30 rounded text-xs text-red-400">
          AI budget exhausted for today. Resets at midnight.
        </div>
      )}
      {budget.percentUsed >= 80 && budget.percentUsed < 100 && (
        <div className="mt-3 p-2 bg-yellow-900/30 border border-yellow-500/30 rounded text-xs text-yellow-400">
          {budget.remaining} AI calls remaining today.
        </div>
      )}
    </div>
  )
}
