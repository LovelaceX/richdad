import { Clock } from 'lucide-react'

interface TimeframeSelectorProps {
  value: 'intraday' | 'daily'
  onChange: (value: 'intraday' | 'daily') => void
  symbol: string
}

export function TimeframeSelector({ value, onChange, symbol }: TimeframeSelectorProps) {
  // Only SPY gets intraday 5-minute data (free tier budget optimization)
  const showIntraday = symbol === 'SPY'

  return (
    <div className="flex items-center gap-2 no-drag">
      <Clock size={12} className="text-gray-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as 'intraday' | 'daily')}
        className="bg-terminal-bg border border-terminal-border text-white text-xs px-2 py-1 rounded hover:border-terminal-amber transition-colors focus:outline-none focus:border-terminal-amber"
      >
        {showIntraday && (
          <option value="intraday">5-Minute</option>
        )}
        <option value="daily">Daily</option>
      </select>
    </div>
  )
}
