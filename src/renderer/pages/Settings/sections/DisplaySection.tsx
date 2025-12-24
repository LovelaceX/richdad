/**
 * DisplaySection
 *
 * Settings section for visual accessibility and interface scaling.
 */

import { useState, useEffect } from 'react'
import { Monitor, LayoutGrid, Eye, TrendingUp, X, Plus, Snail, Rabbit } from 'lucide-react'
import { useSettingsStore } from '../../../stores/settingsStore'
import { getSettings, updateSettings } from '../../../lib/db'

// Default market symbols
const DEFAULT_MARKET_SYMBOLS = ['SPY', 'QQQ', 'DIA', 'VXX']
const MAX_SYMBOLS = 8

export function DisplaySection() {
  // Get state and actions from Zustand store
  const cvdMode = useSettingsStore((state) => state.cvdMode)
  const toggleCvdMode = useSettingsStore((state) => state.toggleCvdMode)
  const zoomLevel = useSettingsStore((state) => state.zoomLevel)
  const setZoomLevel = useSettingsStore((state) => state.setZoomLevel)
  const tickerSpeed = useSettingsStore((state) => state.tickerSpeed)
  const setTickerSpeed = useSettingsStore((state) => state.setTickerSpeed)
  const panelVisibility = useSettingsStore((state) => state.panelVisibility)
  const toggleLeftPanel = useSettingsStore((state) => state.toggleLeftPanel)
  const toggleChart = useSettingsStore((state) => state.toggleChart)
  const toggleNewsTicker = useSettingsStore((state) => state.toggleNewsTicker)

  // Market Overview Symbols state
  const [marketSymbols, setMarketSymbols] = useState<string[]>(DEFAULT_MARKET_SYMBOLS)
  const [newSymbol, setNewSymbol] = useState('')

  // Load market symbols from settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await getSettings()
        if (settings.marketOverviewSymbols?.length) {
          setMarketSymbols(settings.marketOverviewSymbols)
        }
      } catch (error) {
        console.error('Failed to load market symbols:', error)
      }
    }
    loadSettings()
  }, [])

  // Save market symbols to settings
  const saveMarketSymbols = async (symbols: string[]) => {
    setMarketSymbols(symbols)
    await updateSettings({ marketOverviewSymbols: symbols })
    // Notify other components
    window.dispatchEvent(new Event('settings-updated'))
  }

  // Add a new symbol
  const handleAddSymbol = () => {
    const symbol = newSymbol.toUpperCase().trim()
    if (!symbol) return
    if (marketSymbols.includes(symbol)) {
      setNewSymbol('')
      return
    }
    if (marketSymbols.length >= MAX_SYMBOLS) return

    const updated = [...marketSymbols, symbol]
    saveMarketSymbols(updated)
    setNewSymbol('')
  }

  // Remove a symbol
  const handleRemoveSymbol = (symbol: string) => {
    const updated = marketSymbols.filter(s => s !== symbol)
    saveMarketSymbols(updated)
  }

  // Reset to defaults
  const handleResetSymbols = () => {
    saveMarketSymbols(DEFAULT_MARKET_SYMBOLS)
  }

  return (
    <div>
      <h2 className="text-white text-lg font-medium mb-1">Display</h2>
      <p className="text-gray-500 text-sm mb-6">Visual accessibility and interface scaling</p>

      <div className="space-y-6">
        {/* Interface Zoom */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Monitor className="w-4 h-4 text-terminal-amber" />
            <span className="text-white text-sm font-medium">Interface Zoom</span>
          </div>

          <p className="text-gray-400 text-xs mb-4">
            Scale the entire interface for better readability. You can also use keyboard shortcuts.
          </p>

          {/* Zoom Level Buttons */}
          <div className="flex gap-2 mb-4">
            {[90, 100, 110, 125].map((level) => (
              <button
                key={level}
                onClick={() => setZoomLevel(level)}
                className={`flex-1 py-2.5 px-4 rounded font-mono text-sm transition-colors ${
                  zoomLevel === level
                    ? 'bg-terminal-amber text-black font-semibold'
                    : 'bg-terminal-bg border border-terminal-border text-white hover:border-terminal-amber/50'
                }`}
              >
                {level}%
              </button>
            ))}
          </div>

          {/* Keyboard Shortcuts */}
          <div className="bg-terminal-bg rounded border border-terminal-border p-3">
            <p className="text-gray-500 text-xs mb-2">Keyboard shortcuts:</p>
            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-gray-400">Zoom in</span>
                <span className="text-terminal-amber">Cmd/Ctrl +</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Zoom out</span>
                <span className="text-terminal-amber">Cmd/Ctrl -</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Reset to 100%</span>
                <span className="text-terminal-amber">Cmd/Ctrl 0</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-terminal-border" />

        {/* Panel Visibility */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <LayoutGrid className="w-4 h-4 text-terminal-amber" />
            <span className="text-white text-sm font-medium">Panel Visibility</span>
          </div>

          <p className="text-gray-400 text-xs mb-4">
            Choose which panels to display on the dashboard.
          </p>

          <div className="space-y-3">
            {/* Market Watch */}
            <ToggleRow
              label="Market Watch"
              enabled={panelVisibility.leftPanelVisible}
              onToggle={toggleLeftPanel}
            />

            {/* Live Chart */}
            <ToggleRow
              label="Live Chart"
              enabled={panelVisibility.chartVisible}
              onToggle={toggleChart}
            />

            {/* News Ticker */}
            <ToggleRow
              label="News Ticker"
              enabled={panelVisibility.newsTickerVisible}
              onToggle={toggleNewsTicker}
            />
          </div>
        </div>

        <div className="border-t border-terminal-border" />

        {/* Market Overview Symbols */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-terminal-amber" />
            <span className="text-white text-sm font-medium">Market Overview Symbols</span>
          </div>

          <p className="text-gray-400 text-xs mb-4">
            Customize which symbols appear in the market overview bar at the top. Add any stock or ETF symbol.
          </p>

          {/* Current Symbols */}
          <div className="flex flex-wrap gap-2 mb-4">
            {marketSymbols.map((symbol) => (
              <div
                key={symbol}
                className="flex items-center gap-1.5 bg-terminal-bg border border-terminal-border rounded px-2.5 py-1.5"
              >
                <span className="text-terminal-amber font-mono text-sm">{symbol}</span>
                <button
                  onClick={() => handleRemoveSymbol(symbol)}
                  className="text-gray-500 hover:text-red-400 transition-colors"
                  title="Remove symbol"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Add Symbol Input */}
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSymbol()}
              placeholder="Enter symbol (e.g., AAPL)"
              maxLength={10}
              className="flex-1 bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-terminal-amber/50"
              disabled={marketSymbols.length >= MAX_SYMBOLS}
            />
            <button
              onClick={handleAddSymbol}
              disabled={!newSymbol.trim() || marketSymbols.length >= MAX_SYMBOLS}
              className="px-4 py-2 bg-terminal-amber text-black rounded text-sm font-medium hover:bg-terminal-amber/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Plus size={14} />
              Add
            </button>
          </div>

          {/* Reset & Limit Info */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">
              {marketSymbols.length}/{MAX_SYMBOLS} symbols
            </span>
            <button
              onClick={handleResetSymbols}
              className="text-gray-400 hover:text-terminal-amber transition-colors"
            >
              Reset to defaults
            </button>
          </div>
        </div>

        <div className="border-t border-terminal-border" />

        {/* Ticker Speed */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Monitor className="w-4 h-4 text-terminal-amber" />
            <span className="text-white text-sm font-medium">Ticker Speed</span>
          </div>

          <p className="text-gray-400 text-xs mb-4">
            Adjust the scrolling speed of the news and economic calendar tickers.
          </p>

          {/* Speed value display */}
          <div className="text-center text-terminal-amber text-sm font-mono mb-2">
            {tickerSpeed}s
          </div>

          <div className="flex items-center gap-3">
            <span title="Slow">
              <Snail size={20} className="text-gray-400" />
            </span>
            <div className="flex-1 flex flex-col">
              <input
                type="range"
                min="10"
                max="60"
                step="10"
                value={tickerSpeed}
                onChange={(e) => setTickerSpeed(Number(e.target.value))}
                className="w-full h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-terminal-amber"
              />
              {/* Tick marks - prominent vertical lines */}
              <div className="flex justify-between px-0 mt-2">
                {[10, 20, 30, 40, 50, 60].map((val) => (
                  <div key={val} className="flex flex-col items-center">
                    <div
                      className={`w-1 h-4 rounded-sm ${tickerSpeed === val ? 'bg-terminal-amber' : 'bg-gray-600'}`}
                    />
                    <span className={`text-[9px] mt-0.5 ${tickerSpeed === val ? 'text-terminal-amber' : 'text-gray-500'}`}>
                      {val}s
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <span title="Fast">
              <Rabbit size={20} className="text-gray-400" />
            </span>
          </div>
        </div>

        <div className="border-t border-terminal-border" />

        {/* Color Vision Deficiency Mode */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-terminal-amber" />
            <span className="text-white text-sm font-medium">Accessibility</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-gray-300 text-sm">Color Vision Deficiency Mode</span>
              <p className="text-gray-500 text-xs mt-1">
                Use patterns and shapes instead of red/green for price changes
              </p>
            </div>
            <button
              onClick={toggleCvdMode}
              className={`w-12 h-6 rounded-full transition-colors ${
                cvdMode ? 'bg-terminal-amber' : 'bg-terminal-border'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  cvdMode ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Toggle switch row component
 */
function ToggleRow({
  label,
  enabled,
  onToggle,
}: {
  label: string
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-300 text-sm">{label}</span>
      <button
        onClick={onToggle}
        className={`w-12 h-6 rounded-full transition-colors ${
          enabled ? 'bg-terminal-amber' : 'bg-terminal-border'
        }`}
      >
        <div
          className={`w-5 h-5 rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}
