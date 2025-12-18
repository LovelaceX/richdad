import { useEffect, useState } from 'react'
import { TrendingUp, Calendar, Maximize2, Minimize2, Activity, Minus, TrendingUp as TrendlineIcon, Trash2 } from 'lucide-react'
import { TradingChart } from './TradingChart'
import { ProactiveAlert } from './ProactiveAlert'
import { TimeframeSelector } from './TimeframeSelector'
import { QuickTradeButtons } from './QuickTradeButtons'
import { PositionSizeCalculator } from './PositionSizeCalculator'
import { MarketRegimeIndicator } from './MarketRegimeIndicator'
import { MarketContextPanel } from './MarketContextPanel'
import { useMarketStore } from '../../stores/marketStore'
import { useAIStore } from '../../stores/aiStore'
import { usePatternStore } from '../../stores/patternStore'
import { useDrawingStore } from '../../stores/drawingStore'
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

  // Pattern & News marker toggles
  const showPatterns = usePatternStore(state => state.showPatterns)
  const showNews = usePatternStore(state => state.showNews)
  const togglePatterns = usePatternStore(state => state.togglePatterns)
  const toggleNews = usePatternStore(state => state.toggleNews)

  // Drawing tools
  const drawingMode = useDrawingStore(state => state.drawingMode)
  const setDrawingMode = useDrawingStore(state => state.setDrawingMode)
  const clearDrawings = useDrawingStore(state => state.clearDrawings)
  const horizontalLines = useDrawingStore(state => state.horizontalLines)
  const trendlines = useDrawingStore(state => state.trendlines)
  const hasDrawings = horizontalLines.some(l => l.symbol === selectedTicker) ||
                      trendlines.some(l => l.symbol === selectedTicker)

  // Market Context Panel toggle
  const [showMarketContext, setShowMarketContext] = useState(false)

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
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={14} />
            <span>{selectedTicker}</span>
            {selectedItem && (
              <span className="text-gray-500 text-[10px] font-normal normal-case">
                {selectedItem.name}
              </span>
            )}
          </div>

          {/* Market Regime Indicator */}
          <div className="border-l border-terminal-border pl-3">
            <MarketRegimeIndicator compact />
          </div>
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

          {/* Quick Buy/Sell Buttons */}
          <QuickTradeButtons />

          {/* Position Size Calculator */}
          <PositionSizeCalculator />

          {/* Pattern / News / Market Context Toggles */}
          <div className="flex items-center gap-1 border-l border-terminal-border pl-3">
            <button
              onClick={togglePatterns}
              title="Toggle pattern markers"
              className={`
                w-6 h-6 flex items-center justify-center text-xs font-bold rounded transition-all
                ${showPatterns
                  ? 'bg-terminal-amber/20 text-terminal-amber border border-terminal-amber/50'
                  : 'text-gray-500 hover:text-white border border-transparent hover:border-terminal-border'
                }
              `}
            >
              P
            </button>
            <button
              onClick={toggleNews}
              title="Toggle news markers"
              className={`
                w-6 h-6 flex items-center justify-center text-xs font-bold rounded transition-all
                ${showNews
                  ? 'bg-terminal-amber/20 text-terminal-amber border border-terminal-amber/50'
                  : 'text-gray-500 hover:text-white border border-transparent hover:border-terminal-border'
                }
              `}
            >
              N
            </button>
            <button
              onClick={() => setShowMarketContext(!showMarketContext)}
              title="Toggle market context panel"
              className={`
                w-6 h-6 flex items-center justify-center rounded transition-all
                ${showMarketContext
                  ? 'bg-terminal-amber/20 text-terminal-amber border border-terminal-amber/50'
                  : 'text-gray-500 hover:text-white border border-transparent hover:border-terminal-border'
                }
              `}
            >
              <Activity size={12} />
            </button>
          </div>

          {/* Drawing Tools */}
          <div className="flex items-center gap-1 border-l border-terminal-border pl-3">
            <button
              onClick={() => setDrawingMode(drawingMode === 'horizontal' ? null : 'horizontal')}
              title="Draw Horizontal Line (double-click chart)"
              className={`
                w-6 h-6 flex items-center justify-center rounded transition-all
                ${drawingMode === 'horizontal'
                  ? 'bg-terminal-amber text-black'
                  : 'text-gray-500 hover:text-white border border-transparent hover:border-terminal-border'
                }
              `}
            >
              <Minus size={14} />
            </button>
            <button
              onClick={() => setDrawingMode(drawingMode === 'trendline' ? null : 'trendline')}
              title="Draw Trendline (click two points)"
              className={`
                w-6 h-6 flex items-center justify-center rounded transition-all
                ${drawingMode === 'trendline'
                  ? 'bg-terminal-amber text-black'
                  : 'text-gray-500 hover:text-white border border-transparent hover:border-terminal-border'
                }
              `}
            >
              <TrendlineIcon size={14} />
            </button>
            {hasDrawings && (
              <button
                onClick={() => clearDrawings(selectedTicker)}
                title="Clear all drawings"
                className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-red-400 rounded transition-all hover:border-terminal-border border border-transparent"
              >
                <Trash2 size={14} />
              </button>
            )}
            {/* Drawing mode indicator */}
            {drawingMode && (
              <span className="text-terminal-amber text-[10px] ml-1">
                {drawingMode === 'horizontal' ? 'Dbl-click to place' : 'Click 2 pts'}
              </span>
            )}
          </div>

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

          {/* EST Timezone Display */}
          <div className="text-gray-500 text-[10px] tabular-nums" title="New York (EST/EDT)">
            {new Date().toLocaleTimeString('en-US', {
              timeZone: 'America/New_York',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })} EST
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

      {/* Market Context Panel (collapsible) */}
      {showMarketContext && (
        <div className="px-3 py-2 border-b border-terminal-border">
          <MarketContextPanel />
        </div>
      )}

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
