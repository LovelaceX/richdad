/**
 * API Usage Dashboard
 *
 * Visual display of API call usage for Tiingo.
 * Shows usage bars, limits, and reset countdowns.
 */

import { Activity, RefreshCw, Clock } from 'lucide-react'
import { useApiUsage, formatResetTime } from '../hooks/useApiUsage'

interface UsageBarProps {
  provider: string
  used: number
  limit: number
  resetInSeconds: number
  type: 'hour'
  tier: string
}

function UsageBar({ provider, used, limit, resetInSeconds, type, tier }: UsageBarProps) {
  const percentUsed = Math.min(100, Math.round((used / limit) * 100))
  const isWarning = percentUsed >= 80
  const isExhausted = percentUsed >= 100

  // Color based on usage level
  const getBarColor = () => {
    if (isExhausted) return 'bg-red-500'
    if (isWarning) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-white font-medium">{provider}</span>
          <span className="text-gray-500 text-[10px] uppercase">{tier}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
          <span className={isExhausted ? 'text-red-400' : ''}>
            {used}/{limit}
          </span>
          <span className="text-gray-600">|</span>
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {formatResetTime(resetInSeconds)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-terminal-border rounded-full overflow-hidden">
        <div
          className={`h-full ${getBarColor()} transition-all duration-300`}
          style={{ width: `${percentUsed}%` }}
        />
      </div>

      {/* Type label */}
      <div className="text-[10px] text-gray-500">
        {type === 'hour' ? 'per hour' : ''}
      </div>
    </div>
  )
}

export function ApiUsageDashboard() {
  const usage = useApiUsage()

  return (
    <div className="bg-terminal-bg border border-terminal-border rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-terminal-amber" />
          <span className="text-sm font-medium text-white">API Usage</span>
        </div>
        <div className="text-[10px] text-gray-500 flex items-center gap-1">
          <RefreshCw size={10} className="animate-spin-slow" />
          Live
        </div>
      </div>

      {/* Usage Bars */}
      <div className="space-y-4">
        {/* Tiingo */}
        <UsageBar
          provider="Tiingo"
          used={usage.tiingo.used}
          limit={usage.tiingo.limit}
          resetInSeconds={usage.tiingo.resetInSeconds}
          type="hour"
          tier={usage.tiingo.tier}
        />
      </div>

      {/* Footer with tips */}
      <div className="pt-2 border-t border-terminal-border">
        <p className="text-[10px] text-gray-500">
          Upgrade to Tiingo Power ($10/mo) for 5,000 tickers/hour.
        </p>
      </div>
    </div>
  )
}
