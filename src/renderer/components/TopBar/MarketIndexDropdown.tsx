import { useState, useEffect, useRef } from 'react'
import { ChevronDown, Activity } from 'lucide-react'
import { getSettings, updateSettings } from '../../lib/db'
import { useMarketStore } from '../../stores/marketStore'
import { calculateMarketRegime, type MarketRegime, type MarketRegimeType } from '../../../services/marketRegime'

// Available market indices with their ETF tickers and full names
const CORE_MARKETS = [
  { name: 'S&P 500', etf: 'SPY', index: '^GSPC', fullName: 'SPDR S&P 500 ETF Trust' },
  { name: 'NASDAQ-100', etf: 'QQQ', index: '^NDX', fullName: 'Invesco QQQ Trust' },
  { name: 'Dow Jones', etf: 'DIA', index: '^DJI', fullName: 'SPDR Dow Jones Industrial' },
  { name: 'Russell 2000', etf: 'IWM', index: '^RUT', fullName: 'iShares Russell 2000 ETF' },
] as const

const ADDITIONAL_MARKETS = [
  { name: 'Total Market', etf: 'VTI', index: '^CRSP', fullName: 'Vanguard Total Stock Market' },
  { name: 'Semiconductors', etf: 'SMH', index: '^SOX', fullName: 'VanEck Semiconductor ETF' },
  { name: 'Volatility', etf: 'VXX', index: '^VIX', fullName: 'iPath VIX Short-Term' },
] as const

const MARKETS = [...CORE_MARKETS, ...ADDITIONAL_MARKETS] as const

export type MarketOption = typeof MARKETS[number]

// Regime dot color based on regime type
function getRegimeDotColor(regime: MarketRegimeType | null): string {
  if (!regime) return 'bg-gray-500'
  switch (regime) {
    case 'LOW_VOL_BULLISH':
      return 'bg-terminal-up' // Green - Risk On
    case 'LOW_VOL_BEARISH':
    case 'ELEVATED_VOL_BULLISH':
      return 'bg-terminal-amber' // Amber - Caution
    case 'ELEVATED_VOL_BEARISH':
    case 'HIGH_VOL_BULLISH':
      return 'bg-orange-400' // Orange - High risk
    case 'HIGH_VOL_BEARISH':
    case 'CHOPPY':
      return 'bg-terminal-down' // Red - Fear
    default:
      return 'bg-gray-500'
  }
}

// Regime label for tooltip
function getRegimeLabel(regime: MarketRegimeType | null): string {
  if (!regime) return 'Loading...'
  switch (regime) {
    case 'LOW_VOL_BULLISH': return 'Risk On'
    case 'LOW_VOL_BEARISH': return 'Quiet Decline'
    case 'ELEVATED_VOL_BULLISH': return 'Cautious Bull'
    case 'ELEVATED_VOL_BEARISH': return 'Caution'
    case 'HIGH_VOL_BULLISH': return 'Volatile Rally'
    case 'HIGH_VOL_BEARISH': return 'Fear Mode'
    case 'CHOPPY': return 'Choppy'
    default: return 'Mixed'
  }
}

