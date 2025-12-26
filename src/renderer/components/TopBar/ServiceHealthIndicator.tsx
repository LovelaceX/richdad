/**
 * ServiceHealthIndicator
 *
 * Shows a small colored dot indicating overall service health.
 * Green = all healthy, Yellow = degraded, Red = error
 * Hover shows detailed status of each service.
 */

import { useState } from 'react'
import { Activity, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { useServiceHealthStore, type ServiceStatus } from '../../stores/serviceHealthStore'

function formatTimeSince(timestamp: number): string {
  if (timestamp === 0) return 'Never'

  const seconds = Math.floor((Date.now() - timestamp) / 1000)

  if (seconds < 60) return `${seconds}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

function getStatusIcon(status: ServiceStatus) {
  switch (status) {
    case 'ok':
      return <CheckCircle size={12} className="text-terminal-up" />
    case 'degraded':
      return <AlertTriangle size={12} className="text-yellow-400" />
    case 'error':
      return <XCircle size={12} className="text-red-400" />
    default:
      return <Activity size={12} className="text-gray-500" />
  }
}

function getStatusColor(status: ServiceStatus): string {
  switch (status) {
    case 'ok':
      return 'text-terminal-up'
    case 'degraded':
      return 'text-yellow-400'
    case 'error':
      return 'text-red-400'
    default:
      return 'text-gray-500'
  }
}

export function ServiceHealthIndicator() {
  const [isOpen, setIsOpen] = useState(false)
  const market = useServiceHealthStore(state => state.market)
  const news = useServiceHealthStore(state => state.news)
  const sentiment = useServiceHealthStore(state => state.sentiment)
  const ai = useServiceHealthStore(state => state.ai)
  const getOverallStatus = useServiceHealthStore(state => state.getOverallStatus)

  const overallStatus = getOverallStatus()

  const dotColor = {
    healthy: 'bg-terminal-up',
    degraded: 'bg-yellow-400',
    unhealthy: 'bg-red-400'
  }

  // Service list
  const services = [
    { name: 'Market Data', state: market },
    { name: 'News Feed', state: news },
    { name: 'Sentiment', state: sentiment },
    { name: 'AI Copilot', state: ai },
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-terminal-border transition-colors"
        title={`Services: ${overallStatus}`}
      >
        <span className={`w-2 h-2 rounded-full ${dotColor[overallStatus]} ${overallStatus !== 'healthy' ? 'animate-pulse' : ''}`} />
        <Activity size={14} className="text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-terminal-panel border border-terminal-border rounded-lg shadow-xl z-50">
          <div className="p-3 border-b border-terminal-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-white">Service Health</span>
              <span className={`text-xs font-medium ${
                overallStatus === 'healthy' ? 'text-terminal-up' :
                overallStatus === 'degraded' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}
              </span>
            </div>
          </div>

          <div className="p-2 space-y-1">
            {services.map(({ name, state }) => (
              <div key={name} className="flex items-center justify-between p-2 rounded hover:bg-terminal-border/50">
                <div className="flex items-center gap-2">
                  {getStatusIcon(state.status)}
                  <span className="text-xs text-gray-300">{name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {state.lastSuccess > 0 && (
                    <span className="text-[10px] text-gray-500">
                      {formatTimeSince(state.lastSuccess)}
                    </span>
                  )}
                  <span className={`text-[10px] ${getStatusColor(state.status)}`}>
                    {state.status}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {(market.lastError || news.lastError || sentiment.lastError || ai.lastError) && (
            <div className="p-2 border-t border-terminal-border">
              <div className="text-[10px] text-red-400 truncate">
                Last error: {market.lastError || news.lastError || sentiment.lastError || ai.lastError}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
