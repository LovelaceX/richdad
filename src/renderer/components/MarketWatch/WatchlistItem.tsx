import { X } from 'lucide-react'
import type { WatchlistItem as WatchlistItemType } from '../../types'
import { formatPrice, formatChange, formatPercent, getColorClass } from '../../lib/utils'
import { useMarketStore } from '../../stores/marketStore'

interface WatchlistItemProps {
  item: WatchlistItemType
  isSelected: boolean
  onClick: () => void
}

export function WatchlistItem({ item, isSelected, onClick }: WatchlistItemProps) {
  const { quote } = item
  const colorClass = getColorClass(quote.change)
  const removeFromWatchlist = useMarketStore(state => state.removeFromWatchlist)

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()  // Prevent selecting the item when clicking delete
    removeFromWatchlist(item.symbol)
  }

  return (
    <div
      onClick={onClick}
      className={`
        group flex items-center px-3 py-2 cursor-pointer
        transition-colors duration-150
        ${isSelected
          ? 'bg-terminal-amber/10 border-l-2 border-terminal-amber'
          : 'hover:bg-terminal-border/30 border-l-2 border-transparent'
        }
      `}
    >
      <span className={`font-semibold w-14 flex-shrink-0 ${isSelected ? 'text-terminal-amber' : 'text-white'}`}>
        {item.symbol}
      </span>

      <span className="text-right text-white tabular-nums w-16 flex-shrink-0">
        {formatPrice(quote.price)}
      </span>

      <span className={`text-right tabular-nums w-14 flex-shrink-0 ${colorClass}`}>
        {formatChange(quote.change)}
      </span>

      <span className={`text-right tabular-nums w-14 flex-shrink-0 ${colorClass}`}>
        {formatPercent(quote.changePercent)}
      </span>

      {/* Spacer */}
      <div className="flex-1 min-w-2" />

      {/* Delete button - appears on hover, never overlaps */}
      <button
        onClick={handleDelete}
        className="p-1 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all flex-shrink-0"
        title="Remove from watchlist"
      >
        <X size={14} />
      </button>
    </div>
  )
}
