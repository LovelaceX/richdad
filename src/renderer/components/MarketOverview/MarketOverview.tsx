import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Clock, Trophy, Activity, BarChart3 } from 'lucide-react'
import { getAIPerformanceStats, getSettings } from '../../lib/db'
import { calculateMarketRegime, getRegimeLabel, type MarketRegime } from '../../../services/marketRegime'
import { useMarketStore } from '../../stores/marketStore'
import { SetupPrompt } from '../common/SetupPrompt'

// ETF to display name mapping (common ETFs get friendly names)
const ETF_DISPLAY_NAMES: Record<string, string> = {
  SPY: 'S&P 500',
  QQQ: 'NASDAQ',
  DIA: 'DOW',
  VXX: 'VIX',
  IWM: 'Russell 2K',
  GLD: 'Gold',
  TLT: 'Bonds',
  USO: 'Oil',
}

// Default symbols for market overview
const DEFAULT_MARKET_SYMBOLS = ['SPY', 'QQQ', 'DIA', 'VXX']

function getMarketStatus(): { isOpen: boolean; status: string } {
  const now = new Date()
  const day = now.getDay()
  const hour = now.getHours()
  const minute = now.getMinutes()
  const time = hour * 100 + minute

  // Market hours: 9:30 AM - 4:00 PM ET, Mon-Fri
  // This is simplified and doesn't account for holidays
  const isWeekday = day >= 1 && day <= 5
  const isMarketHours = time >= 930 && time < 1600

  if (!isWeekday) {
    return { isOpen: false, status: 'WEEKEND' }
  }

  if (time < 930) {
    return { isOpen: false, status: 'PRE-MARKET' }
  }

  if (time >= 1600 && time < 2000) {
    return { isOpen: false, status: 'AFTER-HOURS' }
  }

  if (isMarketHours) {
    return { isOpen: true, status: 'MARKET OPEN' }
  }

  return { isOpen: false, status: 'CLOSED' }
}

// Get color class for regime risk level
function getRegimeColorClass(regime: MarketRegime | null): string {
  if (!regime) return 'text-gray-500'
  switch (regime.riskLevel) {
    case 'low': return 'text-terminal-up'
    case 'moderate': return 'text-terminal-amber'
    case 'high': return 'text-orange-500'
    case 'extreme': return 'text-terminal-down'
    default: return 'text-gray-500'
  }
}

