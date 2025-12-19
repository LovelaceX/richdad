import { memo } from 'react'
import { X } from 'lucide-react'
import type { WatchlistItem as WatchlistItemType } from '../../types'
import { formatPrice, formatChange, formatPercent, getColorClass } from '../../lib/utils'
import { useMarketStore } from '../../stores/marketStore'
import { FreshnessBadge } from '../common'

interface WatchlistItemProps {
  item: WatchlistItemType
  isSelected: boolean
  onClick: () => void
  isTop10?: boolean  // Top 10 items cannot be removed
}

/**
 * WatchlistItem - Memoized to prevent re-renders when other items in the list change
 * Only re-renders when its specific props (item, isSelected, onClick, isTop10) change
 */
export const WatchlistItem = memo(function WatchlistItem({ item, isSelected, onClick, isTop10 = false }: WatchlistItemProps) {
  const { quote } = item
  const colorClass = quote ? getColorClass(quote.change) : 'text-gray-500'
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
      <span className={`font-semibold w-12 flex-shrink-0 text-xs ${isSelected ? 'text-terminal-amber' : 'text-white'}`}>
        {item.symbol}
      </span>

      <span className="text-right text-white tabular-nums w-14 flex-shrink-0 text-xs">
        {quote ? formatPrice(quote.price) : '—'}
      </span>

      <span className={`text-right tabular-nums w-12 flex-shrink-0 text-xs ${colorClass}`}>
        {quote ? formatChange(quote.change) : '—'}
      </span>

      <span className={`text-right tabular-nums w-12 flex-shrink-0 text-xs ${colorClass}`}>
        {quote ? formatPercent(quote.changePercent) : '—'}
      </span>

      {/* Data freshness indicator */}
      {quote && (
        <FreshnessBadge
          isFresh={quote.isFresh}
          cacheAge={quote.cacheAge}
          className="ml-2 flex-shrink-0"
        />
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Delete button - only visible on hover for non-Top10 items */}
      {!isTop10 && (
        <button
          onClick={handleDelete}
          className="p-0.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-all flex-shrink-0 opacity-0 group-hover:opacity-100"
          title="Remove from watchlist"
          aria-label={`Remove ${item.symbol} from watchlist`}
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
})
