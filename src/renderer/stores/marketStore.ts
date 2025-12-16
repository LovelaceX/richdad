import { create } from 'zustand'
import type { Quote, CandleData, WatchlistItem } from '../types'
import { TICKERS, generateQuote, generateCandleData } from '../lib/mockData'

interface MarketState {
  watchlist: WatchlistItem[]
  selectedTicker: string
  chartData: CandleData[]
  cacheStatus: { age: number; isFresh: boolean } | null

  // Actions
  setSelectedTicker: (symbol: string) => void
  updateQuote: (symbol: string, quote: Quote) => void
  setQuotes: (quotes: Quote[]) => void
  setCacheStatus: (status: { age: number; isFresh: boolean }) => void
  refreshAllQuotes: () => void
  loadChartData: (symbol: string) => Promise<void>
}

export const useMarketStore = create<MarketState>((set, get) => ({
  watchlist: TICKERS.map(ticker => ({
    ...ticker,
    quote: generateQuote(ticker.symbol),
  })),

  selectedTicker: 'SPY',

  chartData: generateCandleData('SPY'),

  cacheStatus: null,

  setSelectedTicker: (symbol: string) => {
    set({ selectedTicker: symbol })
    // Trigger chart load asynchronously (don't await)
    get().loadChartData(symbol).catch(err => {
      console.error('[Market Store] Chart load error:', err)
    })
  },

  updateQuote: (symbol: string, quote: Quote) => {
    set(state => ({
      watchlist: state.watchlist.map(item =>
        item.symbol === symbol ? { ...item, quote } : item
      ),
    }))
  },

  setQuotes: (quotes: Quote[]) => {
    set(state => ({
      watchlist: state.watchlist.map(item => {
        const quote = quotes.find(q => q.symbol === item.symbol)
        return quote ? { ...item, quote } : item
      }),
    }))
  },

  setCacheStatus: (status: { age: number; isFresh: boolean }) => {
    set({ cacheStatus: status })
  },

  refreshAllQuotes: () => {
    set(state => ({
      watchlist: state.watchlist.map(item => ({
        ...item,
        quote: generateQuote(item.symbol),
      })),
    }))
  },

  loadChartData: async (symbol: string) => {
    try {
      // Import marketData service
      const { fetchHistoricalData } = await import('../../services/marketData')

      // Determine interval based on symbol
      // SPY uses 5-minute intraday data for better technical signals
      // Other symbols use daily data (less API budget)
      const interval = symbol === 'SPY' ? 'intraday' : 'daily'

      console.log(`[Market Store] Loading chart data for ${symbol} (${interval})`)
      const candles = await fetchHistoricalData(symbol, interval)

      set({
        chartData: candles,
        selectedTicker: symbol
      })

      console.log(`[Market Store] Chart updated with ${candles.length} candles (${interval})`)
    } catch (error) {
      console.error('[Market Store] Failed to load chart data:', error)

      // Fallback to mock data
      const { generateCandleData } = await import('../lib/mockData')
      set({ chartData: generateCandleData(symbol, 90) })
    }
  },
}))