export function MarketIndexDropdown() {
  const [selectedMarket, setSelectedMarket] = useState<MarketOption>(MARKETS[0])
  const [isOpen, setIsOpen] = useState(false)
  const [showRegimeTooltip, setShowRegimeTooltip] = useState(false)
  const [regime, setRegime] = useState<MarketRegime | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Get quote for selected market from store
  const watchlist = useMarketStore(state => state.watchlist)
  const selectedQuote = watchlist.find(w => w.symbol === selectedMarket.etf)?.quote

  // Load selected market from settings on mount
  useEffect(() => {
    async function loadSettings() {
      const settings = await getSettings()
      if (settings.selectedMarket) {
        const market = MARKETS.find(m => m.etf === settings.selectedMarket?.etf)
        if (market) {
          setSelectedMarket(market)
        }
      }
    }
    loadSettings()
  }, [])

  // Load market regime
  useEffect(() => {
    const loadRegime = async () => {
      try {
        const result = await calculateMarketRegime()
        setRegime(result)
      } catch (error) {
        console.error('[MarketIndexDropdown] Failed to load regime:', error)
      }
    }

    loadRegime()
    const interval = setInterval(loadRegime, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = async (market: MarketOption) => {
    setSelectedMarket(market)
    setIsOpen(false)

    await updateSettings({
      selectedMarket: {
        name: market.name,
        etf: market.etf,
        index: market.index
      }
    })

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('market-changed', {
      detail: { market }
    }))
  }

  const formatPrice = (price: number) => {
    return price >= 1000
      ? price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : price.toFixed(2)
  }

  const formatPercent = (pct: number) => {
    const sign = pct >= 0 ? '+' : ''
    return `${sign}${pct.toFixed(2)}%`
  }

  return (
    <div className="flex items-center gap-3 no-drag" ref={dropdownRef}>
      {/* Dropdown Button - Index selector only */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-terminal-border transition-colors"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <span className="text-terminal-amber font-medium text-sm">
            {selectedMarket.etf}
          </span>
          <span className="text-gray-400 text-xs max-w-[180px] truncate">
            ({selectedMarket.fullName})
          </span>
          <ChevronDown
            size={14}
            className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            className="absolute top-full left-0 mt-1 w-64 bg-terminal-panel border border-terminal-border rounded-lg shadow-xl z-[100]"
            role="listbox"
          >
            {/* Core Markets */}
            {CORE_MARKETS.map((market, index) => (
              <button
                key={market.etf}
                onClick={() => handleSelect(market)}
                className={`w-full px-3 py-2 text-left hover:bg-terminal-border transition-colors ${
                  index === 0 ? 'rounded-t-lg' : ''
                } flex items-center justify-between ${
                  selectedMarket.etf === market.etf ? 'bg-terminal-border/50' : ''
                }`}
                role="option"
                aria-selected={selectedMarket.etf === market.etf}
              >
                <div>
                  <span className="text-white font-medium text-sm">{market.etf}</span>
                  <span className="text-gray-400 text-xs ml-2">{market.fullName}</span>
                </div>
                {selectedMarket.etf === market.etf && (
                  <div className="w-1.5 h-1.5 rounded-full bg-terminal-amber" />
                )}
              </button>
            ))}

            {/* Separator */}
            <div className="border-t border-terminal-border my-1" />

            {/* Additional Markets */}
            {ADDITIONAL_MARKETS.map((market, index) => (
              <button
                key={market.etf}
                onClick={() => handleSelect(market)}
                className={`w-full px-3 py-2 text-left hover:bg-terminal-border transition-colors ${
                  index === ADDITIONAL_MARKETS.length - 1 ? 'rounded-b-lg' : ''
                } flex items-center justify-between ${
                  selectedMarket.etf === market.etf ? 'bg-terminal-border/50' : ''
                }`}
                role="option"
                aria-selected={selectedMarket.etf === market.etf}
              >
                <div>
                  <span className="text-white font-medium text-sm">{market.etf}</span>
                  <span className="text-gray-400 text-xs ml-2">{market.fullName}</span>
                </div>
                {selectedMarket.etf === market.etf && (
                  <div className="w-1.5 h-1.5 rounded-full bg-terminal-amber" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Separator */}
      <div className="h-4 w-px bg-terminal-border" />

      {/* Price & Change Display */}
      {selectedQuote ? (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-white font-mono tabular-nums">
            ${formatPrice(selectedQuote.price)}
          </span>
          <span className={`font-mono tabular-nums ${
            selectedQuote.changePercent >= 0 ? 'text-terminal-up' : 'text-terminal-down'
          }`}>
            {formatPercent(selectedQuote.changePercent)}
          </span>
        </div>
      ) : (
        <span className="text-gray-500 text-xs">Loading...</span>
      )}

      {/* Regime Dot with Tooltip */}
      <div
        className="relative"
        onMouseEnter={() => setShowRegimeTooltip(true)}
        onMouseLeave={() => setShowRegimeTooltip(false)}
      >
        <div
          className={`w-3 h-3 rounded-full cursor-help ${getRegimeDotColor(regime?.regime ?? null)}`}
          title={regime ? getRegimeLabel(regime.regime) : 'Loading regime...'}
        />

        {/* Regime Tooltip */}
        {showRegimeTooltip && regime && (
          <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-terminal-panel border border-terminal-border rounded-lg shadow-xl z-50">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={14} className={`${
                regime.riskLevel === 'low' ? 'text-terminal-up' :
                regime.riskLevel === 'moderate' ? 'text-terminal-amber' :
                regime.riskLevel === 'high' ? 'text-orange-400' :
                'text-terminal-down'
              }`} />
              <span className="font-medium text-white text-sm">
                {getRegimeLabel(regime.regime)}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                regime.riskLevel === 'low' ? 'bg-terminal-up/20 text-terminal-up' :
                regime.riskLevel === 'moderate' ? 'bg-terminal-amber/20 text-terminal-amber' :
                regime.riskLevel === 'high' ? 'bg-orange-400/20 text-orange-400' :
                'bg-terminal-down/20 text-terminal-down'
              }`}>
                {regime.riskLevel.toUpperCase()}
              </span>
            </div>

            <p className="text-gray-300 text-xs mb-2">{regime.description}</p>
            <p className="text-gray-500 text-[10px] mb-3">{regime.tradingGuidance}</p>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-terminal-bg rounded p-2">
                <span className="text-gray-500">VIX</span>
                <span className={`ml-2 ${
                  regime.vix < 15 ? 'text-terminal-up' :
                  regime.vix < 25 ? 'text-terminal-amber' :
                  'text-terminal-down'
                }`}>
                  {regime.vix.toFixed(1)}
                </span>
              </div>
              <div className="bg-terminal-bg rounded p-2">
                <span className="text-gray-500">SPY vs MA50</span>
                <span className={`ml-2 ${
                  regime.spyMA50 && regime.spyPrice > regime.spyMA50
                    ? 'text-terminal-up'
                    : 'text-terminal-down'
                }`}>
                  {regime.spyMA50 ? (regime.spyPrice > regime.spyMA50 ? 'Above' : 'Below') : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
