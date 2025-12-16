import { TrendingUp } from 'lucide-react'
import { TradingChart } from './TradingChart'
import { ProactiveAlert } from './ProactiveAlert'
import { useMarketStore } from '../../stores/marketStore'
import { useAIStore } from '../../stores/aiStore'
import { formatPrice, formatChange, formatPercent, getColorClass } from '../../lib/utils'

export function ChartPanel() {
  const selectedTicker = useMarketStore(state => state.selectedTicker)
  const watchlist = useMarketStore(state => state.watchlist)
  const currentRecommendation = useAIStore(state => state.currentRecommendation)

  const selectedItem = watchlist.find(item => item.symbol === selectedTicker)
  const quote = selectedItem?.quote

  return (
    <div className="panel h-full flex flex-col relative">
      {/* Header with ticker info */}
      <div className="panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} />
          <span>{selectedTicker}</span>
          {selectedItem && (
            <span className="text-gray-500 text-[10px] font-normal normal-case">
              {selectedItem.name}
            </span>
          )}
        </div>

        {quote && (
          <div className="flex items-center gap-4 text-[11px] font-normal">
            <span className="text-white tabular-nums">
              ${formatPrice(quote.price)}
            </span>
            <span className={`tabular-nums ${getColorClass(quote.change)}`}>
              {formatChange(quote.change)} ({formatPercent(quote.changePercent)})
            </span>
            <span className="text-gray-500">
              Vol: {(quote.volume / 1_000_000).toFixed(2)}M
            </span>
          </div>
        )}
      </div>

      {/* Chart area */}
      <div className="flex-1 relative">
        <TradingChart />

        {/* Proactive Alert Overlay */}
        {currentRecommendation && (
          <ProactiveAlert recommendation={currentRecommendation} />
        )}
      </div>
    </div>
  )
}
