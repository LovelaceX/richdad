import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Search, Terminal, TrendingUp } from 'lucide-react'
import { useMarketStore } from '../../stores/marketStore'
import { searchStocks, StockInfo } from '../../lib/stockSymbols'
import { useNavigationStore } from '../../stores/navigationStore'
import { useHelpStore } from '../../stores/helpStore'

// Available commands with descriptions
const COMMANDS = [
  { cmd: '/help', desc: 'Open Reference Guide', action: 'help' },
  { cmd: '/settings', desc: 'Open Settings', action: 'settings' },
  { cmd: '/news', desc: 'Go to News page', action: 'news' },
  { cmd: '/backtest', desc: 'AI Backtesting', action: 'backtest' },
  { cmd: '/dashboard', desc: 'Go to Dashboard', action: 'dashboard' },
]

export function CommandInput() {
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const setSelectedTicker = useMarketStore(state => state.setSelectedTicker)
  const setPage = useNavigationStore(state => state.setPage)
  const openHelp = useHelpStore(state => state.openHelp)

  // Get suggestions based on input
  const suggestions = useMemo(() => {
    const input = value.trim()
    if (!input) return []

    // If starts with /, show command suggestions
    if (input.startsWith('/')) {
      const cmdQuery = input.toLowerCase()
      return COMMANDS
        .filter(c => c.cmd.toLowerCase().startsWith(cmdQuery))
        .map(c => ({ type: 'command' as const, ...c }))
    }

    // Otherwise search stocks
    const stocks = searchStocks(input)
    return stocks.map(s => ({ type: 'stock' as const, ...s }))
  }, [value])

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedIndex(0)
  }, [suggestions])

  const executeSelection = useCallback((item: typeof suggestions[0]) => {
    if (item.type === 'command') {
      const cmd = item as { type: 'command'; cmd: string; desc: string; action: string }
      if (cmd.action === 'help') {
        openHelp()
      } else {
        setPage(cmd.action as 'dashboard' | 'news' | 'backtest' | 'settings')
      }
    } else {
      const stock = item as { type: 'stock' } & StockInfo
      setSelectedTicker(stock.symbol)
    }
    setValue('')
    inputRef.current?.blur()
  }, [setSelectedTicker, setPage, openHelp])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Tab') {
        e.preventDefault()
        // Tab completes the current selection
        if (suggestions[selectedIndex]) {
          if (suggestions[selectedIndex].type === 'stock') {
            setValue((suggestions[selectedIndex] as StockInfo & { type: 'stock' }).symbol)
          } else {
            setValue((suggestions[selectedIndex] as { type: 'command'; cmd: string }).cmd)
          }
        }
        return
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      // If we have suggestions, execute the selected one
      if (suggestions.length > 0 && suggestions[selectedIndex]) {
        executeSelection(suggestions[selectedIndex])
        return
      }

      // Otherwise try to parse input directly
      const input = value.toUpperCase().trim()
      if (input) {
        // Try as ticker
        setSelectedTicker(input)
        setValue('')
      }
    }

    if (e.key === 'Escape') {
      setValue('')
      inputRef.current?.blur()
    }
  }, [value, suggestions, selectedIndex, setSelectedTicker, executeSelection])

  return (
    <div className="relative w-full max-w-xl">
      <div className={`
        relative flex items-center w-full
        bg-terminal-bg border rounded
        transition-all duration-200
        ${isFocused ? 'border-terminal-amber' : 'border-terminal-border'}
      `}>
        <div className="flex items-center px-3 text-gray-500">
          {isFocused ? (
            <Terminal size={16} className="text-terminal-amber" />
          ) : (
            <Search size={16} />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          data-command-input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder="Type ticker or command... (e.g., AAPL, /help)"
          className="
            flex-1 bg-transparent py-2 pr-3
            text-white text-sm font-mono
            placeholder:text-gray-600
            focus:outline-none
            no-drag
          "
        />

        <div className="px-3 text-gray-600 text-xs font-mono">
          <kbd className="px-1.5 py-0.5 bg-terminal-border rounded text-[10px]">⌘K</kbd>
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isFocused && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-terminal-panel border border-terminal-border rounded-lg shadow-xl z-50 overflow-hidden">
          {suggestions.map((item, index) => (
            <button
              key={item.type === 'command' ? (item as { cmd: string }).cmd : (item as StockInfo).symbol}
              onClick={() => executeSelection(item)}
              className={`
                w-full px-3 py-2 flex items-center gap-3 text-left transition-colors
                ${index === selectedIndex ? 'bg-terminal-border' : 'hover:bg-terminal-border/50'}
              `}
            >
              {item.type === 'command' ? (
                <>
                  <Terminal size={14} className="text-terminal-amber flex-shrink-0" />
                  <span className="text-terminal-amber font-mono text-sm">{(item as { cmd: string }).cmd}</span>
                  <span className="text-gray-500 text-xs ml-auto">{(item as { desc: string }).desc}</span>
                </>
              ) : (
                <>
                  <TrendingUp size={14} className="text-gray-500 flex-shrink-0" />
                  <span className="text-white font-mono text-sm font-medium">{(item as StockInfo).symbol}</span>
                  <span className="text-gray-400 text-xs truncate">{(item as StockInfo).name}</span>
                  {(item as StockInfo).sector && (
                    <span className="text-gray-600 text-xs ml-auto">{(item as StockInfo).sector}</span>
                  )}
                </>
              )}
            </button>
          ))}
          <div className="px-3 py-1.5 bg-terminal-bg border-t border-terminal-border text-gray-600 text-xs flex items-center gap-4">
            <span><kbd className="px-1 py-0.5 bg-terminal-border rounded text-[10px]">↑↓</kbd> navigate</span>
            <span><kbd className="px-1 py-0.5 bg-terminal-border rounded text-[10px]">Tab</kbd> complete</span>
            <span><kbd className="px-1 py-0.5 bg-terminal-border rounded text-[10px]">Enter</kbd> select</span>
          </div>
        </div>
      )}
    </div>
  )
}
