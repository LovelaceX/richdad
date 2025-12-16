import type { WatchlistItem as WatchlistItemType } from '../../types'
import { formatPrice, formatChange, formatPercent, getColorClass } from '../../lib/utils'

interface WatchlistItemProps {
  item: WatchlistItemType
  isSelected: boolean
  onClick: () => void
}

export function WatchlistItem({ item, isSelected, onClick }: WatchlistItemProps) {
  const { quote } = item
  const colorClass = getColorClass(quote.change)

  return (
    <div
      onClick={onClick}
      className={`
        grid grid-cols-4 gap-1 px-3 py-2 cursor-pointer
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
    </div>
  )
}
