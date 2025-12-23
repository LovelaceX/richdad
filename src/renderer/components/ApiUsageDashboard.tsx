/**
 * API Usage Dashboard
 *
 * Visual display of API call usage per provider.
 * Shows usage bars, limits, and reset countdowns.
 */

import { Activity, RefreshCw, Clock } from 'lucide-react'
import { useApiUsage, formatResetTime } from '../hooks/useApiUsage'

interface UsageBarProps {
  provider: string
  used: number
  limit: number
  resetInSeconds: number
  type: 'minute' | 'daily'
  isUnlimited?: boolean
  tier: string
}

function UsageBar({ provider, used, limit, resetInSeconds, type, isUnlimited, tier }: UsageBarProps) {
  const percentUsed = isUnlimited ? 0 : Math.min(100, Math.round((used / limit) * 100))
  const isWarning = percentUsed >= 80
  const isExhausted = percentUsed >= 100

  // Color based on usage level
  const getBarColor = () => {
    if (isUnlimited) return 'bg-gray-500'
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
          {isUnlimited ? (
            <span>Unlimited</span>
          ) : (
            <>
              <span className={isExhausted ? 'text-red-400' : ''}>
                {used}/{limit}
              </span>
              <span className="text-gray-600">|</span>
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {formatResetTime(resetInSeconds)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-terminal-border rounded-full overflow-hidden">
        <div
          className={`h-full ${getBarColor()} transition-all duration-300`}
          style={{ width: `${isUnlimited ? 0 : percentUsed}%` }}
        />
      </div>

      {/* Type label */}
      <div className="text-[10px] text-gray-500">
        {type === 'minute' ? 'per minute' : 'per day'}
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
        {/* Polygon */}
        <UsageBar
          provider="Polygon"
          used={usage.polygon.used}
          limit={usage.polygon.limit}
          resetInSeconds={usage.polygon.resetInSeconds}
          type="minute"
          isUnlimited={usage.polygon.isUnlimited}
          tier={usage.polygon.tier}
        />

        {/* TwelveData - Show both minute and daily */}
        <div className="space-y-2">
          <UsageBar
            provider="TwelveData"
            used={usage.twelveData.dailyUsed}
            limit={usage.twelveData.dailyLimit}
            resetInSeconds={usage.twelveData.dailyResetInSeconds}
            type="daily"
            isUnlimited={usage.twelveData.isDailyUnlimited}
            tier={usage.twelveData.tier}
          />
          {/* Minute usage as secondary info */}
          <div className="flex items-center justify-between text-[10px] text-gray-500 pl-2">
            <span>Minute rate:</span>
            <span>{usage.twelveData.minuteUsed}/{usage.twelveData.minuteLimit}/min</span>
          </div>
        </div>

        {/* Finnhub */}
        <UsageBar
          provider="Finnhub"
          used={usage.finnhub.used}
          limit={usage.finnhub.limit}
          resetInSeconds={usage.finnhub.resetInSeconds}
          type="minute"
          tier={usage.finnhub.tier}
        />
      </div>

      {/* Footer with tips */}
      <div className="pt-2 border-t border-terminal-border">
        <p className="text-[10px] text-gray-500">
          Upgrade your API tier in Settings to increase limits.
        </p>
      </div>
    </div>
  )
}
