export interface Ticker {
  symbol: string
  name: string
  sector: string
}

export interface Quote {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  high: number
  low: number
  open: number
  previousClose: number
  timestamp: number
}

export interface CandleData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface NewsItem {
  id: string
  headline: string
  source: string
  url?: string
  timestamp: number
  ticker?: string
  tickers?: string[]
  sentiment?: 'positive' | 'negative' | 'neutral'
  summary?: string
  imageUrl?: string
}

export interface AIRecommendation {
  id: string
  ticker: string
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  rationale: string
  sources: { title: string; url: string }[]
  timestamp: number
  priceTarget?: number
  stopLoss?: number
}

export interface AIMessage {
  id: string
  type: 'recommendation' | 'analysis' | 'alert' | 'info' | 'chat'
  role?: 'user' | 'assistant'
  content: string
  timestamp: number
  ticker?: string
}

export interface WatchlistItem extends Ticker {
  quote: Quote
  inAlert?: boolean
}

// Market Index
export interface MarketIndex {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
}

// Page types
export type PageId = 'dashboard' | 'news' | 'economic-calendar' | 'settings'

// Economic Calendar Event
export interface EconomicEvent {
  id: string
  date: Date
  time: string
  country: string
  event: string
  importance: 'low' | 'medium' | 'high'
  actual?: string
  forecast?: string
  previous?: string
  source: string
  url?: string
}

// Tone types
export type ToneType = 'conservative' | 'aggressive' | 'humorous' | 'professional'

// Sound types
export type SoundType = 'buy' | 'sell' | 'hold' | 'alert'

// Extended NewsItem with summary for hover preview
export interface NewsItemExtended extends NewsItem {
  summary?: string
  url?: string
  imageUrl?: string
}

// Electron API types
declare global {
  interface Window {
    electronAPI: {
      minimize: () => void
      maximize: () => void
      close: () => void
      isMaximized: () => Promise<boolean>
      onMaximizeChange: (callback: (isMaximized: boolean) => void) => void
    }
  }
}
