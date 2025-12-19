import { useState, useCallback } from 'react'
import { Search, Terminal } from 'lucide-react'
import { useMarketStore } from '../../stores/marketStore'
import { POPULAR_STOCKS } from '../../lib/stockSymbols'

export function CommandInput() {
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const setSelectedTicker = useMarketStore(state => state.setSelectedTicker)

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const input = value.toUpperCase().trim()

      // Check if it's a ticker symbol
      const ticker = POPULAR_STOCKS.find(t => t.symbol === input)
      if (ticker) {
        setSelectedTicker(ticker.symbol)
        setValue('')
        return
      }

      // Handle other commands
      if (input.startsWith('/')) {
        console.log('Command:', input)
      }

      setValue('')
    }

    if (e.key === 'Escape') {
      setValue('')
      ;(e.target as HTMLInputElement).blur()
    }
  }, [value, setSelectedTicker])

  return (
    <div className={`
      relative flex items-center w-full max-w-xl
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
        type="text"
        data-command-input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
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
  )
}
