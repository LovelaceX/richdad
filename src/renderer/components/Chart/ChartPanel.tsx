import { useEffect } from 'react'
import { TrendingUp, Calendar, Maximize2, Minimize2 } from 'lucide-react'
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
  const isChartExpanded = useMarketStore(state => state.isChartExpanded)
  const toggleChartExpanded = useMarketStore(state => state.toggleChartExpanded)
  const currentRecommendation = useAIStore(state => state.currentRecommendation)

  // Handle Escape key to close expanded chart
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isChartExpanded) {
        toggleChartExpanded()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isChartExpanded, toggleChartExpanded])

  const selectedItem = watchlist.find(item => item.symbol === selectedTicker)
  const quote = selectedItem?.quote

  // Date picker constraints
  const today = new Date().toISOString().split('T')[0]
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const isIntraday = timeframe !== 'daily' && timeframe !== 'weekly'

  // Full-screen wrapper classes
  const wrapperClasses = isChartExpanded
    ? 'fixed inset-0 z-50 bg-terminal-bg flex flex-col'
    : 'panel h-full flex flex-col relative'

  return (
    <div className={wrapperClasses}>
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

          {/* Expand/Minimize Button */}
          <button
            onClick={toggleChartExpanded}
            className="p-1.5 text-gray-400 hover:text-terminal-amber transition-colors rounded hover:bg-terminal-border/50"
            title={isChartExpanded ? 'Exit full screen (Esc)' : 'Full screen'}
          >
            {isChartExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
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

      {/* Quick Timeframe Buttons */}
      {selectedTicker === 'SPY' && (
        <div className="flex items-center justify-center gap-2 py-2 border-t border-terminal-border bg-terminal-panel/50">
          {[
            { label: '5M', value: '5min' },
            { label: '15M', value: '15min' },
            { label: '1H', value: '60min' },
            { label: '1D', value: 'daily' },
          ].map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setTimeframe(value as any)}
              className={`
                px-3 py-1 text-xs rounded transition-colors
                ${timeframe === value
                  ? 'bg-terminal-amber/20 text-terminal-amber border border-terminal-amber/50'
                  : 'text-gray-400 hover:text-white hover:bg-terminal-border/50 border border-transparent'
                }
              `}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
