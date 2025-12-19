/**
 * RSSFeedsSection
 *
 * Settings section for managing RSS news feeds.
 */

import { useState, useEffect } from 'react'
import { Plus, Rss, Trash2, ChevronDown } from 'lucide-react'
import { useProTraderStore } from '../../../stores/proTraderStore'

interface RSSFeed {
  name: string
  url: string
  description: string
}

const POPULAR_RSS_FEEDS: RSSFeed[] = [
  { name: 'Reuters Markets', url: 'https://www.reuters.com/markets/rss', description: 'Breaking market news from Reuters' },
  { name: 'Bloomberg Markets', url: 'https://www.bloomberg.com/feed/markets', description: 'Global financial market coverage' },
  { name: 'CNBC Top News', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', description: 'Top business and market stories' },
  { name: 'WSJ Markets', url: 'https://feeds.wsj.com/wsj/xml/rss/3_7031.xml', description: 'Wall Street Journal market updates' },
  { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/rss/', description: 'Stock quotes and financial news' },
  { name: 'Seeking Alpha', url: 'https://seekingalpha.com/market_currents.xml', description: 'Stock analysis and investment ideas' },
  { name: 'Benzinga', url: 'https://www.benzinga.com/feed', description: 'Fast-moving market news' },
  { name: 'MarketWatch', url: 'https://www.marketwatch.com/rss/topstories', description: 'Stock market news and analysis' },
  { name: 'Investopedia', url: 'https://www.investopedia.com/feedbuilder/feed/getfeed?feedName=rss_headline', description: 'Financial education and news' },
  { name: 'The Motley Fool', url: 'https://www.fool.com/feeds/index.aspx', description: 'Investment advice and stock picks' },
  { name: 'TradingView', url: 'https://www.tradingview.com/feed/', description: 'Charts, analysis, and trading ideas' },
  { name: 'Barchart', url: 'https://www.barchart.com/news/authors/rss', description: 'Market data and financial news' },
]

export function RSSFeedsSection() {
  const { traders, loadTraders, addTrader, removeTrader, toggleTrader } = useProTraderStore()
  const [showFeedDropdown, setShowFeedDropdown] = useState(false)
  const [newTraderName, setNewTraderName] = useState('')
  const [newTraderUrl, setNewTraderUrl] = useState('')

  useEffect(() => {
    loadTraders()
  }, [loadTraders])

  const handleAddFeed = (feed: RSSFeed) => {
    addTrader({
      name: feed.name,
      handle: feed.url,
      source: 'rss',
      feedUrl: feed.url,
      enabled: true,
      addedAt: Date.now(),
    })
    setShowFeedDropdown(false)
  }

  const handleAddManualFeed = () => {
    if (newTraderName && newTraderUrl) {
      addTrader({
        name: newTraderName,
        handle: newTraderUrl,
        source: 'rss',
        feedUrl: newTraderUrl,
        enabled: true,
        addedAt: Date.now(),
      })
      setNewTraderName('')
      setNewTraderUrl('')
    }
  }

  return (
    <div>
      <h2 className="text-white text-lg font-medium mb-1">RSS Feeds</h2>
      <p className="text-gray-500 text-sm mb-6">Follow market news and analysis via RSS feeds</p>

      {/* Add Feed */}
      <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 mb-6">
        <h3 className="text-white text-sm font-medium mb-4">Add RSS Feed</h3>

        {/* Popular Feeds Dropdown */}
        <div className="relative mb-4">
          <button
            onClick={() => setShowFeedDropdown(!showFeedDropdown)}
            className="w-full py-2.5 px-3 bg-terminal-bg border border-terminal-border rounded text-sm text-left flex items-center justify-between hover:border-terminal-amber/50 transition-colors"
          >
            <span className="text-gray-400">Select popular feed...</span>
            <ChevronDown
              className={`w-4 h-4 text-gray-500 transition-transform ${
                showFeedDropdown ? 'rotate-180' : ''
              }`}
            />
          </button>

          {showFeedDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-terminal-panel border border-terminal-border rounded-lg overflow-hidden z-10 max-h-64 overflow-y-auto">
              {POPULAR_RSS_FEEDS.map((feed) => (
                <button
                  key={feed.name}
                  onClick={() => handleAddFeed(feed)}
                  className="w-full px-4 py-3 text-left hover:bg-terminal-border/50 transition-colors border-b border-terminal-border last:border-0"
                >
                  <div className="text-white text-sm font-medium">{feed.name}</div>
                  <div className="text-gray-500 text-xs">{feed.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="text-gray-500 text-xs text-center mb-4">or add manually</div>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Feed name"
            value={newTraderName}
            onChange={(e) => setNewTraderName(e.target.value)}
            className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-white placeholder:text-gray-600"
          />

          <input
            type="text"
            placeholder="https://example.com/feed/rss"
            value={newTraderUrl}
            onChange={(e) => setNewTraderUrl(e.target.value)}
            className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-white placeholder:text-gray-600"
          />

          <button
            onClick={handleAddManualFeed}
            disabled={!newTraderName || !newTraderUrl}
            className="w-full py-2 bg-terminal-amber text-black font-medium rounded text-sm hover:bg-terminal-amber/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Feed
          </button>
        </div>
      </div>

      {/* Feeds List */}
      {traders.length === 0 ? (
        <div className="text-gray-500 text-sm p-8 text-center border border-dashed border-terminal-border rounded-lg">
          No RSS feeds added yet.
          <br />
          <span className="text-gray-600 text-xs">
            Select from popular feeds or add manually above
          </span>
        </div>
      ) : (
        <div className="space-y-2">
          {traders.map((trader) => (
            <div
              key={trader.id}
              className="flex items-center justify-between p-3 bg-terminal-panel border border-terminal-border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Rss className="w-4 h-4 text-orange-400" />
                <div>
                  <p className="text-white text-sm">{trader.name}</p>
                  <p className="text-gray-500 text-xs truncate max-w-xs">{trader.handle}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => trader.id && toggleTrader(trader.id)}
                  className={`w-10 h-5 rounded-full transition-colors ${
                    trader.enabled ? 'bg-terminal-amber' : 'bg-terminal-border'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full transition-transform ${
                      trader.enabled ? 'translate-x-5 bg-yellow-900' : 'translate-x-0.5 bg-white'
                    }`}
                  />
                </button>

                <button
                  onClick={() => trader.id && removeTrader(trader.id)}
                  className="p-1.5 text-gray-500 hover:text-terminal-down hover:bg-terminal-down/10 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
