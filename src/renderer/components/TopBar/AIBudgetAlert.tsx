import { useState, useEffect } from 'react'
import { X, Brain } from 'lucide-react'
import { getAIBudgetStatus } from '../../../services/aiBudgetTracker'

export function AIBudgetAlert() {
  const [budget, setBudget] = useState<ReturnType<typeof getAIBudgetStatus> | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const updateBudget = () => {
      const status = getAIBudgetStatus()
      setBudget(status)
    }

    updateBudget()
    const interval = setInterval(updateBudget, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  if (!budget || dismissed) return null

  // Don't show alerts for unlimited mode
  if (budget.isUnlimited) return null

  if (budget.percentUsed < 80) return null // Only show at 80%+

  const isExhausted = budget.percentUsed >= 100
  const isCritical = budget.percentUsed >= 80 && budget.percentUsed < 100

  return (
    <div className={`w-full px-4 py-3 flex items-center justify-between ${
      isExhausted ? 'bg-red-900/20 border-b border-red-500' :
      isCritical ? 'bg-yellow-900/20 border-b border-yellow-500' : ''
    }`}>
      <div className="flex items-center gap-3">
        <Brain size={18} className={isExhausted ? 'text-red-400' : 'text-yellow-400'} />
        <div>
          <div className={`text-sm font-medium ${isExhausted ? 'text-red-400' : 'text-yellow-400'}`}>
            {isExhausted ? 'AI Budget Exhausted' : 'AI Budget Warning'}
          </div>
          <div className="text-xs text-gray-400">
            {isExhausted ? (
              `AI recommendations paused until midnight. ${budget.used}/${budget.limit} calls used.`
            ) : (
              `${budget.used}/${budget.limit} AI calls used today (${budget.remaining} remaining). Resets at midnight.`
            )}
          </div>
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 hover:bg-white/10 rounded transition-colors"
      >
        <X size={16} className="text-gray-400" />
      </button>
    </div>
  )
}
