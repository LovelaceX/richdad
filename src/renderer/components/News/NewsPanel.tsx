/**
 * NewsPanel - Market News with Filter Chips (Option B Layout)
 *
 * Single scrollable list with filter chips for sentiment and watchlist filtering.
 * Replaces the old slide-in modal with a more scannable, filterable interface.
 */

import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  ExternalLink,
  Filter,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  RefreshCw
} from 'lucide-react'
import { useNewsStore } from '../../stores/newsStore'
import { useMarketStore } from '../../stores/marketStore'
import type { NewsItem } from '../../types'

type SentimentFilter = 'all' | 'positive' | 'negative' | 'watchlist'
type SortOption = 'latest' | 'oldest'

interface NewsPanelProps {
  isOpen: boolean
  onClose: () => void
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function SentimentIcon({ sentiment }: { sentiment?: 'positive' | 'negative' | 'neutral' }) {
  switch (sentiment) {
    case 'positive':
      return <TrendingUp className="w-4 h-4 text-terminal-up" />
    case 'negative':
      return <TrendingDown className="w-4 h-4 text-terminal-down" />
    default:
      return <Minus className="w-4 h-4 text-gray-500" />
  }
}

/**
 * Shows a brief "Just updated" badge that fades out after 5 seconds
 */
function JustUpdatedBadge({ lastUpdated }: { lastUpdated: number | null }) {
  const [visible, setVisible] = useState(false)
  const [secondsAgo, setSecondsAgo] = useState(0)
  const lastSeenRef = useRef<number | null>(null)
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Only show badge when lastUpdated changes to a new value
    if (lastUpdated && lastUpdated !== lastSeenRef.current) {
      lastSeenRef.current = lastUpdated
      setSecondsAgo(0)
      setVisible(true)

      // Clear any existing timeout
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current)
      }

      // Hide badge after 5 seconds
      fadeTimeoutRef.current = setTimeout(() => {
        setVisible(false)
      }, 5000)

      // Update seconds counter
      const interval = setInterval(() => {
        if (lastUpdated) {
          const secs = Math.floor((Date.now() - lastUpdated) / 1000)
          setSecondsAgo(secs)
          if (secs >= 5) {
            clearInterval(interval)
          }
        }
      }, 1000)

      return () => {
        clearInterval(interval)
        if (fadeTimeoutRef.current) {
          clearTimeout(fadeTimeoutRef.current)
        }
      }
    }
  }, [lastUpdated])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current)
      }
    }
  }, [])

  if (!visible) return null

  return (
    <motion.span
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="flex items-center gap-1 text-xs text-terminal-up bg-terminal-up/10 px-2 py-0.5 rounded-full"
    >
      <RefreshCw className="w-3 h-3" />
      <span>Updated {secondsAgo}s ago</span>
    </motion.span>
  )
}

