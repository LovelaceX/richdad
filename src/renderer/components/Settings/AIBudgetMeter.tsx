import { useState, useEffect } from 'react'
import { Brain, Infinity } from 'lucide-react'
import { getAIBudgetStatus, setAIDailyLimit, enableUnlimitedMode, disableUnlimitedMode } from '../../../services/aiBudgetTracker'

interface AIBudgetMeterProps {
  showControls?: boolean
  onLimitChange?: (limit: number) => void
}

export function AIBudgetMeter({ showControls = false, onLimitChange }: AIBudgetMeterProps) {
  const [budget, setBudget] = useState<ReturnType<typeof getAIBudgetStatus> | null>(null)
  const [limit, setLimit] = useState(15)
  const [isUnlimited, setIsUnlimited] = useState(false)

  useEffect(() => {
    const updateBudget = () => {
      const status = getAIBudgetStatus()
      setBudget(status)
      setLimit(status.limit)
      setIsUnlimited(status.isUnlimited)
    }

    updateBudget()
    const interval = setInterval(updateBudget, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit)
    setAIDailyLimit(newLimit)
    onLimitChange?.(newLimit)
    setBudget(getAIBudgetStatus())
  }

  const handleUnlimitedToggle = () => {
    if (isUnlimited) {
      disableUnlimitedMode()
      setIsUnlimited(false)
    } else {
      enableUnlimitedMode()
      setIsUnlimited(true)
    }
    setBudget(getAIBudgetStatus())
    onLimitChange?.(isUnlimited ? 15 : -1)
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

  // Estimate cost per call (rough average across providers)
  const estimatedCostPerCall = 0.01 // ~$0.01 per AI call average
  const estimatedDailyCost = isUnlimited ? null : (limit * estimatedCostPerCall).toFixed(2)

  return (
    <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Brain size={16} className="text-gray-400" />
        <span className="text-white text-sm">AI Budget Status</span>
        <span className={`ml-auto text-sm font-mono ${isUnlimited ? 'text-terminal-amber' : getTextColor(budget.percentUsed)}`}>
          {isUnlimited ? (
            <span className="flex items-center gap-1">
              <Infinity size={14} />
              Unlimited
            </span>
          ) : (
            `${budget.used}/${budget.limit}`
          )}
        </span>
      </div>

      {/* Progress Bar - hidden for unlimited */}
      {!isUnlimited && (
        <div className="w-full h-2 bg-terminal-bg rounded-full overflow-hidden mb-3">
          <div
            className={`h-full transition-all ${getColor(budget.percentUsed)}`}
            style={{ width: `${Math.min(100, budget.percentUsed)}%` }}
          />
        </div>
      )}

      {/* Stats Row */}
      <div className="flex justify-between text-xs">
        <div>
          {isUnlimited ? (
            <>
              <span className="text-gray-400">Today: </span>
              <span className="text-terminal-amber">{budget.used} calls made</span>
            </>
          ) : (
            <>
              <span className="text-gray-400">Remaining: </span>
              <span className={getTextColor(budget.percentUsed)}>{budget.remaining} calls</span>
            </>
          )}
        </div>
        <div>
          <span className="text-gray-400">Resets: </span>
          <span className="text-gray-300">{new Date(budget.resetsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Optional Controls */}
      {showControls && (
        <div className="mt-4 pt-4 border-t border-terminal-border">
          {/* Unlimited Toggle */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-sm text-white">Unlimited Mode</span>
              <p className="text-xs text-gray-500">For paid API tier users</p>
            </div>
            <button
              onClick={handleUnlimitedToggle}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isUnlimited ? 'bg-terminal-amber' : 'bg-terminal-border'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                  isUnlimited ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Daily Limit Controls - hidden when unlimited */}
          {!isUnlimited && (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Daily Limit</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={limit}
                    onChange={(e) => handleLimitChange(parseInt(e.target.value) || 5)}
                    className="w-16 px-2 py-1 text-xs text-white font-mono bg-terminal-bg border border-terminal-border rounded text-center"
                  />
                  <span className="text-xs text-gray-400">calls/day</span>
                </div>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                value={limit}
                onChange={(e) => handleLimitChange(parseInt(e.target.value))}
                className="w-full h-1 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-terminal-amber"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>5</span>
                <span>Free Tier (15)</span>
                <span>100</span>
              </div>

              {/* Cost Estimate */}
              <div className="mt-3 p-2 bg-terminal-bg rounded text-xs">
                <span className="text-gray-400">Est. daily cost: </span>
                <span className="text-terminal-amber font-mono">~${estimatedDailyCost} USD</span>
                <span className="text-gray-500 ml-1">(varies by provider)</span>
              </div>
            </>
          )}

          {/* Unlimited mode info */}
          {isUnlimited && (
            <div className="p-2 bg-terminal-amber/10 border border-terminal-amber/30 rounded text-xs text-terminal-amber">
              No artificial limits. Costs depend on your AI provider's pricing.
            </div>
          )}
        </div>
      )}

      {/* Warning Messages - only show when not unlimited */}
      {!isUnlimited && budget.percentUsed >= 100 && (
        <div className="mt-3 p-2 bg-red-900/30 border border-red-500/30 rounded text-xs text-red-400">
          AI budget exhausted for today. Resets at midnight.
        </div>
      )}
      {!isUnlimited && budget.percentUsed >= 80 && budget.percentUsed < 100 && (
        <div className="mt-3 p-2 bg-yellow-900/30 border border-yellow-500/30 rounded text-xs text-yellow-400">
          {budget.remaining} AI calls remaining today.
        </div>
      )}
    </div>
  )
}
