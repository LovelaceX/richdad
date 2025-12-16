import type { NewsItem as NewsItemType } from '../../types'
import { formatRelativeTime } from '../../lib/utils'

interface NewsItemProps {
  item: NewsItemType
}

export function NewsItem({ item }: NewsItemProps) {
  const sentimentColors = {
    positive: 'text-semantic-up',
    negative: 'text-semantic-down',
    neutral: 'text-gray-400',
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-gray-500">
        {formatRelativeTime(item.timestamp)}
      </span>

      <span className="text-terminal-amber font-semibold">
        {item.source}
      </span>

      {item.ticker && (
        <span className="text-white font-bold bg-terminal-border px-2 py-0.5 rounded text-base">
          ${item.ticker}
        </span>
      )}

      <span className={`${item.sentiment ? sentimentColors[item.sentiment] : 'text-gray-300'}`}>
        {item.headline}
      </span>
    </div>
  )
}
