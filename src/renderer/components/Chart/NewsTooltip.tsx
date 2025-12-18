import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, ExternalLink, Newspaper } from 'lucide-react'
import type { NewsItem } from '../../types'

interface NewsTooltipProps {
  news: NewsItem
  position: { x: number; y: number }
  onClose: () => void
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getSentimentColor(sentiment?: string): string {
  switch (sentiment) {
    case 'positive':
      return 'text-green-400'
    case 'negative':
      return 'text-red-400'
    default:
      return 'text-gray-400'
  }
}

export function NewsTooltip({ news, position, onClose }: NewsTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // Calculate position to keep tooltip within viewport and near the marker
  const getAdjustedPosition = () => {
    const tooltipWidth = 320
    const tooltipHeight = 180
    const padding = 16
    const offset = 10

    let x = position.x
    let y = position.y

    // Adjust horizontal position - prefer right of click, fall back to left
    if (x + tooltipWidth + offset + padding > window.innerWidth) {
      x = position.x - tooltipWidth - offset
    } else {
      x = position.x + offset
    }

    // Keep horizontal within bounds
    if (x < padding) x = padding
    if (x + tooltipWidth > window.innerWidth - padding) {
      x = window.innerWidth - tooltipWidth - padding
    }

    // Adjust vertical position - prefer below click, fall back to above
    if (y + tooltipHeight + offset + padding > window.innerHeight) {
      // Try above the click point
      y = position.y - tooltipHeight - offset
    } else {
      y = position.y + offset
    }

    // Keep vertical within bounds
    if (y < padding) y = padding
    if (y + tooltipHeight > window.innerHeight - padding) {
      y = window.innerHeight - tooltipHeight - padding
    }

    return { x, y }
  }

  const adjustedPosition = getAdjustedPosition()

  return (
    <motion.div
      ref={tooltipRef}
      initial={{ opacity: 0, scale: 0.95, y: -5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -5 }}
      transition={{ duration: 0.15 }}
      className="fixed z-50 w-[320px] bg-terminal-panel border border-terminal-border rounded-lg shadow-xl overflow-hidden"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-3 border-b border-terminal-border bg-terminal-bg">
        <div className="flex-shrink-0 p-2 bg-terminal-panel rounded border border-terminal-amber/30">
          <Newspaper size={18} className="text-terminal-amber" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium text-sm line-clamp-2 leading-tight">
            {news.headline}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-terminal-bg rounded transition-colors flex-shrink-0"
        >
          <X size={14} className="text-gray-500 hover:text-white" />
        </button>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {/* Summary if available */}
        {news.summary && (
          <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">
            {news.summary}
          </p>
        )}

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-terminal-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Source:</span>
              <span className="text-gray-300">{news.source}</span>
            </div>
            {news.sentiment && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Sentiment:</span>
                <span className={getSentimentColor(news.sentiment)}>
                  {news.sentiment.charAt(0).toUpperCase() + news.sentiment.slice(1)}
                </span>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-gray-300">{formatTime(news.timestamp)}</div>
            <div className="text-gray-500">{formatDate(news.timestamp)}</div>
          </div>
        </div>

        {/* Read more link */}
        {news.url && (
          <a
            href={news.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-terminal-amber hover:text-amber-400 transition-colors text-xs mt-2 pt-2 border-t border-terminal-border"
          >
            <ExternalLink size={12} />
            <span>Read full article</span>
          </a>
        )}
      </div>
    </motion.div>
  )
}

// News marker data type (matches news to candle time)
export interface NewsMarker {
  news: NewsItem
  candleTime: number // Unix timestamp in seconds
}

// Helper to match news items to candle timestamps
export function matchNewsToCandles(
  news: NewsItem[],
  candles: { time: number }[],
  timeframeMinutes: number = 5
): NewsMarker[] {
  if (!candles.length || !news.length) return []

  const toleranceSeconds = timeframeMinutes * 60

  return news
    .map(item => {
      // Normalize timestamp: if > 1e12, it's in milliseconds, convert to seconds
      const normalizedNewsTime = item.timestamp > 1e12 ? item.timestamp / 1000 : item.timestamp

      // Find closest candle within tolerance
      const matchedCandle = candles.find(c =>
        Math.abs(c.time - normalizedNewsTime) < toleranceSeconds
      )

      return matchedCandle
        ? { news: item, candleTime: matchedCandle.time }
        : null
    })
    .filter((m): m is NewsMarker => m !== null)
}
