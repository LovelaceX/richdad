/**
 * PortfolioSection
 *
 * Settings section for managing portfolio holdings.
 */

// React import not needed for JSX in modern TypeScript
import { Plus, Edit3, Trash2, Briefcase } from 'lucide-react'
import { usePortfolioHoldings } from '../hooks/usePortfolioHoldings'
import { useToastStore } from '../../../stores/toastStore'

export function PortfolioSection() {
  const {
    holdings,
    isLoading,
    showModal,
    editingHolding,
    form,
    totals,
    symbolAutocomplete,
    openAddModal,
    openEditModal,
    closeModal,
    updateFormField,
    saveHolding,
    removeHolding,
  } = usePortfolioHoldings()
  const addToast = useToastStore((state) => state.addToast)

  const handleSave = async () => {
    const result = await saveHolding()
    if (!result.success && result.error) {
      addToast({
        message: result.error,
        type: 'error',
        helpSection: 'troubleshooting'
      })
    }
  }

  const handleDelete = async (id: number, symbol: string) => {
    if (confirm(`Delete ${symbol} holding?`)) {
      await removeHolding(id)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading portfolio...</div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-white text-lg font-medium mb-1">Portfolio</h2>
      <p className="text-gray-500 text-sm mb-6">Track your holdings and cost basis</p>

      {/* Portfolio Summary */}
      {holdings.length > 0 && (
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Briefcase className="w-4 h-4 text-terminal-amber" />
            <span className="text-white font-medium">Portfolio Summary</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-gray-400 text-xs mb-1">Total Cost Basis</div>
              <div className="text-white text-lg font-mono">
                ${totals.totalCost.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-xs mb-1">Positions</div>
              <div className="text-white text-lg font-mono">{totals.positionCount}</div>
            </div>
            <div>
              <div className="text-gray-400 text-xs mb-1">Total Shares</div>
              <div className="text-white text-lg font-mono">{totals.totalShares.toLocaleString()}</div>
            </div>
          </div>
          <p className="text-gray-500 text-xs mt-4">
            Live P&L requires current market prices. Holdings auto-update when you BUY/SELL from the
            chart.
          </p>
        </div>
      )}

      {/* Holdings Table */}
      <div className="bg-terminal-panel border border-terminal-border rounded-lg overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-terminal-border bg-terminal-bg/50">
                <th className="text-left text-gray-400 font-medium px-4 py-3">Symbol</th>
                <th className="text-right text-gray-400 font-medium px-4 py-3">Shares</th>
                <th className="text-right text-gray-400 font-medium px-4 py-3">Avg Cost</th>
                <th className="text-right text-gray-400 font-medium px-4 py-3">Total Cost</th>
                <th className="text-right text-gray-400 font-medium px-4 py-3">Entry Date</th>
                <th className="text-center text-gray-400 font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {holdings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-8">
                    No holdings yet. Add manually or use BUY from the chart.
                  </td>
                </tr>
              ) : (
                holdings.map((holding) => (
                  <tr
                    key={holding.id}
                    className="border-b border-terminal-border/50 hover:bg-terminal-bg/30"
                  >
                    <td className="px-4 py-3">
                      <span className="text-terminal-amber font-mono font-medium">
                        {holding.symbol}
                      </span>
                    </td>
                    <td className="text-right px-4 py-3 text-white font-mono">
                      {holding.shares.toLocaleString()}
                    </td>
                    <td className="text-right px-4 py-3 text-white font-mono">
                      ${holding.avgCostBasis.toFixed(2)}
                    </td>
                    <td className="text-right px-4 py-3 text-white font-mono">
                      ${holding.totalCost.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="text-right px-4 py-3 text-gray-400 text-xs">
                      {new Date(holding.entryDate).toLocaleDateString()}
                    </td>
                    <td className="text-center px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(holding)}
                          className="p-1.5 hover:bg-terminal-border rounded transition-colors"
                          title="Edit holding"
                        >
                          <Edit3 size={14} className="text-gray-400 hover:text-white" />
                        </button>
                        <button
                          onClick={() => holding.id && handleDelete(holding.id, holding.symbol)}
                          className="p-1.5 hover:bg-red-500/20 rounded transition-colors"
                          title="Delete holding"
                        >
                          <Trash2 size={14} className="text-gray-400 hover:text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Holding Button */}
      <button
        onClick={openAddModal}
        className="flex items-center gap-2 px-4 py-2 bg-terminal-amber text-black rounded hover:bg-terminal-amber/90 transition-colors font-medium"
      >
        <Plus size={16} />
        Add Holding
      </button>

      {/* Add/Edit Holding Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-terminal-panel border border-terminal-border rounded-lg p-6 w-full max-w-md">
            <h3 className="text-white font-medium mb-4">
              {editingHolding ? 'Edit Holding' : 'Add New Holding'}
            </h3>

            <div className="space-y-4">
              {/* Symbol Input with Autocomplete */}
              <div className="relative">
                <label className="text-gray-400 text-xs mb-1 block">Symbol</label>
                <input
                  type="text"
                  value={form.symbol}
                  onChange={(e) => updateFormField('symbol', e.target.value.toUpperCase())}
                  onKeyDown={symbolAutocomplete.handleKeyDown}
                  placeholder="AAPL"
                  className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-white font-mono"
                  disabled={!!editingHolding}
                />
                {symbolAutocomplete.isOpen && !editingHolding && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-terminal-panel border border-terminal-border rounded shadow-lg z-10 max-h-40 overflow-y-auto">
                    {symbolAutocomplete.searchResults.map((stock, index) => (
                      <button
                        key={stock.symbol}
                        onClick={() => symbolAutocomplete.handleSelect(stock)}
                        className={`w-full px-3 py-2 text-left hover:bg-terminal-border/50 flex items-center justify-between ${
                          index === symbolAutocomplete.selectedIndex ? 'bg-terminal-border/50' : ''
                        }`}
                      >
                        <span className="text-terminal-amber font-mono">{stock.symbol}</span>
                        <span className="text-gray-400 text-xs truncate ml-2">{stock.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Shares */}
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Shares</label>
                <input
                  type="number"
                  value={form.shares}
                  onChange={(e) => updateFormField('shares', e.target.value)}
                  placeholder="100"
                  min="0"
                  step="1"
                  className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-white font-mono"
                />
              </div>

              {/* Average Cost Basis */}
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Average Cost Basis ($)</label>
                <input
                  type="number"
                  value={form.avgCostBasis}
                  onChange={(e) => updateFormField('avgCostBasis', e.target.value)}
                  placeholder="150.00"
                  min="0"
                  step="0.01"
                  className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-white font-mono"
                />
              </div>

              {/* Notes (optional) */}
              <div>
                <label className="text-gray-400 text-xs mb-1 block">Notes (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateFormField('notes', e.target.value)}
                  placeholder="Position notes..."
                  rows={2}
                  className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-white resize-none"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-terminal-amber text-black rounded hover:bg-terminal-amber/90 transition-colors font-medium"
              >
                {editingHolding ? 'Save Changes' : 'Add Holding'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
