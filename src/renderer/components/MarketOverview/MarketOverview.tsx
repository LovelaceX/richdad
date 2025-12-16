import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Clock } from 'lucide-react'
import type { MarketIndex } from '../../types'

// Mock market indices data
const MOCK_INDICES: MarketIndex[] = [
  { symbol: 'SPX', name: 'S&P 500', price: 5234.12, change: 41.87, changePercent: 0.81 },
  { symbol: 'NDX', name: 'NASDAQ', price: 16432.45, change: 187.23, changePercent: 1.15 },
  { symbol: 'DJI', name: 'DOW', price: 39123.67, change: -52.34, changePercent: -0.13 },
  { symbol: 'VIX', name: 'VIX', price: 14.23, change: -0.87, changePercent: -5.76 },
]

function getMarketStatus(): { isOpen: boolean; status: string } {
  const now = new Date()
  const day = now.getDay()
  const hour = now.getHours()
  const minute = now.getMinutes()
  const time = hour * 100 + minute

  // Market hours: 9:30 AM - 4:00 PM ET, Mon-Fri
  // This is simplified and doesn't account for holidays
  const isWeekday = day >= 1 && day <= 5
  const isMarketHours = time >= 930 && time < 1600

  if (!isWeekday) {
    return { isOpen: false, status: 'WEEKEND' }
  }

  if (time < 930) {
    return { isOpen: false, status: 'PRE-MARKET' }
  }

  if (time >= 1600 && time < 2000) {
    return { isOpen: false, status: 'AFTER-HOURS' }
  }

  if (isMarketHours) {
    return { isOpen: true, status: 'MARKET OPEN' }
  }

  return { isOpen: false, status: 'CLOSED' }
}

export function MarketOverview() {
  const [indices, setIndices] = useState<MarketIndex[]>(MOCK_INDICES)
  const [marketStatus, setMarketStatus] = useState(getMarketStatus())

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setIndices(prev => prev.map(idx => {
        const change = (Math.random() - 0.5) * 2
        const newPrice = idx.price + change
        const newChange = idx.change + change
        return {
          ...idx,
          price: newPrice,
          change: newChange,
          changePercent: (newChange / (newPrice - newChange)) * 100,
        }
      }))
      setMarketStatus(getMarketStatus())
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const formatPrice = (price: number) => {
    if (price >= 1000) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
    return price.toFixed(2)
  }

  return (
    <div className="h-8 bg-terminal-panel border-b border-terminal-border flex items-center px-4 gap-6 overflow-x-auto">
      {indices.map(index => {
        const isUp = index.change >= 0

        return (
          <div key={index.symbol} className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-gray-400 text-xs font-medium">{index.name}</span>
            {isUp ? (
              <TrendingUp className="w-3 h-3 text-terminal-up" />
            ) : (
              <TrendingDown className="w-3 h-3 text-terminal-down" />
            )}
            <span className="text-white text-xs font-mono">{formatPrice(index.price)}</span>
            <span className={`text-xs font-mono ${isUp ? 'text-terminal-up' : 'text-terminal-down'}`}>
              ({isUp ? '+' : ''}{index.changePercent.toFixed(2)}%)
            </span>
          </div>
        )
      })}

      {/* Market Status */}
      <div className="ml-auto flex items-center gap-2">
        <Clock className="w-3 h-3 text-gray-500" />
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${marketStatus.isOpen ? 'bg-terminal-up animate-pulse' : 'bg-gray-500'}`} />
          <span className={`text-xs font-medium ${marketStatus.isOpen ? 'text-terminal-up' : 'text-gray-500'}`}>
            {marketStatus.status}
          </span>
        </div>
      </div>
    </div>
  )
}
