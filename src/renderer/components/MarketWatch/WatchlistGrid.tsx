import { useMarketStore } from '../../stores/marketStore'
import { WatchlistItem } from './WatchlistItem'

export function WatchlistGrid() {
  const top10 = useMarketStore(state => state.top10)
  const userWatchlist = useMarketStore(state => state.userWatchlist)
  const selectedTicker = useMarketStore(state => state.selectedTicker)
  const setSelectedTicker = useMarketStore(state => state.setSelectedTicker)

  return (
    <div className="text-xs min-w-[220px]">
      {/* Header - matches WatchlistItem flex layout */}
      <div className="flex items-center px-3 py-2 border-b border-terminal-border text-gray-500 font-semibold sticky top-0 bg-terminal-panel">
        <span className="w-12 flex-shrink-0">Symbol</span>
        <span className="text-right w-14 flex-shrink-0">Price</span>
        <span className="text-right w-12 flex-shrink-0">Chg</span>
        <span className="text-right w-12 flex-shrink-0">%</span>
        {/* Spacer for badge column */}
        <span className="w-12 flex-shrink-0" />
        {/* Spacer for delete column */}
        <span className="w-5 flex-shrink-0" />
      </div>

      {/* Top 10 Section */}
      {top10.length > 0 ? (
        <div>
          {top10.map(item => (
            <WatchlistItem
              key={item.symbol}
              item={item}
              isSelected={item.symbol === selectedTicker}
              onClick={() => setSelectedTicker(item.symbol)}
              isTop10={true}
            />
          ))}
        </div>
      ) : (
        <div className="px-3 py-4 text-center text-gray-500 text-[10px]">
          <p>No market data</p>
          <p className="mt-1">Settings → Data Sources</p>
        </div>
      )}

      {/* Divider - only show if user has custom watchlist items */}
      {userWatchlist.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-y border-terminal-border/50 bg-terminal-bg/50">
          <span className="text-gray-500 text-[10px] uppercase tracking-wider">My Watchlist</span>
          <div className="flex-1 h-px bg-terminal-border/30" />
        </div>
      )}

      {/* User Watchlist Section */}
      {userWatchlist.length > 0 && (
        <div>
          {userWatchlist.map(item => (
            <WatchlistItem
              key={item.symbol}
              item={item}
              isSelected={item.symbol === selectedTicker}
              onClick={() => setSelectedTicker(item.symbol)}
              isTop10={false}
            />
          ))}
        </div>
      )}
    </div>
  )
}
