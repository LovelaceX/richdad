/**
 * DisplaySection
 *
 * Settings section for visual accessibility and interface scaling.
 */

import { useState, useEffect } from 'react'
import { Monitor, LayoutGrid, Eye, TrendingUp, X, Plus, Snail, Rabbit, ChevronDown, BarChart3 } from 'lucide-react'
import { useSettingsStore } from '../../../stores/settingsStore'
import { getSettings, updateSettings } from '../../../lib/db'
import { useStockAutocomplete } from '../hooks/useStockAutocomplete'
import { HelpTooltip } from '../../../components/common'

// Default market symbols
const DEFAULT_MARKET_SYMBOLS = ['SPY', 'QQQ', 'DIA', 'VXX']
const MAX_SYMBOLS = 8

// Available market indices for Default Index dropdown
const AVAILABLE_INDICES = [
  { etf: 'SPY', name: 'S&P 500', index: '^GSPC' },
  { etf: 'QQQ', name: 'NASDAQ-100', index: '^NDX' },
  { etf: 'DIA', name: 'Dow Jones', index: '^DJI' },
  { etf: 'IWM', name: 'Russell 2000', index: '^RUT' },
  { etf: 'VTI', name: 'Total Market', index: '^VTI' },
  { etf: 'SMH', name: 'Semiconductors', index: '^SOX' },
  { etf: 'VXX', name: 'Volatility', index: '^VIX' },
] as const

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

  // Stock autocomplete for adding new symbols
  const symbolAutocomplete = useStockAutocomplete({
    onSelect: (symbol) => {
      if (symbol && !marketSymbols.includes(symbol) && marketSymbols.length < MAX_SYMBOLS) {
        const updated = [...marketSymbols, symbol]
        saveMarketSymbols(updated)
        symbolAutocomplete.reset()
      }
    }
  })

  // Default Index state
  const [defaultIndex, setDefaultIndex] = useState('SPY')

  // Load market symbols and default index from settings
  useEffect(() => {
    async function loadSettings() {
      try {
        const settings = await getSettings()
        if (settings.marketOverviewSymbols?.length) {
          setMarketSymbols(settings.marketOverviewSymbols)
        }
        if (settings.selectedMarket?.etf) {
          setDefaultIndex(settings.selectedMarket.etf)
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
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

  // Add a new symbol (called from Add button)
  const handleAddSymbol = () => {
    const symbol = symbolAutocomplete.inputValue.toUpperCase().trim()
    if (!symbol) return
    if (marketSymbols.includes(symbol)) {
      symbolAutocomplete.reset()
      return
    }
    if (marketSymbols.length >= MAX_SYMBOLS) return

    const updated = [...marketSymbols, symbol]
    saveMarketSymbols(updated)
    symbolAutocomplete.reset()
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

  // Handle default index change
  const handleDefaultIndexChange = async (etf: string) => {
    const selectedIndex = AVAILABLE_INDICES.find(i => i.etf === etf)
    if (!selectedIndex) return

    setDefaultIndex(etf)
    await updateSettings({
      selectedMarket: {
        name: selectedIndex.name,
        etf: selectedIndex.etf,
        index: selectedIndex.index
      }
    })
    // Notify other components (triggers marketStore.loadSelectedMarket)
    window.dispatchEvent(new Event('settings-updated'))
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
            <HelpTooltip content="Scale the entire interface up or down. Useful for high-DPI displays or if you prefer larger text and controls." />
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

        {/* Default Index */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-terminal-amber" />
            <span className="text-white text-sm font-medium">Default Index</span>
            <HelpTooltip content="The market index shown on startup. Sets your primary chart, watchlist, and market context for AI analysis." />
          </div>

          <p className="text-gray-400 text-xs mb-4">
            Choose which market index loads when you open RichDad. This sets your primary chart and watchlist.
          </p>

          {/* Index Dropdown */}
          <div className="relative">
            <select
              value={defaultIndex}
              onChange={(e) => handleDefaultIndexChange(e.target.value)}
              className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2.5 text-white text-sm font-medium appearance-none cursor-pointer hover:border-terminal-amber/50 focus:outline-none focus:border-terminal-amber transition-colors"
            >
              {AVAILABLE_INDICES.map((index) => (
                <option key={index.etf} value={index.etf}>
                  {index.name} ({index.etf})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <p className="text-gray-500 text-xs mt-3">
            Changing this will update your chart and Market Watch panel immediately.
          </p>
        </div>

        <div className="border-t border-terminal-border" />

        {/* Panel Visibility */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <LayoutGrid className="w-4 h-4 text-terminal-amber" />
            <span className="text-white text-sm font-medium">Panel Visibility</span>
            <HelpTooltip content="Toggle dashboard panels on/off. Hide panels you don't use to maximize chart space." />
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
            <HelpTooltip content="Symbols shown in the top bar for quick market reference. Add ETFs, indices, or stocks you monitor frequently." />
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

          {/* Add Symbol Input with Autocomplete */}
          <div className="relative mb-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={symbolAutocomplete.inputValue}
                onChange={(e) => symbolAutocomplete.handleInputChange(e.target.value.toUpperCase())}
                onKeyDown={symbolAutocomplete.handleKeyDown}
                placeholder="Search symbol (e.g., AAPL)"
                maxLength={10}
                className="flex-1 bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-terminal-amber/50"
                disabled={marketSymbols.length >= MAX_SYMBOLS}
              />
              <button
                onClick={handleAddSymbol}
                disabled={!symbolAutocomplete.inputValue.trim() || marketSymbols.length >= MAX_SYMBOLS}
                className="px-4 py-2 bg-terminal-amber text-black rounded text-sm font-medium hover:bg-terminal-amber/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Plus size={14} />
                Add
              </button>
            </div>

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
            <HelpTooltip content="How long the ticker takes to complete one full scroll. Higher = slower, more time to read. Lower = faster scrolling." />
          </div>

          <p className="text-gray-400 text-xs mb-4">
            Control the scrolling speed of the News ticker ({Math.round(tickerSpeed / 60)} min).
          </p>

          {/* Slider - 60-600 seconds (1-10 minutes) */}
          <div className="flex items-center gap-3">
            <Rabbit size={20} className="text-gray-400 flex-shrink-0" />

            <input
              type="range"
              min="60"
              max="600"
              step="60"
              value={tickerSpeed < 60 ? 60 : tickerSpeed}
              onChange={(e) => setTickerSpeed(Number(e.target.value))}
              className="flex-1 h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-terminal-amber"
            />

            <Snail size={20} className="text-gray-400 flex-shrink-0" />
          </div>
        </div>

        <div className="border-t border-terminal-border" />

        {/* Color Vision Deficiency Mode */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-terminal-amber" />
            <span className="text-white text-sm font-medium">Accessibility</span>
            <HelpTooltip content="Visual accessibility options for users with color vision deficiency. Uses shapes and patterns instead of red/green." />
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
