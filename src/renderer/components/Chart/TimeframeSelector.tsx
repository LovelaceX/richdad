import { Clock } from 'lucide-react'

interface TimeframeSelectorProps {
  value: string
  onChange: (value: string) => void
  symbol: string
}

// Tiingo-supported timeframes only
const SPY_TIMEFRAMES = [
  { label: '1M', value: '1min' },
  { label: '5M', value: '5min' },
  { label: '15M', value: '15min' },
  { label: '30M', value: '30min' },
  { label: '1H', value: '60min' },
  { label: '2H', value: '120min' },
  { label: '4H', value: '240min' },
  { label: '1D', value: 'daily' },
  { label: '1W', value: 'weekly' },
]

const OTHER_TIMEFRAMES = [
  { label: '5M', value: '5min' },
  { label: '1H', value: '60min' },
  { label: '1D', value: 'daily' },
]

export function TimeframeSelector({ value, onChange, symbol }: TimeframeSelectorProps) {
  const options = symbol === 'SPY' ? SPY_TIMEFRAMES : OTHER_TIMEFRAMES

  return (
    <div className="flex items-center gap-2 no-drag">
      <Clock size={12} className="text-gray-400" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-terminal-bg border border-terminal-border text-white text-xs px-2 py-1 rounded hover:border-terminal-amber transition-colors focus:outline-none focus:border-terminal-amber"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}
