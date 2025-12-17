import { useEffect, useState } from 'react'
import { Eye, Plus, X } from 'lucide-react'
import { WatchlistGrid } from './WatchlistGrid'
import { useMarketStore } from '../../stores/marketStore'
import { useSettingsStore } from '../../stores/settingsStore'

export function MarketWatch() {
  const refreshAllQuotes = useMarketStore(state => state.refreshAllQuotes)
  const addToWatchlist = useMarketStore(state => state.addToWatchlist)
  const refreshInterval = useSettingsStore(state => state.refreshInterval)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newSymbol, setNewSymbol] = useState('')

  // Auto-refresh quotes
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAllQuotes()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshAllQuotes, refreshInterval])

  const handleAddSymbol = () => {
    if (newSymbol.trim()) {
      addToWatchlist(newSymbol.trim().toUpperCase())
      setNewSymbol('')
      setShowAddModal(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddSymbol()
    } else if (e.key === 'Escape') {
      setShowAddModal(false)
      setNewSymbol('')
    }
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

      {/* Add Symbol Modal */}
      {showAddModal && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 w-72 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white text-sm font-medium">Add to Watchlist</h3>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewSymbol('')
                }}
                className="text-gray-500 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder="Enter symbol (e.g. AAPL)"
              className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-white text-sm mb-3 focus:border-terminal-amber focus:outline-none"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setNewSymbol('')
                }}
                className="flex-1 px-3 py-2 text-gray-400 text-sm hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddSymbol}
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
