import { useState, useEffect } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { getBudgetStatus } from '../../../services/apiBudgetTracker'

export function APIBudgetAlert() {
  const [budget, setBudget] = useState<any>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const updateBudget = () => {
      const status = getBudgetStatus()
      setBudget(status)
    }

    updateBudget()
    const interval = setInterval(updateBudget, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [])

  if (!budget || dismissed) return null

  const marketPercent = (budget.marketCallsUsed / 23) * 100
  const chartPercent = (budget.chartCallsUsed / 1) * 100
  const maxPercent = Math.max(marketPercent, chartPercent)

  if (maxPercent < 80) return null // Only show at 80%+

  const isExhausted = maxPercent >= 100
  const isCritical = maxPercent >= 80 && maxPercent < 100

  return (
    <div className={`w-full px-4 py-3 flex items-center justify-between ${
      isExhausted ? 'bg-red-900/20 border-b border-red-500' :
      isCritical ? 'bg-yellow-900/20 border-b border-yellow-500' : ''
    }`}>
      <div className="flex items-center gap-3">
        <AlertTriangle size={18} className={isExhausted ? 'text-red-400' : 'text-yellow-400'} />
        <div>
          <div className={`text-sm font-medium ${isExhausted ? 'text-red-400' : 'text-yellow-400'}`}>
            {isExhausted ? 'API Limit Reached' : 'API Budget Warning'}
          </div>
          <div className="text-xs text-gray-400">
            {isExhausted ? (
              `Using cached data until 12:00 AM. Market data may be up to 1 hour old.`
            ) : (
              `${budget.marketCallsUsed + budget.chartCallsUsed}/25 calls used (${Math.round(maxPercent)}%). Resets at 12:00 AM.`
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
