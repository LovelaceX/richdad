import { useState, useEffect } from 'react'
import { BarChart3, Clock, Calendar, Infinity } from 'lucide-react'
import { getAllProvidersBudgetStatus, type ProviderBudgetStatus } from '../../../services/apiBudgetTracker'

export function APIBudgetMeter() {
  const [providers, setProviders] = useState<ProviderBudgetStatus[]>([])

  useEffect(() => {
    const updateBudget = () => {
      const statuses = getAllProvidersBudgetStatus()
      setProviders(statuses)
    }

    updateBudget()
    // Update every 30 seconds
    const interval = setInterval(updateBudget, 30000)
    return () => clearInterval(interval)
  }, [])

  if (providers.length === 0) return null

  const getColor = (percent: number, isUnlimited: boolean) => {
    if (isUnlimited) return 'bg-terminal-up'
    if (percent >= 100) return 'bg-red-500'
    if (percent >= 80) return 'bg-yellow-500'
    if (percent >= 50) return 'bg-yellow-600'
    return 'bg-terminal-amber'
  }

  const getTextColor = (percent: number, isUnlimited: boolean) => {
    if (isUnlimited) return 'text-terminal-up'
    if (percent >= 100) return 'text-red-400'
    if (percent >= 80) return 'text-yellow-400'
    return 'text-white'
  }

  const formatLimit = (status: ProviderBudgetStatus) => {
    if (status.isUnlimited) return '∞'
    return status.limit.toLocaleString()
  }

  return (
    <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={16} className="text-gray-400" />
        <span className="text-white text-sm font-medium">API Budget Status</span>
      </div>

      <div className="space-y-4">
        {providers.map((status) => (
          <div key={status.provider} className="space-y-2">
            {/* Provider Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-white text-xs font-medium">{status.provider}</span>
                <span className="text-[9px] px-1.5 py-0.5 bg-terminal-bg rounded text-gray-400">
                  {status.tier}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                {status.type === 'minute' ? (
                  <Clock size={10} className="text-gray-500" />
                ) : (
                  <Calendar size={10} className="text-gray-500" />
                )}
                <span className={getTextColor(status.percentUsed, status.isUnlimited)}>
                  {status.isUnlimited ? (
                    <span className="flex items-center gap-1">
                      <Infinity size={12} className="text-terminal-up" />
                      <span>Unlimited</span>
                    </span>
                  ) : (
                    `${status.used}/${formatLimit(status)}`
                  )}
                </span>
                <span className="text-gray-500">
                  /{status.type === 'minute' ? 'min' : 'day'}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            {!status.isUnlimited && (
              <div className="w-full h-1.5 bg-terminal-bg rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${getColor(status.percentUsed, status.isUnlimited)}`}
                  style={{ width: `${Math.min(100, status.percentUsed)}%` }}
                />
              </div>
            )}

            {/* Unlimited indicator */}
            {status.isUnlimited && (
              <div className="w-full h-1.5 bg-terminal-up/20 rounded-full overflow-hidden">
                <div className="h-full bg-terminal-up/40 w-full" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-terminal-border">
        <p className="text-[10px] text-gray-500">
          Daily limits reset at midnight • Minute limits reset every 60s
        </p>
        <p className="text-[10px] text-gray-500 mt-1">
          When limits are reached, cached data is used automatically
        </p>
      </div>
    </div>
  )
}
