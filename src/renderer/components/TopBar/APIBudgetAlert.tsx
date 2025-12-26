import { useState, useEffect } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { getTiingoBudgetStatus } from '../../../services/apiBudgetTracker'
import { getSettings } from '../../lib/db'

interface ProviderStatus {
  provider: string
  used: number
  limit: number
  percentage: number
}

export function APIBudgetAlert() {
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatus[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())

  useEffect(() => {
    const checkAllProviders = async () => {
      const statuses: ProviderStatus[] = []
      const settings = await getSettings()

      // Tiingo (check if configured)
      if (settings?.tiingoApiKey) {
        const tiingoStatus = getTiingoBudgetStatus()
        statuses.push({
          provider: 'Tiingo',
          used: tiingoStatus.used,
          limit: tiingoStatus.limit,
          percentage: tiingoStatus.percentUsed
        })
      }

      setProviderStatuses(statuses)
    }

    checkAllProviders()
    const interval = setInterval(checkAllProviders, 60000)
    return () => clearInterval(interval)
  }, [])

  // Filter to providers at 80%+ that haven't been dismissed
  const alertingProviders = providerStatuses.filter(
    s => s.percentage >= 80 && !dismissed.has(s.provider)
  )

  if (alertingProviders.length === 0) return null

  const handleDismiss = (provider: string) => {
    setDismissed(prev => new Set([...prev, provider]))
  }

  return (
    <div className="w-full">
      {alertingProviders.map(status => {
        const isExhausted = status.percentage >= 100
        return (
          <div
            key={status.provider}
            className={`px-4 py-2 flex items-center justify-between ${
              isExhausted
                ? 'bg-red-900/20 border-b border-red-500/50'
                : 'bg-yellow-900/20 border-b border-yellow-500/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle size={16} className={isExhausted ? 'text-red-400' : 'text-yellow-400'} />
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${isExhausted ? 'text-red-400' : 'text-yellow-400'}`}>
                  {status.provider}:
                </span>
                <span className="text-xs text-gray-400">
                  {status.used}/{status.limit} tickers/hr
                  {isExhausted
                    ? ' (exhausted - using cache)'
                    : ` (${Math.round(status.percentage)}%)`
                  }
                </span>
              </div>
            </div>
            <button
              onClick={() => handleDismiss(status.provider)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X size={14} className="text-gray-400" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
