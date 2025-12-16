import { useEffect } from 'react'
import { Eye } from 'lucide-react'
import { WatchlistGrid } from './WatchlistGrid'
import { useMarketStore } from '../../stores/marketStore'
import { useSettingsStore } from '../../stores/settingsStore'

export function MarketWatch() {
  const refreshAllQuotes = useMarketStore(state => state.refreshAllQuotes)
  const refreshInterval = useSettingsStore(state => state.refreshInterval)

  // Auto-refresh quotes
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAllQuotes()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshAllQuotes, refreshInterval])

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex items-center gap-2">
        <Eye size={14} />
        <span>Market Watch</span>
      </div>

      <div className="flex-1 overflow-auto">
        <WatchlistGrid />
      </div>
    </div>
  )
}
