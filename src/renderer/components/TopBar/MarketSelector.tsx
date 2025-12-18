import { useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { getSettings, updateSettings } from '../../lib/db'

// Available market indices with their ETF tickers
const MARKETS = [
  { name: 'S&P 500', etf: 'SPY', index: '^GSPC' },
  { name: 'NASDAQ-100', etf: 'QQQ', index: '^NDX' },
  { name: 'Dow Jones', etf: 'DIA', index: '^DJI' },
  { name: 'Russell 2000', etf: 'IWM', index: '^RUT' },
] as const

export type MarketOption = typeof MARKETS[number]

export function MarketSelector() {
  const [selectedMarket, setSelectedMarket] = useState<MarketOption>(MARKETS[0])
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load selected market from settings on mount
  useEffect(() => {
    async function loadSettings() {
      const settings = await getSettings()
      if (settings.selectedMarket) {
        // Find matching market or default to SPY
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

    // Persist to IndexedDB
    await updateSettings({
      selectedMarket: {
        name: market.name,
        etf: market.etf,
        index: market.index
      }
    })

    // Dispatch event for Dashboard to listen to
    window.dispatchEvent(new CustomEvent('market-changed', {
      detail: { market }
    }))
  }

  return (
    <div className="relative no-drag" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-terminal-border transition-colors"
        title="Select market index"
      >
        <span className="text-terminal-amber font-medium text-sm">
          {selectedMarket.etf}
        </span>
        <span className="text-gray-500 text-xs hidden sm:inline">
          {selectedMarket.name}
        </span>
        <ChevronDown
          size={14}
          className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-terminal-panel border border-terminal-border rounded-lg shadow-xl z-50">
          {MARKETS.map((market) => (
            <button
              key={market.etf}
              onClick={() => handleSelect(market)}
              className={`w-full px-3 py-2 text-left hover:bg-terminal-border transition-colors first:rounded-t-lg last:rounded-b-lg flex items-center justify-between ${
                selectedMarket.etf === market.etf ? 'bg-terminal-border/50' : ''
              }`}
            >
              <div>
                <span className="text-white font-medium text-sm">{market.etf}</span>
                <span className="text-gray-400 text-xs ml-2">{market.name}</span>
              </div>
              {selectedMarket.etf === market.etf && (
                <div className="w-1.5 h-1.5 rounded-full bg-terminal-amber" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
