import { useMarketStore } from '../../stores/marketStore'
import { WatchlistItem } from './WatchlistItem'

export function WatchlistGrid() {
  const watchlist = useMarketStore(state => state.watchlist)
  const selectedTicker = useMarketStore(state => state.selectedTicker)
  const setSelectedTicker = useMarketStore(state => state.setSelectedTicker)

  return (
    <div className="text-xs">
      {/* Header - matches WatchlistItem flex layout */}
      <div className="flex items-center px-2 py-2 border-b border-terminal-border text-gray-500 font-semibold sticky top-0 bg-terminal-panel">
        <span className="w-11 flex-shrink-0">Symbol</span>
        <span className="text-right w-12 flex-shrink-0">Price</span>
        <span className="text-right w-11 flex-shrink-0">Chg</span>
        <span className="text-right w-11 flex-shrink-0">%</span>
        {/* Spacer for delete column */}
        <span className="w-6 flex-shrink-0" />
      </div>

      {/* Watchlist Items */}
      {watchlist.length > 0 ? (
        <div>
          {watchlist.map(item => (
            <WatchlistItem
              key={item.symbol}
              item={item}
              isSelected={item.symbol === selectedTicker}
              onClick={() => setSelectedTicker(item.symbol)}
              isTop10={false}
            />
          ))}
        </div>
      ) : (
        <div className="px-3 py-4 text-center text-gray-500 text-[10px]">
          <p>No symbols in watchlist</p>
          <p className="mt-1">Click + to add symbols</p>
        </div>
      )}
    </div>
  )
}
