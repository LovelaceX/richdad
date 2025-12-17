import { useEffect, useState, useRef } from 'react'
import { Eye, Plus, X, Search } from 'lucide-react'
import { WatchlistGrid } from './WatchlistGrid'
import { useMarketStore } from '../../stores/marketStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { searchStocks, type StockInfo } from '../../lib/stockSymbols'

export function MarketWatch() {
  const refreshAllQuotes = useMarketStore(state => state.refreshAllQuotes)
  const addToWatchlist = useMarketStore(state => state.addToWatchlist)
  const refreshInterval = useSettingsStore(state => state.refreshInterval)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newSymbol, setNewSymbol] = useState('')
  const [searchResults, setSearchResults] = useState<StockInfo[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-refresh quotes
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAllQuotes()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshAllQuotes, refreshInterval])

  // Search when input changes
  useEffect(() => {
    if (newSymbol.length > 0) {
      const results = searchStocks(newSymbol)
      setSearchResults(results)
      setSelectedIndex(-1)
    } else {
      setSearchResults([])
      setSelectedIndex(-1)
    }
  }, [newSymbol])

  const handleAddSymbol = (symbol?: string) => {
    const symbolToAdd = symbol || newSymbol.trim().toUpperCase()
    if (symbolToAdd) {
      addToWatchlist(symbolToAdd)
      setNewSymbol('')
      setSearchResults([])
      setShowAddModal(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (selectedIndex >= 0 && searchResults[selectedIndex]) {
        handleAddSymbol(searchResults[selectedIndex].symbol)
      } else {
        handleAddSymbol()
      }
    } else if (e.key === 'Escape') {
      setShowAddModal(false)
      setNewSymbol('')
      setSearchResults([])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev =>
        prev < searchResults.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1))
    }
  }

  const closeModal = () => {
    setShowAddModal(false)
    setNewSymbol('')
    setSearchResults([])
    setSelectedIndex(-1)
  }

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex items-center gap-2">
        <Eye size={14} />
        <span>Market Watch</span>
        <div className="flex-1" />
        <button
          onClick={() => setShowAddModal(true)}
          className="p-1 hover:bg-terminal-border rounded transition-colors"
          title="Add symbol to watchlist"
        >
          <Plus size={14} className="text-gray-400 hover:text-terminal-amber" />
        </button>
      </div>

      {/* Add Symbol Modal with Autocomplete */}
      {showAddModal && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 w-80 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white text-sm font-medium">Add to Watchlist</h3>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                <Search size={14} />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={newSymbol}
                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                placeholder="Search symbol or company..."
                className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 pl-9 text-white text-sm focus:border-terminal-amber focus:outline-none"
                autoFocus
              />
            </div>

            {/* Autocomplete Dropdown */}
            {searchResults.length > 0 && (
              <div className="mt-1 bg-terminal-bg border border-terminal-border rounded max-h-48 overflow-y-auto">
                {searchResults.map((stock, index) => (
                  <button
                    key={stock.symbol}
                    onClick={() => handleAddSymbol(stock.symbol)}
                    className={`w-full px-3 py-2 text-left hover:bg-terminal-border/50 transition-colors ${
                      index === selectedIndex ? 'bg-terminal-amber/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-terminal-amber font-mono text-sm font-medium">
                        {stock.symbol}
                      </span>
                      {stock.sector && (
                        <span className="text-gray-600 text-xs">
                          {stock.sector}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-xs truncate">
                      {stock.name}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {/* No results message */}
            {newSymbol.length > 0 && searchResults.length === 0 && (
              <div className="mt-1 px-3 py-2 text-gray-500 text-xs">
                No matches found. Press Enter to add "{newSymbol}" anyway.
              </div>
            )}

            {/* Helper text */}
            {newSymbol.length === 0 && (
              <p className="mt-2 text-gray-500 text-xs">
                Type to search stocks or enter any symbol
              </p>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={closeModal}
                className="flex-1 px-3 py-2 text-gray-400 text-sm hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAddSymbol()}
                disabled={!newSymbol.trim()}
                className="flex-1 px-3 py-2 bg-terminal-amber text-terminal-bg text-sm font-medium rounded hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <WatchlistGrid />
      </div>
    </div>
  )
}
