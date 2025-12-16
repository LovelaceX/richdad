import { useState, useMemo } from 'react'
import { Newspaper, Filter, TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react'
import { openUrl } from '@tauri-apps/plugin-opener'
import { useNewsStore } from '../stores/newsStore'
import { useMarketStore } from '../stores/marketStore'
import type { NewsItem } from '../types'

type FilterType = 'all' | 'watchlist' | 'positive' | 'negative' | 'neutral'

export function News() {
  const [filter, setFilter] = useState<FilterType>('all')
  const headlines = useNewsStore(state => state.headlines)
  const watchlist = useMarketStore(state => state.watchlist)

  const filteredNews = useMemo(() => {
    return headlines.filter((item: NewsItem) => {
      if (filter === 'all') return true
      if (filter === 'watchlist') {
        return item.ticker && watchlist.some(w => w.symbol === item.ticker)
      }
      if (filter === 'positive') return item.sentiment === 'positive'
      if (filter === 'negative') return item.sentiment === 'negative'
      if (filter === 'neutral') return item.sentiment === 'neutral'
      return true
    })
  }, [headlines, filter, watchlist])

  const getSentimentIcon = (sentiment?: 'positive' | 'negative' | 'neutral') => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-terminal-up" />
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-terminal-down" />
      default:
        return <Minus className="w-4 h-4 text-gray-500" />
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  const handleNewsClick = async (item: NewsItem) => {
    if (!item.url) {
      console.warn('News item has no URL:', item.headline)
      return
    }

    try {
      await openUrl(item.url)
    } catch (error) {
      console.error('Failed to open URL:', error)
      // Fallback to window.open in case we're in browser dev mode
      window.open(item.url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-terminal-bg overflow-hidden">
      {/* Header */}
      <div className="h-12 bg-terminal-panel border-b border-terminal-border flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-terminal-amber" />
          <span className="text-white font-medium">Market News</span>
          <span className="text-gray-500 text-sm">({filteredNews.length})</span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1">
          <Filter className="w-4 h-4 text-gray-500 mr-2" />
          {(['all', 'watchlist', 'positive', 'negative', 'neutral'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                filter === f
                  ? 'bg-terminal-amber/20 text-terminal-amber'
                  : 'text-gray-400 hover:text-white hover:bg-terminal-border/50'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* News Feed - Centered Single Column */}
      <div className="flex-1 overflow-y-auto flex justify-center">
        <div className="w-full max-w-[800px] p-4">
          <div className="space-y-3">
            {filteredNews.length === 0 ? (
              <div className="text-center py-12">
                <Newspaper className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">No news articles found</p>
                <p className="text-gray-600 text-sm mt-1">Try changing your filter or check back later</p>
              </div>
            ) : (
              filteredNews.map((item: NewsItem) => (
                <div
                  key={item.id}
                  onClick={() => handleNewsClick(item)}
                  className={`
                    bg-terminal-panel border border-terminal-border rounded-lg p-4
                    transition-all duration-200 group
                    ${item.url
                      ? 'cursor-pointer hover:scale-[1.01] hover:border-terminal-amber/50 hover:shadow-lg'
                      : 'cursor-default'
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    {/* Sentiment Indicator */}
                    <div className="mt-0.5 flex-shrink-0">
                      {getSentimentIcon(item.sentiment)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Headline */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="text-white text-sm font-medium leading-relaxed flex-1">
                          {item.headline}
                          {item.ticker && (
                            <span className="inline-block ml-2 text-terminal-amber text-xs font-mono bg-terminal-amber/10 px-1.5 py-0.5 rounded">
                              ${item.ticker}
                            </span>
                          )}
                        </h3>
                        {item.url && (
                          <div className="flex items-center gap-1 text-gray-500 group-hover:text-terminal-amber transition-colors flex-shrink-0">
                            <span className="text-xs font-medium">View</span>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-gray-400">{item.source}</span>
                        <span className="text-gray-600">•</span>
                        <span className="text-gray-500">{formatTime(item.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
