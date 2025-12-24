/**
 * NewsSourcesSection
 *
 * Settings section for managing news sources, filtering, and sentiment analysis.
 * Combines RSS feed management with AI-powered news filtering options.
 */

import { useState, useEffect } from 'react'
import {
  Plus,
  Rss,
  Trash2,
  ChevronDown,
  Brain,
  Filter,
  ExternalLink,
  Check,
  Info
} from 'lucide-react'
import { useProTraderStore } from '../../../stores/proTraderStore'
import { getSettings, updateSettings, type UserSettings } from '../../../lib/db'

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
  { name: 'TradingView', url: 'https://www.tradingview.com/feed/', description: 'Charts, analysis, and trading ideas' },
  { name: 'Barchart', url: 'https://www.barchart.com/news/authors/rss', description: 'Market data and financial news' },
]

export function NewsSourcesSection() {
  const { traders, loadTraders, addTrader, removeTrader, toggleTrader } = useProTraderStore()
  const [showFeedDropdown, setShowFeedDropdown] = useState(false)
  const [newTraderName, setNewTraderName] = useState('')
  const [newTraderUrl, setNewTraderUrl] = useState('')
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [showSaved, setShowSaved] = useState(false)

  // Check if API provider has built-in news
  const providerHasNews = settings?.marketDataProvider === 'finnhub' ||
    (settings?.marketDataProvider === 'alphavantage' && settings?.apiTiers?.alphaVantage === 'premium')

  useEffect(() => {
    loadTraders()
    getSettings().then(setSettings)
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

  const saveSettings = async (updates: Partial<UserSettings>) => {
    if (!settings) return
    setSaving(true)
    const newSettings = { ...settings, ...updates }
    await updateSettings(newSettings)
    setSettings(newSettings)
    setSaving(false)
    setShowSaved(true)
    setTimeout(() => setShowSaved(false), 2000)
  }

  if (!settings) {
    return <div className="text-gray-500">Loading...</div>
  }

  const headlineLimit = settings.headlineLimit ?? 20
  const aiNewsFiltering = settings.aiNewsFiltering ?? false
  const huggingFaceToken = settings.huggingFaceToken ?? ''

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-white text-lg font-medium mb-1">News Sources</h2>
        <p className="text-gray-500 text-sm">Configure news feeds, filtering, and sentiment analysis</p>
      </div>

      {/* Headline Limit */}
      <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-terminal-amber" />
          <h3 className="text-white text-sm font-medium">Headline Limit</h3>
        </div>
        <p className="text-gray-500 text-xs mb-4">
          Limit the number of headlines displayed per hour to avoid information overload.
        </p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={5}
            max={50}
            value={headlineLimit}
            onChange={(e) => saveSettings({ headlineLimit: Number(e.target.value) })}
            className="flex-1 accent-terminal-amber"
          />
          <span className="text-white text-sm font-mono w-12 text-right">{headlineLimit}/hr</span>
        </div>
      </div>

      {/* AI News Filtering */}
      <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-terminal-amber" />
            <h3 className="text-white text-sm font-medium">AI News Filtering</h3>
          </div>
          <button
            onClick={() => saveSettings({ aiNewsFiltering: !aiNewsFiltering })}
            className={`w-10 h-5 rounded-full transition-colors ${
              aiNewsFiltering ? 'bg-terminal-amber' : 'bg-terminal-border'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full transition-transform ${
                aiNewsFiltering ? 'translate-x-5 bg-yellow-900' : 'translate-x-0.5 bg-white'
              }`}
            />
          </button>
        </div>
        <p className="text-gray-500 text-xs mt-2">
          Filter news based on your watchlist, market watch symbols, and currently viewed chart.
          Only show headlines relevant to your interests.
        </p>
      </div>

      {/* Sentiment Analysis (HF Token) */}
      <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-terminal-amber" />
          <h3 className="text-white text-sm font-medium">Sentiment Analysis</h3>
          <span className="text-green-400 text-xs flex items-center gap-1">
            <Check className="w-3 h-3" /> Working
          </span>
        </div>
        <p className="text-gray-500 text-xs mb-4">
          Headlines are automatically analyzed for sentiment using FinBERT.
          Add a Hugging Face token for faster, more reliable analysis (optional).
        </p>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Info className="w-3 h-3" />
            <span>Takes 30 seconds to get a free token</span>
          </div>
          <a
            href="https://huggingface.co/settings/tokens/new?tokenType=fineGrained"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-terminal-amber text-sm hover:underline"
          >
            Get Free Token
            <ExternalLink className="w-3 h-3" />
          </a>

          <div className="flex gap-2">
            <input
              type="password"
              placeholder="hf_xxxxxxxxxx..."
              value={huggingFaceToken}
              onChange={(e) => saveSettings({ huggingFaceToken: e.target.value })}
              className="flex-1 bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-white placeholder:text-gray-600 font-mono"
            />
            {huggingFaceToken && (
              <button
                onClick={() => saveSettings({ huggingFaceToken: '' })}
                className="px-3 py-2 text-gray-400 hover:text-white transition-colors"
                title="Clear token"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-gray-600 text-xs">
            100% optional. Sentiment works without it.
          </p>
        </div>
      </div>

      {/* RSS Feeds Section */}
      <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Rss className="w-4 h-4 text-orange-400" />
          <h3 className="text-white text-sm font-medium">RSS Feeds</h3>
        </div>

        {/* Provider has news notice */}
        {providerHasNews && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-blue-200 text-xs">
                <p className="font-medium mb-1">Your market data provider includes news</p>
                <p className="text-blue-300/70">
                  {settings.marketDataProvider === 'finnhub' ? 'Finnhub' : 'Alpha Vantage Premium'} provides
                  ticker-specific news. RSS feeds are still available but may show duplicate headlines.
                </p>
              </div>
            </div>
          </div>
        )}

        <p className="text-gray-500 text-xs mb-4">
          Follow market news and analysis via RSS feeds
        </p>

        {/* Add Feed Dropdown */}
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
      {traders.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-white text-sm font-medium mb-3">Active Feeds ({traders.length})</h3>
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

      {traders.length === 0 && (
        <div className="text-gray-500 text-sm p-8 text-center border border-dashed border-terminal-border rounded-lg">
          No RSS feeds added yet.
          <br />
          <span className="text-gray-600 text-xs">
            Select from popular feeds or add manually above
          </span>
        </div>
      )}

      {/* Saving indicator */}
      {(saving || showSaved) && (
        <div className="fixed bottom-4 right-4 bg-terminal-amber text-black px-4 py-2 rounded-lg text-sm flex items-center gap-2">
          {saving ? 'Saving...' : <><Check className="w-4 h-4" /> Saved!</>}
        </div>
      )}
    </div>
  )
}