export function MarketOverview() {
  const [marketStatus, setMarketStatus] = useState(getMarketStatus())
  const [aiWinRate, setAiWinRate] = useState<{ winRate: number; record: string } | null>(null)
  const [marketRegime, setMarketRegime] = useState<MarketRegime | null>(null)
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null)
  const [marketSymbols, setMarketSymbols] = useState<string[]>(DEFAULT_MARKET_SYMBOLS)

  // Get watchlist from market store (quotes are stored on each item)
  const watchlist = useMarketStore(state => state.watchlist)

  // Load custom market symbols from settings
  useEffect(() => {
    async function loadMarketSymbols() {
      try {
        const settings = await getSettings()
        if (settings.marketOverviewSymbols?.length) {
          setMarketSymbols(settings.marketOverviewSymbols)
        }
      } catch (error) {
        console.error('Failed to load market symbols:', error)
      }
    }

    loadMarketSymbols()

    // Listen for settings changes
    const handleSettingsChange = () => {
      loadMarketSymbols()
    }

    window.addEventListener('settings-updated', handleSettingsChange)
    return () => window.removeEventListener('settings-updated', handleSettingsChange)
  }, [])

  // Filter watchlist to configured symbols and map to display format
  const marketIndices = marketSymbols.map(sym => {
    const item = watchlist.find(w => w.symbol === sym)
    if (!item?.quote) return null
    return {
      symbol: sym,
      name: ETF_DISPLAY_NAMES[sym] || sym,
      price: item.quote.price,
      change: item.quote.change,
      changePercent: item.quote.changePercent,
    }
  }).filter((idx): idx is NonNullable<typeof idx> => idx !== null)

  // Check if any API key is configured
  useEffect(() => {
    async function checkApiKeys() {
      try {
        const settings = await getSettings()
        const hasKey = !!(
          settings.polygonApiKey ||
          settings.alphaVantageApiKey ||
          settings.finnhubApiKey ||
          settings.twelvedataApiKey
        )
        setHasApiKey(hasKey)
      } catch (error) {
        console.error('Failed to check API keys:', error)
        setHasApiKey(false)
      }
    }

    checkApiKeys()

    // Listen for API settings changes
    const handleApiSettingsChange = () => {
      checkApiKeys()
    }

    window.addEventListener('api-settings-updated', handleApiSettingsChange)
    return () => window.removeEventListener('api-settings-updated', handleApiSettingsChange)
  }, [])

  // Load market regime
  useEffect(() => {
    async function loadRegime() {
      try {
        const regime = await calculateMarketRegime()
        setMarketRegime(regime)
      } catch (error) {
        console.error('Failed to load market regime:', error)
      }
    }

    loadRegime()
    // Refresh every 5 minutes
    const interval = setInterval(loadRegime, 300000)
    return () => clearInterval(interval)
  }, [])

  // Load AI performance
  useEffect(() => {
    async function loadAIPerformance() {
      try {
        const stats = await getAIPerformanceStats(30)
        if (stats.completed > 0) {
          setAiWinRate({
            winRate: stats.winRate,
            record: `${stats.wins}-${stats.losses}`
          })
        }
      } catch (error) {
        console.error('Failed to load AI performance:', error)
      }
    }

    loadAIPerformance()
    // Refresh every 5 minutes
    const interval = setInterval(loadAIPerformance, 300000)
    return () => clearInterval(interval)
  }, [])

  // Update market status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketStatus(getMarketStatus())
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [])

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
    return price.toFixed(2)
  }

  return (
    <div className="h-8 bg-terminal-panel border-b border-terminal-border flex items-center px-4 gap-6 overflow-x-auto">
      {/* Show indices if we have data, otherwise show setup prompt */}
      {marketIndices.length > 0 ? (
        marketIndices.map(index => {
          const isUp = index.change >= 0

          return (
            <div key={index.symbol} className="flex items-center gap-2 whitespace-nowrap">
              <span className="text-gray-400 text-xs font-medium">{index.name}</span>
              {isUp ? (
                <TrendingUp className="w-3 h-3 text-terminal-up" />
              ) : (
                <TrendingDown className="w-3 h-3 text-terminal-down" />
              )}
              <span className="text-white text-xs font-mono">{formatPrice(index.price)}</span>
              <span className={`text-xs font-mono ${isUp ? 'text-terminal-up' : 'text-terminal-down'}`}>
                ({isUp ? '+' : ''}{index.changePercent.toFixed(2)}%)
              </span>
            </div>
          )
        })
      ) : hasApiKey === false ? (
        <SetupPrompt
          compact
          icon={<BarChart3 className="w-3 h-3 text-gray-500" />}
          title="Connect API for market indices"
          helpSection="api-limits"
        />
      ) : hasApiKey === null ? (
        <span className="text-gray-500 text-xs">Loading...</span>
      ) : (
        <span className="text-gray-500 text-xs">Fetching market data...</span>
      )}

      {/* AI Performance Badge */}
      {aiWinRate && (
        <div className="flex items-center gap-2 whitespace-nowrap border-l border-terminal-border pl-4">
          <Trophy className="w-3 h-3 text-terminal-amber" />
          <span className="text-gray-400 text-xs">AI</span>
          <span className={`text-xs font-mono font-medium ${aiWinRate.winRate >= 50 ? 'text-terminal-up' : 'text-terminal-down'}`}>
            {aiWinRate.winRate.toFixed(0)}%
          </span>
          <span className="text-gray-500 text-xs">({aiWinRate.record})</span>
        </div>
      )}

      {/* Market Regime Badge */}
      {marketRegime && (
        <div
          className="flex items-center gap-2 whitespace-nowrap border-l border-terminal-border pl-4 cursor-help"
          title={`${marketRegime.description}\n\nVIX: ${marketRegime.vix.toFixed(2)}\nSPY: $${marketRegime.spyPrice.toFixed(2)} vs MA50: $${marketRegime.spyMA50?.toFixed(2) ?? 'N/A'}\n\n${marketRegime.tradingGuidance}`}
        >
          <Activity className={`w-3 h-3 ${getRegimeColorClass(marketRegime)}`} />
          <span className="text-gray-400 text-xs">Regime</span>
          <span className={`text-xs font-medium ${getRegimeColorClass(marketRegime)}`}>
            {getRegimeLabel(marketRegime.regime)}
          </span>
          <span className="text-gray-500 text-xs">(VIX {marketRegime.vix.toFixed(1)})</span>
        </div>
      )}

      {/* Market Status */}
      <div className="ml-auto flex items-center gap-2">
        <Clock className="w-3 h-3 text-gray-500" />
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${marketStatus.isOpen ? 'bg-terminal-up animate-pulse' : 'bg-gray-500'}`} />
          <span className={`text-xs font-medium ${marketStatus.isOpen ? 'text-terminal-up' : 'text-gray-500'}`}>
            {marketStatus.status}
          </span>
        </div>
      </div>
    </div>
  )
}
