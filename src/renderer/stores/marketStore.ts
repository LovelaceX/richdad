import { create } from 'zustand'
import type { Quote, CandleData, WatchlistItem } from '../types'
import { TICKERS, generateQuote, generateCandleData } from '../lib/mockData'

// Extended timeframe options: 1M, 5M, 15M, 30M, 45M, 1H, 2H, 4H, 5H, 1D, 1W
type Timeframe = '1min' | '5min' | '15min' | '30min' | '45min' | '60min' | '120min' | '240min' | '300min' | 'daily' | 'weekly'

interface MarketState {
  watchlist: WatchlistItem[]
  selectedTicker: string
  chartData: CandleData[]
  cacheStatus: { age: number; isFresh: boolean } | null
  timeframe: Timeframe  // Chart timeframe
  selectedDate: string  // ISO date string (YYYY-MM-DD)
  isChartExpanded: boolean  // Full-screen chart mode

  // Actions
  setSelectedTicker: (symbol: string) => void
  updateQuote: (symbol: string, quote: Quote) => void
  setQuotes: (quotes: Quote[]) => void
  setCacheStatus: (status: { age: number; isFresh: boolean }) => void
  refreshAllQuotes: () => void
  setTimeframe: (timeframe: Timeframe) => void
  setSelectedDate: (date: string) => void
  loadChartData: (symbol?: string, interval?: Timeframe) => Promise<void>
  addToWatchlist: (symbol: string, name?: string) => void
  removeFromWatchlist: (symbol: string) => void
  toggleChartExpanded: () => void
}

export const useMarketStore = create<MarketState>((set, get) => ({
  watchlist: TICKERS.map(ticker => ({
    ...ticker,
    quote: generateQuote(ticker.symbol),
  })),

  selectedTicker: 'SPY',

  chartData: generateCandleData('SPY'),

  cacheStatus: null,

  timeframe: '5min',  // Default to 5min for SPY

  selectedDate: new Date().toISOString().split('T')[0],  // Today's date

  isChartExpanded: false,

  setSelectedDate: (date: string) => {
    set({ selectedDate: date })
    // Reload chart with new date (for daily/weekly timeframe)
    const { selectedTicker, timeframe } = get()
    if (timeframe === 'daily' || timeframe === 'weekly') {
      get().loadChartData(selectedTicker, timeframe).catch(err => {
        console.error('[Market Store] Chart load error:', err)
      })
    }
  },

  setSelectedTicker: (symbol: string) => {
    // When changing ticker, set appropriate default timeframe
    const timeframe = symbol === 'SPY' ? '5min' : 'daily'
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

  setTimeframe: (timeframe: Timeframe) => {
    set({ timeframe })
    // Reload chart with new timeframe
    const { selectedTicker } = get()
    get().loadChartData(selectedTicker, timeframe).catch(err => {
      console.error('[Market Store] Chart load error:', err)
    })
  },

  loadChartData: async (symbol?: string, interval?: Timeframe) => {
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

  addToWatchlist: (symbol: string, name?: string) => {
    const { watchlist } = get()
    // Check if already in watchlist
    if (watchlist.some(item => item.symbol.toUpperCase() === symbol.toUpperCase())) {
      console.log(`[Market Store] ${symbol} already in watchlist`)
      return
    }

    const newItem: WatchlistItem = {
      symbol: symbol.toUpperCase(),
      name: name || symbol.toUpperCase(),
      sector: 'Custom',
      quote: generateQuote(symbol.toUpperCase())
    }

    set(state => ({
      watchlist: [...state.watchlist, newItem]
    }))
    console.log(`[Market Store] Added ${symbol} to watchlist`)
  },

  removeFromWatchlist: (symbol: string) => {
    set(state => ({
      watchlist: state.watchlist.filter(item => item.symbol !== symbol)
    }))
    console.log(`[Market Store] Removed ${symbol} from watchlist`)
  },

  toggleChartExpanded: () => {
    set(state => ({ isChartExpanded: !state.isChartExpanded }))
  },
}))
