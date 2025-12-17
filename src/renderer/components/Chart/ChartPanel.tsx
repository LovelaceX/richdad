import { TrendingUp, Calendar } from 'lucide-react'
import { TradingChart } from './TradingChart'
import { ProactiveAlert } from './ProactiveAlert'
import { TimeframeSelector } from './TimeframeSelector'
import { useMarketStore } from '../../stores/marketStore'
import { useAIStore } from '../../stores/aiStore'
import { formatPrice, formatChange, formatPercent, getColorClass } from '../../lib/utils'

export function ChartPanel() {
  const selectedTicker = useMarketStore(state => state.selectedTicker)
  const watchlist = useMarketStore(state => state.watchlist)
  const timeframe = useMarketStore(state => state.timeframe)
  const setTimeframe = useMarketStore(state => state.setTimeframe)
  const selectedDate = useMarketStore(state => state.selectedDate)
  const setSelectedDate = useMarketStore(state => state.setSelectedDate)
  const currentRecommendation = useAIStore(state => state.currentRecommendation)

  const selectedItem = watchlist.find(item => item.symbol === selectedTicker)
  const quote = selectedItem?.quote

  // Date picker constraints
  const today = new Date().toISOString().split('T')[0]
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const isIntraday = timeframe !== 'daily'

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

        <div className="flex items-center gap-4">
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

          {/* Date Picker */}
          <div className="relative group">
            <div className="flex items-center gap-1.5">
              <Calendar size={12} className="text-gray-500" />
              <input
                type="date"
                value={isIntraday ? today : selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={today}
                min={ninetyDaysAgo}
                disabled={isIntraday}
                className={`
                  bg-transparent border border-terminal-border rounded px-2 py-1 text-[11px] font-normal
                  focus:border-terminal-amber focus:outline-none
                  ${isIntraday
                    ? 'text-gray-500 cursor-not-allowed opacity-50'
                    : 'text-white cursor-pointer hover:border-terminal-amber/50'
                  }
                `}
                title={isIntraday ? 'Intraday data is today only (API limitation)' : 'Select date (last 90 days)'}
              />
            </div>
            {isIntraday && (
              <div className="absolute top-full left-0 mt-1 px-2 py-1 bg-terminal-bg border border-terminal-border rounded text-[10px] text-gray-400 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                Intraday = Today only
              </div>
            )}
          </div>

          {/* Timeframe Selector */}
          <TimeframeSelector
            value={timeframe}
            onChange={(value) => setTimeframe(value as any)}
            symbol={selectedTicker}
          />
        </div>
      </div>

      {/* Chart area */}
      <div className="flex-1 relative min-h-0">
        <TradingChart />

        {/* Proactive Alert Overlay */}
        {currentRecommendation && (
          <ProactiveAlert recommendation={currentRecommendation} />
        )}
      </div>
    </div>
  )
}
