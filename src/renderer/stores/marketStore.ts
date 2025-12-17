import { create } from 'zustand'
import type { Quote, CandleData, WatchlistItem } from '../types'
import { TICKERS, generateQuote, generateCandleData } from '../lib/mockData'

interface MarketState {
  watchlist: WatchlistItem[]
  selectedTicker: string
  chartData: CandleData[]
  cacheStatus: { age: number; isFresh: boolean } | null
  timeframe: 'intraday' | 'daily'  // Chart timeframe

  // Actions
  setSelectedTicker: (symbol: string) => void
  updateQuote: (symbol: string, quote: Quote) => void
  setQuotes: (quotes: Quote[]) => void
  setCacheStatus: (status: { age: number; isFresh: boolean }) => void
  refreshAllQuotes: () => void
  setTimeframe: (timeframe: 'intraday' | 'daily') => void
  loadChartData: (symbol?: string, interval?: 'intraday' | 'daily') => Promise<void>
}

export const useMarketStore = create<MarketState>((set, get) => ({
  watchlist: TICKERS.map(ticker => ({
    ...ticker,
    quote: generateQuote(ticker.symbol),
  })),

  selectedTicker: 'SPY',

  chartData: generateCandleData('SPY'),

  cacheStatus: null,

  timeframe: 'intraday',  // Default to intraday for SPY

  setSelectedTicker: (symbol: string) => {
    // When changing ticker, set appropriate default timeframe
    const timeframe = symbol === 'SPY' ? 'intraday' : 'daily'
    set({ selectedTicker: symbol, timeframe })
    // Trigger chart load asynchronously (don't await)
    get().loadChartData(symbol, timeframe).catch(err => {
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

  setTimeframe: (timeframe: 'intraday' | 'daily') => {
    set({ timeframe })
    // Reload chart with new timeframe
    const { selectedTicker } = get()
    get().loadChartData(selectedTicker, timeframe).catch(err => {
      console.error('[Market Store] Chart load error:', err)
    })
  },

  loadChartData: async (symbol?: string, interval?: 'intraday' | 'daily') => {
    try {
      const state = get()
      const targetSymbol = symbol || state.selectedTicker
      const targetInterval = interval || state.timeframe

      // Import marketData service
      const { fetchHistoricalData } = await import('../../services/marketData')

      console.log(`[Market Store] Loading chart data for ${targetSymbol} (${targetInterval})`)
      const candles = await fetchHistoricalData(targetSymbol, targetInterval)

      set({
        chartData: candles,
        selectedTicker: targetSymbol
      })

      console.log(`[Market Store] Chart updated with ${candles.length} candles (${targetInterval})`)
    } catch (error) {
      console.error('[Market Store] Failed to load chart data:', error)

      // Fallback to mock data
      const { generateCandleData } = await import('../lib/mockData')
      set({ chartData: generateCandleData(symbol || get().selectedTicker, 90) })
    }
  },
}))
