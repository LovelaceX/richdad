import { useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { getSettings, updateSettings } from '../../lib/db'
import { useMarketStore } from '../../stores/marketStore'

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

export function MarketIndexDropdown() {
  const [selectedMarket, setSelectedMarket] = useState<MarketOption>(MARKETS[0])
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const isMountedRef = useRef(true)

  // Get quote for selected market from store
  const watchlist = useMarketStore(state => state.watchlist)
  const selectedQuote = watchlist.find(w => w.symbol === selectedMarket.etf)?.quote

  // Track mounted state
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Load selected market from settings on mount
  useEffect(() => {
    async function loadSettings() {
      const settings = await getSettings()
      if (isMountedRef.current && settings.selectedMarket) {
        const market = MARKETS.find(m => m.etf === settings.selectedMarket?.etf)
        if (market) {
          setSelectedMarket(market)
        }
      }
    }
    loadSettings()
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
          title={selectedMarket.fullName}
        >
          <span className="text-terminal-amber font-medium text-sm">
            {selectedMarket.name}
          </span>
          <span className="text-gray-400 text-xs">
            ({selectedMarket.etf})
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

      {/* Price & Change Display - only show when quote is available */}
      {selectedQuote && (
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
      )}

    </div>
  )
}
