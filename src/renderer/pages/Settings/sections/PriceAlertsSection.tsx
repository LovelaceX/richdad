/**
 * PriceAlertsSection
 *
 * Settings section for managing price alerts.
 */

import { useState, useEffect } from 'react'
import { Plus, Bell, Trash2 } from 'lucide-react'
import { useAlertStore } from '../../../stores/alertStore'
import { useStockAutocomplete } from '../hooks/useStockAutocomplete'

type AlertCondition = 'above' | 'below' | 'percent_up' | 'percent_down'

const CONDITION_LABELS: Record<AlertCondition, string> = {
  above: 'Above',
  below: 'Below',
  percent_up: '+%',
  percent_down: '-%',
}

const CONDITION_SYMBOLS: Record<AlertCondition, string> = {
  above: '>',
  below: '<',
  percent_up: '+',
  percent_down: '-',
}

export function PriceAlertsSection() {
  const { alerts, loadAlerts, addAlert, removeAlert } = useAlertStore()
  const [newAlertCondition, setNewAlertCondition] = useState<AlertCondition>('above')
  const [newAlertValue, setNewAlertValue] = useState('')

  // Use the stock autocomplete hook
  const symbolAutocomplete = useStockAutocomplete({
    maxResults: 10,
    onSelect: (symbol) => {
      symbolAutocomplete.setInputValue(symbol)
    },
  })

  useEffect(() => {
    loadAlerts()
  }, [loadAlerts])

  const handleAddAlert = async () => {
    if (symbolAutocomplete.inputValue && newAlertValue) {
      await addAlert({
        symbol: symbolAutocomplete.inputValue,
        condition: newAlertCondition,
        value: parseFloat(newAlertValue),
      })
      symbolAutocomplete.reset()
      setNewAlertValue('')
    }
  }

  return (
    <div>
      <h2 className="text-white text-lg font-medium mb-1">Price Alerts</h2>
      <p className="text-gray-500 text-sm mb-6">Set alerts for price movements</p>

      {/* Add New Alert Form */}
      <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 mb-6">
        <h3 className="text-white text-sm font-medium mb-4">Add Alert</h3>

        <div className="space-y-3">
          {/* Symbol input with autocomplete */}
          <div className="relative">
            <input
              type="text"
              placeholder="Symbol (e.g., AAPL)"
              value={symbolAutocomplete.inputValue}
              onChange={(e) => symbolAutocomplete.handleInputChange(e.target.value.toUpperCase())}
              onKeyDown={symbolAutocomplete.handleKeyDown}
              className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-white placeholder:text-gray-600 font-mono"
            />

            {/* Autocomplete Dropdown */}
            {symbolAutocomplete.isOpen && (
              <div className="absolute z-10 w-full mt-1 bg-terminal-bg border border-terminal-border rounded max-h-48 overflow-y-auto">
                {symbolAutocomplete.searchResults.map((stock, index) => (
                  <button
                    key={stock.symbol}
                    onClick={() => symbolAutocomplete.handleSelect(stock)}
                    className={`w-full px-3 py-2 text-left hover:bg-terminal-border/50 transition-colors ${
                      index === symbolAutocomplete.selectedIndex ? 'bg-terminal-amber/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-terminal-amber font-mono text-sm font-medium">
                        {stock.symbol}
                      </span>
                      {stock.sector && (
                        <span className="text-gray-600 text-xs">{stock.sector}</span>
                      )}
                    </div>
                    <p className="text-gray-400 text-xs truncate">{stock.name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Condition Buttons */}
          <div className="flex gap-2">
            {(Object.keys(CONDITION_LABELS) as AlertCondition[]).map((condition) => (
              <button
                key={condition}
                onClick={() => setNewAlertCondition(condition)}
                className={`flex-1 py-2 px-3 rounded text-sm transition-colors ${
                  newAlertCondition === condition
                    ? 'bg-terminal-amber/20 text-terminal-amber border border-terminal-amber'
                    : 'bg-terminal-border text-gray-400 border border-transparent'
                }`}
              >
                {CONDITION_LABELS[condition]}
              </button>
            ))}
          </div>

          {/* Value Input */}
          <input
            type="number"
            placeholder={
              newAlertCondition.startsWith('percent')
                ? 'Percent (e.g., 5)'
                : 'Price (e.g., 150.00)'
            }
            value={newAlertValue}
            onChange={(e) => setNewAlertValue(e.target.value)}
            className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-white placeholder:text-gray-600 font-mono"
          />

          {/* Add Button */}
          <button
            onClick={handleAddAlert}
            disabled={!symbolAutocomplete.inputValue || !newAlertValue}
            className="w-full py-2 bg-terminal-amber text-black font-medium rounded text-sm hover:bg-terminal-amber/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Alert
          </button>
        </div>
      </div>

      {/* Alerts List */}
      {alerts.length === 0 ? (
        <div className="text-gray-500 text-sm p-8 text-center border border-dashed border-terminal-border rounded-lg">
          No alerts set.
          <br />
          <span className="text-gray-600 text-xs">Add price alerts above to get notified</span>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-center justify-between p-3 border rounded-lg ${
                alert.triggered
                  ? 'bg-terminal-amber/10 border-terminal-amber'
                  : 'bg-terminal-panel border-terminal-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell
                  className={`w-4 h-4 ${alert.triggered ? 'text-terminal-amber' : 'text-gray-500'}`}
                />
                <div>
                  <p className="text-white text-sm font-mono">
                    {alert.symbol}
                    <span className="text-gray-500 mx-2">
                      {CONDITION_SYMBOLS[alert.condition as AlertCondition]}
                    </span>
                    <span
                      className={
                        alert.condition.startsWith('percent')
                          ? 'text-blue-400'
                          : 'text-terminal-amber'
                      }
                    >
                      {alert.condition.startsWith('percent')
                        ? `${alert.value}%`
                        : `$${alert.value.toFixed(2)}`}
                    </span>
                  </p>
                  <p className="text-gray-500 text-xs">
                    {alert.triggered ? 'Triggered' : 'Active'} • Created{' '}
                    {new Date(alert.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => alert.id && removeAlert(alert.id)}
                className="p-1.5 text-gray-500 hover:text-terminal-down hover:bg-terminal-down/10 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
