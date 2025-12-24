/**
 * PriceAlertsSection
 *
 * Settings section for managing price alerts.
 */

import { useState, useEffect } from 'react'
import { Plus, Bell, Trash2, Volume2, Monitor, MessageSquare } from 'lucide-react'
import { useAlertStore } from '../../../stores/alertStore'
import { useStockAutocomplete } from '../hooks/useStockAutocomplete'
import { getSettings, updateSettings } from '../../../lib/db'
import { HelpTooltip } from '../../../components/common'

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

// Default notification settings
const DEFAULT_NOTIFICATIONS = {
  enabled: true,
  sound: true,
  desktop: true,
  toast: true,
}

export function PriceAlertsSection() {
  const { alerts, loadAlerts, addAlert, removeAlert } = useAlertStore()
  const [newAlertCondition, setNewAlertCondition] = useState<AlertCondition>('above')
  const [newAlertValue, setNewAlertValue] = useState('')

  // Notification settings state
  const [notifications, setNotifications] = useState(DEFAULT_NOTIFICATIONS)

  // Use the stock autocomplete hook
  const symbolAutocomplete = useStockAutocomplete({
    maxResults: 10,
    onSelect: (symbol) => {
      symbolAutocomplete.setInputValue(symbol)
    },
  })

  // Load alerts and notification settings
  useEffect(() => {
    loadAlerts()
    async function loadNotificationSettings() {
      const settings = await getSettings()
      if (settings.priceAlertNotifications) {
        setNotifications(settings.priceAlertNotifications)
      }
    }
    loadNotificationSettings()
  }, [loadAlerts])

  // Update a notification setting
  const updateNotification = async (key: keyof typeof notifications, value: boolean) => {
    const updated = { ...notifications, [key]: value }
    setNotifications(updated)
    await updateSettings({ priceAlertNotifications: updated })
  }

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
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-white text-lg font-medium">Price Alerts</h2>
        <HelpTooltip content="Get notified when a stock hits your target price. Set alerts for specific prices or percentage moves." />
      </div>
      <p className="text-gray-500 text-sm mb-6">Set alerts for price movements</p>

      {/* Notification Settings */}
      <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4 text-terminal-amber" />
          <h3 className="text-white text-sm font-medium">Notification Settings</h3>
          <HelpTooltip content="Choose how you want to be notified: sound, desktop popup, or in-app toast message." />
        </div>

        <div className="space-y-3">
          {/* Master Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-gray-300 text-sm">Enable Notifications</span>
              <p className="text-gray-600 text-xs">Master toggle for all alert notifications</p>
            </div>
            <button
              onClick={() => updateNotification('enabled', !notifications.enabled)}
              className={`w-12 h-6 rounded-full transition-colors ${
                notifications.enabled ? 'bg-terminal-amber' : 'bg-terminal-border'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  notifications.enabled ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Individual notification types (only show if enabled) */}
          {notifications.enabled && (
            <div className="pl-4 border-l-2 border-terminal-border space-y-3 mt-3">
              {/* Sound */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-300 text-sm">Sound</span>
                </div>
                <button
                  onClick={() => updateNotification('sound', !notifications.sound)}
                  className={`w-10 h-5 rounded-full transition-colors ${
                    notifications.sound ? 'bg-terminal-amber' : 'bg-terminal-border'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      notifications.sound ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Desktop Notification */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-300 text-sm">Desktop Notification</span>
                </div>
                <button
                  onClick={() => updateNotification('desktop', !notifications.desktop)}
                  className={`w-10 h-5 rounded-full transition-colors ${
                    notifications.desktop ? 'bg-terminal-amber' : 'bg-terminal-border'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      notifications.desktop ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* In-App Toast */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-300 text-sm">In-App Toast</span>
                </div>
                <button
                  onClick={() => updateNotification('toast', !notifications.toast)}
                  className={`w-10 h-5 rounded-full transition-colors ${
                    notifications.toast ? 'bg-terminal-amber' : 'bg-terminal-border'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      notifications.toast ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

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