function FilterChip({
  label,
  count,
  active,
  color,
  onClick
}: {
  label: string
  count: number
  active: boolean
  color: 'default' | 'green' | 'red' | 'amber'
  onClick: () => void
}) {
  const colorClasses = {
    default: active
      ? 'bg-terminal-border text-white border-terminal-amber'
      : 'bg-terminal-bg text-gray-400 border-terminal-border hover:border-gray-500',
    green: active
      ? 'bg-terminal-up/20 text-terminal-up border-terminal-up'
      : 'bg-terminal-bg text-gray-400 border-terminal-border hover:border-terminal-up/50',
    red: active
      ? 'bg-terminal-down/20 text-terminal-down border-terminal-down'
      : 'bg-terminal-bg text-gray-400 border-terminal-border hover:border-terminal-down/50',
    amber: active
      ? 'bg-terminal-amber/20 text-terminal-amber border-terminal-amber'
      : 'bg-terminal-bg text-gray-400 border-terminal-border hover:border-terminal-amber/50',
  }

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5 ${colorClasses[color]}`}
    >
      {label}
      <span className={`text-[10px] ${active ? 'opacity-80' : 'opacity-60'}`}>({count})</span>
    </button>
  )
}

function NewsRow({
  item,
  isInWatchlist,
  expanded,
  onToggleExpand
}: {
  item: NewsItem
  isInWatchlist: boolean
  expanded: boolean
  onToggleExpand: () => void
}) {
  const sentimentBg = {
    positive: 'border-l-terminal-up',
    negative: 'border-l-terminal-down',
    neutral: 'border-l-gray-600',
  }

  return (
    <div
      className={`border-l-2 ${sentimentBg[item.sentiment || 'neutral']} bg-terminal-bg hover:bg-terminal-panel transition-colors cursor-pointer`}
      onClick={onToggleExpand}
    >
      <div className="flex items-start gap-3 p-3">
        {/* Sentiment icon */}
        <div className="flex-shrink-0 pt-0.5">
          <SentimentIcon sentiment={item.sentiment} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Ticker + Watchlist indicator */}
          <div className="flex items-center gap-2 mb-1">
            {item.ticker && (
              <span className="text-terminal-amber font-mono text-xs font-semibold">
                ${item.ticker}
              </span>
            )}
            {isInWatchlist && (
              <Star className="w-3 h-3 text-terminal-amber fill-terminal-amber" />
            )}
          </div>

          {/* Headline */}
          <p className={`text-gray-200 text-sm leading-snug ${expanded ? '' : 'line-clamp-2'}`}>
            {item.headline}
          </p>

          {/* Expanded content */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                {item.summary && (
                  <p className="text-gray-400 text-xs mt-2 leading-relaxed">
                    {item.summary}
                  </p>
                )}
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-terminal-amber text-xs mt-2 hover:underline"
                  >
                    Read full article <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Meta row */}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTimeAgo(item.timestamp)}
            </span>
            <span>{item.source}</span>
          </div>
        </div>

        {/* Expand indicator */}
        <div className="flex-shrink-0 text-gray-500">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>
    </div>
  )
}

export function NewsPanel({ isOpen, onClose }: NewsPanelProps) {
  const headlines = useNewsStore((state) => state.headlines)
  const loading = useNewsStore((state) => state.loading)
  const lastUpdated = useNewsStore((state) => state.lastUpdated)
  const watchlist = useMarketStore((state) => state.watchlist)

  const [filter, setFilter] = useState<SentimentFilter>('all')
  const [sort, setSort] = useState<SortOption>('latest')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Get watchlist symbols for filtering
  const watchlistSymbols = useMemo(() =>
    new Set(watchlist.map(item => item.symbol)),
    [watchlist]
  )

  // Count items by sentiment
  const counts = useMemo(() => {
    return {
      all: headlines.length,
      positive: headlines.filter(h => h.sentiment === 'positive').length,
      negative: headlines.filter(h => h.sentiment === 'negative').length,
      watchlist: headlines.filter(h =>
        h.ticker && watchlistSymbols.has(h.ticker) ||
        h.tickers?.some(t => watchlistSymbols.has(t))
      ).length,
    }
  }, [headlines, watchlistSymbols])

  // Filter and sort headlines
  const filteredHeadlines = useMemo(() => {
    let filtered = [...headlines]

    // Apply filter
    if (filter === 'positive') {
      filtered = filtered.filter(h => h.sentiment === 'positive')
    } else if (filter === 'negative') {
      filtered = filtered.filter(h => h.sentiment === 'negative')
    } else if (filter === 'watchlist') {
      filtered = filtered.filter(h =>
        h.ticker && watchlistSymbols.has(h.ticker) ||
        h.tickers?.some(t => watchlistSymbols.has(t))
      )
    }

    // Apply sort
    if (sort === 'latest') {
      filtered.sort((a, b) => b.timestamp - a.timestamp)
    } else {
      filtered.sort((a, b) => a.timestamp - b.timestamp)
    }

    return filtered
  }, [headlines, filter, sort, watchlistSymbols])

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-terminal-panel border border-terminal-border rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-terminal-border">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-terminal-amber" />
            <h2 className="text-white font-semibold">Market News</h2>
            <span className="text-gray-500 text-sm">({filteredHeadlines.length})</span>
            <AnimatePresence>
              <JustUpdatedBadge lastUpdated={lastUpdated} />
            </AnimatePresence>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-terminal-border rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex items-center gap-2 p-4 border-b border-terminal-border overflow-x-auto">
          <FilterChip
            label="All"
            count={counts.all}
            active={filter === 'all'}
            color="default"
            onClick={() => setFilter('all')}
          />
          <FilterChip
            label="Positive"
            count={counts.positive}
            active={filter === 'positive'}
            color="green"
            onClick={() => setFilter('positive')}
          />
          <FilterChip
            label="Negative"
            count={counts.negative}
            active={filter === 'negative'}
            color="red"
            onClick={() => setFilter('negative')}
          />
          <FilterChip
            label="Watchlist"
            count={counts.watchlist}
            active={filter === 'watchlist'}
            color="amber"
            onClick={() => setFilter('watchlist')}
          />

          <div className="flex-1" />

          {/* Sort dropdown */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-terminal-amber"
          >
            <option value="latest">Latest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>

        {/* News list */}
        <div className="flex-1 overflow-y-auto divide-y divide-terminal-border">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-terminal-amber border-t-transparent rounded-full" />
            </div>
          ) : filteredHeadlines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Filter className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No news matching this filter</p>
              <button
                onClick={() => setFilter('all')}
                className="text-terminal-amber text-sm mt-2 hover:underline"
              >
                Clear filter
              </button>
            </div>
          ) : (
            filteredHeadlines.map((item) => (
              <NewsRow
                key={item.id}
                item={item}
                isInWatchlist={
                  (item.ticker && watchlistSymbols.has(item.ticker)) ||
                  (item.tickers?.some(t => watchlistSymbols.has(t))) ||
                  false
                }
                expanded={expandedId === item.id}
                onToggleExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-3 border-t border-terminal-border text-xs text-gray-500">
          <span>Sentiment powered by FinBERT + keyword analysis</span>
          <span>{counts.positive} positive, {counts.negative} negative</span>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default NewsPanel
