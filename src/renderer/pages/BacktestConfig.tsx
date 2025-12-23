/**
 * Backtest Configuration Component
 * Form for configuring backtest parameters
 */

import { useRef } from 'react'
import { Calendar, DollarSign, Percent, TrendingUp } from 'lucide-react'
import type { BacktestConfig as BacktestConfigType } from '../types'
import { useStockAutocomplete } from './Settings/hooks/useStockAutocomplete'
import type { StockInfo } from '../lib/stockSymbols'

interface BacktestConfigProps {
  config: Omit<BacktestConfigType, 'id'>
  onChange: (config: Omit<BacktestConfigType, 'id'>) => void
  disabled?: boolean
}

export function BacktestConfig({ config, onChange, disabled }: BacktestConfigProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const updateConfig = (updates: Partial<Omit<BacktestConfigType, 'id'>>) => {
    onChange({ ...config, ...updates })
  }

  // Stock autocomplete hook
  const {
    inputValue,
    searchResults,
    selectedIndex,
    isOpen,
    handleInputChange,
    handleKeyDown,
    handleSelect,
    clearResults
  } = useStockAutocomplete({
    initialValue: config.symbol,
    onSelect: (symbol: string) => {
      updateConfig({ symbol })
    }
  })

  // Handle click on stock item
  const handleStockClick = (stock: StockInfo) => {
    handleSelect(stock)
    updateConfig({ symbol: stock.symbol })
  }

  // Handle blur - close dropdown after delay (allows click to register)
  const handleBlur = () => {
    setTimeout(() => {
      clearResults()
    }, 200)
  }

  // Format date for input
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toISOString().split('T')[0]
  }

  // Parse date from input
  const parseDate = (dateStr: string) => {
    return new Date(dateStr).getTime()
  }

  return (
    <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-medium text-white flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-terminal-amber" />
        Configuration
      </h3>

      {/* Symbol with Autocomplete */}
      <div ref={containerRef} className="relative">
        <label className="block text-xs text-gray-400 mb-1">Symbol</label>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          disabled={disabled}
          className="w-full px-3 py-2 bg-terminal-bg border border-terminal-border rounded text-white text-sm focus:outline-none focus:border-terminal-amber disabled:opacity-50"
          placeholder="SPY, AAPL, TSLA..."
          autoComplete="off"
        />

        {/* Autocomplete Dropdown */}
        {isOpen && searchResults.length > 0 && (
          <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-terminal-panel border border-terminal-border rounded shadow-lg max-h-48 overflow-y-auto">
            {searchResults.map((stock, idx) => (
              <button
                key={stock.symbol}
                type="button"
                onClick={() => handleStockClick(stock)}
                className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors ${
                  idx === selectedIndex
                    ? 'bg-terminal-amber/20 text-terminal-amber'
                    : 'text-white hover:bg-terminal-border'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium">{stock.symbol}</span>
                  <span className="text-gray-400 text-xs truncate max-w-[180px]">{stock.name}</span>
                </div>
                {stock.sector && (
                  <span className="text-xs text-gray-500">{stock.sector}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Start Date</label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={formatDate(config.startDate)}
              onChange={(e) => updateConfig({ startDate: parseDate(e.target.value) })}
              disabled={disabled}
              className="w-full pl-8 pr-3 py-2 bg-terminal-bg border border-terminal-border rounded text-white text-sm focus:outline-none focus:border-terminal-amber disabled:opacity-50"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">End Date</label>
          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={formatDate(config.endDate)}
              onChange={(e) => updateConfig({ endDate: parseDate(e.target.value) })}
              disabled={disabled}
              className="w-full pl-8 pr-3 py-2 bg-terminal-bg border border-terminal-border rounded text-white text-sm focus:outline-none focus:border-terminal-amber disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Quick Date Buttons */}
      <div className="flex gap-2">
        {[
          { label: '1M', days: 30 },
          { label: '3M', days: 90 },
          { label: '6M', days: 180 },
          { label: '1Y', days: 365 }
        ].map(({ label, days }) => (
          <button
            key={label}
            onClick={() => updateConfig({
              startDate: Date.now() - (days * 24 * 60 * 60 * 1000),
              endDate: Date.now()
            })}
            disabled={disabled}
            className="flex-1 px-2 py-1 text-xs bg-terminal-border text-gray-300 rounded hover:bg-terminal-border/80 disabled:opacity-50 transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Timeframe */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Timeframe</label>
        <select
          value={config.timeframe}
          onChange={(e) => updateConfig({ timeframe: e.target.value as '1d' | '1h' | '15m' })}
          disabled={disabled}
          className="w-full px-3 py-2 bg-terminal-bg border border-terminal-border rounded text-white text-sm focus:outline-none focus:border-terminal-amber disabled:opacity-50"
        >
          <option value="1d">Daily (Recommended)</option>
          <option value="1h">Hourly</option>
          <option value="15m">15 Minutes</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Daily uses fewer AI calls and is recommended for initial testing.
        </p>
      </div>

      {/* Initial Capital */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Initial Capital</label>
        <div className="relative">
          <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="number"
            value={config.initialCapital}
            onChange={(e) => updateConfig({ initialCapital: Number(e.target.value) })}
            disabled={disabled}
            min={1000}
            step={1000}
            className="w-full pl-8 pr-3 py-2 bg-terminal-bg border border-terminal-border rounded text-white text-sm focus:outline-none focus:border-terminal-amber disabled:opacity-50"
          />
        </div>
      </div>

      {/* Position Size */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Position Size (%)</label>
        <div className="relative">
          <Percent className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="number"
            value={config.positionSizePercent}
            onChange={(e) => updateConfig({ positionSizePercent: Number(e.target.value) })}
            disabled={disabled}
            min={1}
            max={100}
            step={5}
            className="w-full pl-8 pr-3 py-2 bg-terminal-bg border border-terminal-border rounded text-white text-sm focus:outline-none focus:border-terminal-amber disabled:opacity-50"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Percentage of capital per trade. Lower = less risk.
        </p>
      </div>

      {/* Confidence Threshold */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Confidence Threshold (%)</label>
        <input
          type="range"
          value={config.confidenceThreshold}
          onChange={(e) => updateConfig({ confidenceThreshold: Number(e.target.value) })}
          disabled={disabled}
          min={50}
          max={95}
          step={5}
          className="w-full h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-terminal-amber disabled:opacity-50"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>50% (More trades)</span>
          <span className="text-terminal-amber font-medium">{config.confidenceThreshold}%</span>
          <span>95% (Fewer trades)</span>
        </div>
      </div>

      {/* Include News Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-white">Include News</span>
          <p className="text-xs text-gray-500">Slower but more accurate</p>
        </div>
        <button
          onClick={() => updateConfig({ includeNews: !config.includeNews })}
          disabled={disabled}
          className={`w-11 h-6 rounded-full transition-colors ${
            config.includeNews ? 'bg-terminal-amber' : 'bg-terminal-border'
          } disabled:opacity-50`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
              config.includeNews ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
    </div>
  )
}
