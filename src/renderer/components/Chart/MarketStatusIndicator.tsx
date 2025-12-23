/**
 * Market Status Indicator
 *
 * Displays the current US stock market status (Open, Pre-Market, After-Hours, Closed)
 * along with the current Eastern Time.
 */

import { useState, useEffect } from 'react'
import { getMarketStatus, type MarketState } from '../../../services/marketHours'

interface StatusConfig {
  bgColor: string
  textColor: string
  dotColor: string
  pulseColor: string
}

const STATUS_CONFIG: Record<MarketState, StatusConfig> = {
  open: {
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-400',
    dotColor: 'bg-green-500',
    pulseColor: 'bg-green-400'
  },
  premarket: {
    bgColor: 'bg-yellow-500/10',
    textColor: 'text-yellow-400',
    dotColor: 'bg-yellow-500',
    pulseColor: 'bg-yellow-400'
  },
  afterhours: {
    bgColor: 'bg-orange-500/10',
    textColor: 'text-orange-400',
    dotColor: 'bg-orange-500',
    pulseColor: 'bg-orange-400'
  },
  closed: {
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-400',
    dotColor: 'bg-red-500',
    pulseColor: 'bg-red-400'
  }
}

export function MarketStatusIndicator() {
  const [status, setStatus] = useState(getMarketStatus())

  useEffect(() => {
    // Update immediately
    setStatus(getMarketStatus())

    // Update every minute
    const interval = setInterval(() => {
      setStatus(getMarketStatus())
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  const config = STATUS_CONFIG[status.state]
  const isActive = status.state === 'open'

  return (
    <div
      className={`flex items-center gap-2 px-2 py-1 rounded ${config.bgColor}`}
      title={`US Stock Market: ${status.label}`}
    >
      {/* Status dot with pulse animation when market is open */}
      <span className="relative flex h-2 w-2">
        {isActive && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.pulseColor} opacity-75`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dotColor}`} />
      </span>

      {/* Status label */}
      <span className={`text-[10px] font-medium ${config.textColor}`}>
        {status.label}
      </span>

      {/* Separator */}
      <span className="text-gray-600">|</span>

      {/* Current ET time */}
      <span className="text-gray-400 text-[10px] tabular-nums">
        {status.currentTimeET}
      </span>
    </div>
  )
}
