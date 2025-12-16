import { useMarketStore } from '../../stores/marketStore'
import { WatchlistItem } from './WatchlistItem'

export function WatchlistGrid() {
  const watchlist = useMarketStore(state => state.watchlist)
  const selectedTicker = useMarketStore(state => state.selectedTicker)
  const setSelectedTicker = useMarketStore(state => state.setSelectedTicker)

  return (
    <div className="text-xs">
      {/* Header */}
      <div className="grid grid-cols-4 gap-1 px-3 py-2 border-b border-terminal-border text-gray-500 font-semibold sticky top-0 bg-terminal-panel">
        <span>Symbol</span>
        <span className="text-right">Price</span>
        <span className="text-right">Chg</span>
        <span className="text-right">%</span>
      </div>

      {/* Rows */}
      <div>
        {watchlist.map(item => (
          <WatchlistItem
            key={item.symbol}
            item={item}
            isSelected={item.symbol === selectedTicker}
            onClick={() => setSelectedTicker(item.symbol)}
          />
        ))}
      </div>
    </div>
  )
}
