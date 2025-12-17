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
        group relative grid grid-cols-4 gap-1 px-3 py-2 cursor-pointer
        transition-colors duration-150
        ${isSelected
          ? 'bg-terminal-amber/10 border-l-2 border-terminal-amber'
          : 'hover:bg-terminal-border/30 border-l-2 border-transparent'
        }
      `}
    >
      <span className={`font-semibold ${isSelected ? 'text-terminal-amber' : 'text-white'}`}>
        {item.symbol}
      </span>

      <span className="text-right text-white tabular-nums">
        {formatPrice(quote.price)}
      </span>

      <span className={`text-right tabular-nums ${colorClass}`}>
        {formatChange(quote.change)}
      </span>

      <span className={`text-right tabular-nums ${colorClass}`}>
        {formatPercent(quote.changePercent)}
      </span>

      {/* Delete button - appears on hover */}
      <button
        onClick={handleDelete}
        className="absolute right-1 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
        title="Remove from watchlist"
      >
        <X size={14} />
      </button>
    </div>
  )
}
