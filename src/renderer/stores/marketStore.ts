import { create } from 'zustand'
import type { Quote, CandleData, WatchlistItem } from '../types'
import { generateQuote, generateCandleData } from '../lib/mockData'
import { TOP_10_TICKERS, isTop10Symbol } from '../lib/constants'
import { getUserWatchlist, addToUserWatchlist, removeFromUserWatchlist } from '../lib/db'

// Extended timeframe options: 1M, 5M, 15M, 30M, 45M, 1H, 2H, 4H, 5H, 1D, 1W
type Timeframe = '1min' | '5min' | '15min' | '30min' | '45min' | '60min' | '120min' | '240min' | '300min' | 'daily' | 'weekly'

interface MarketState {
  // Split watchlist into two parts
  top10: WatchlistItem[]         // Static Top 10 (cannot be removed)
  userWatchlist: WatchlistItem[] // User-added symbols (persisted)
  watchlist: WatchlistItem[]     // Combined for display (top10 + userWatchlist, deduplicated)

  selectedTicker: string
  chartData: CandleData[]
  cacheStatus: { age: number; isFresh: boolean } | null
  timeframe: Timeframe  // Chart timeframe
  selectedDate: string  // ISO date string (YYYY-MM-DD)
  isChartExpanded: boolean  // Full-screen chart mode
  isWatchlistLoaded: boolean  // Track if user watchlist has been loaded from DB

  // Actions
  setSelectedTicker: (symbol: string) => void
  updateQuote: (symbol: string, quote: Quote) => void
  setQuotes: (quotes: Quote[]) => void
  setCacheStatus: (status: { age: number; isFresh: boolean }) => void
  refreshAllQuotes: () => void
  setTimeframe: (timeframe: Timeframe) => void
  setSelectedDate: (date: string) => void
  loadChartData: (symbol?: string, interval?: Timeframe) => Promise<void>
  loadUserWatchlist: () => Promise<void>  // Load from IndexedDB
  addToWatchlist: (symbol: string, name?: string, sector?: string) => Promise<void>
  removeFromWatchlist: (symbol: string) => Promise<void>
  toggleChartExpanded: () => void
}

// Initialize Top 10 with quotes
const initialTop10: WatchlistItem[] = TOP_10_TICKERS.map(ticker => ({
  ...ticker,
  quote: generateQuote(ticker.symbol),
}))

// Helper: Combine top10 and userWatchlist, removing duplicates
function combineWatchlists(top10: WatchlistItem[], userWatchlist: WatchlistItem[]): WatchlistItem[] {
  const top10Symbols = new Set(top10.map(item => item.symbol))
  // Filter out any user items that are already in Top 10
  const uniqueUserItems = userWatchlist.filter(item => !top10Symbols.has(item.symbol))
  return [...top10, ...uniqueUserItems]
}

export const useMarketStore = create<MarketState>((set, get) => ({
  top10: initialTop10,
  userWatchlist: [],
  watchlist: initialTop10,  // Start with just Top 10, user watchlist loads async

  selectedTicker: 'SPY',

  chartData: generateCandleData('SPY', '5min'),  // Match default timeframe

  cacheStatus: null,

  timeframe: '5min',  // Default to 5min for SPY

  selectedDate: new Date().toISOString().split('T')[0],  // Today's date

  isChartExpanded: false,

  isWatchlistLoaded: false,

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
    set(state => {
      const top10 = state.top10.map(item =>
        item.symbol === symbol ? { ...item, quote } : item
      )
      const userWatchlist = state.userWatchlist.map(item =>
        item.symbol === symbol ? { ...item, quote } : item
      )
      return {
        top10,
        userWatchlist,
        watchlist: combineWatchlists(top10, userWatchlist)
      }
    })
  },

  setQuotes: (quotes: Quote[]) => {
    set(state => {
      const top10 = state.top10.map(item => {
        const quote = quotes.find(q => q.symbol === item.symbol)
        return quote ? { ...item, quote } : item
      })
      const userWatchlist = state.userWatchlist.map(item => {
        const quote = quotes.find(q => q.symbol === item.symbol)
        return quote ? { ...item, quote } : item
      })
      return {
        top10,
        userWatchlist,
        watchlist: combineWatchlists(top10, userWatchlist)
      }
    })
  },

  setCacheStatus: (status: { age: number; isFresh: boolean }) => {
    set({ cacheStatus: status })
  },

  refreshAllQuotes: () => {
    set(state => {
      const top10 = state.top10.map(item => ({
        ...item,
        quote: generateQuote(item.symbol),
      }))
      const userWatchlist = state.userWatchlist.map(item => ({
        ...item,
        quote: generateQuote(item.symbol),
      }))
      return {
        top10,
        userWatchlist,
        watchlist: combineWatchlists(top10, userWatchlist)
      }
    })
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
      set({ chartData: generateCandleData(symbol || get().selectedTicker, get().timeframe) })
    }
  },

  /**
   * Load user's watchlist from IndexedDB on app startup
   */
  loadUserWatchlist: async () => {
    try {
      const entries = await getUserWatchlist()
      const userWatchlist: WatchlistItem[] = entries.map(entry => ({
        symbol: entry.symbol,
        name: entry.name || entry.symbol,
        sector: entry.sector || 'Custom',
        quote: generateQuote(entry.symbol)
      }))

      set(state => ({
        userWatchlist,
        watchlist: combineWatchlists(state.top10, userWatchlist),
        isWatchlistLoaded: true
      }))

      console.log(`[Market Store] Loaded ${userWatchlist.length} user watchlist items from DB`)
    } catch (error) {
      console.error('[Market Store] Failed to load user watchlist:', error)
      set({ isWatchlistLoaded: true })  // Mark as loaded even on error
    }
  },

  /**
   * Add symbol to watchlist (persisted to IndexedDB)
   * If symbol is already in Top 10, silently ignore
   */
  addToWatchlist: async (symbol: string, name?: string, sector?: string) => {
    const upperSymbol = symbol.toUpperCase()

    // Check if already in Top 10
    if (isTop10Symbol(upperSymbol)) {
      console.log(`[Market Store] ${upperSymbol} is already in Top 10`)
      return
    }

    // Check if already in user watchlist
    const { userWatchlist } = get()
    if (userWatchlist.some(item => item.symbol === upperSymbol)) {
      console.log(`[Market Store] ${upperSymbol} already in user watchlist`)
      return
    }

    // Persist to IndexedDB
    await addToUserWatchlist(upperSymbol, name, sector)

    // Update store
    const newItem: WatchlistItem = {
      symbol: upperSymbol,
      name: name || upperSymbol,
      sector: sector || 'Custom',
      quote: generateQuote(upperSymbol)
    }

    set(state => {
      const userWatchlist = [...state.userWatchlist, newItem]
      return {
        userWatchlist,
        watchlist: combineWatchlists(state.top10, userWatchlist)
      }
    })

    console.log(`[Market Store] Added ${upperSymbol} to user watchlist`)
  },

  /**
   * Remove symbol from watchlist
   * Cannot remove Top 10 symbols
   */
  removeFromWatchlist: async (symbol: string) => {
    // Cannot remove Top 10 symbols
    if (isTop10Symbol(symbol)) {
      console.log(`[Market Store] Cannot remove ${symbol} (Top 10)`)
      return
    }

    // Remove from IndexedDB
    await removeFromUserWatchlist(symbol)

    // Update store
    set(state => {
      const userWatchlist = state.userWatchlist.filter(item => item.symbol !== symbol)
      return {
        userWatchlist,
        watchlist: combineWatchlists(state.top10, userWatchlist)
      }
    })

    console.log(`[Market Store] Removed ${symbol} from user watchlist`)
  },

  toggleChartExpanded: () => {
    set(state => ({ isChartExpanded: !state.isChartExpanded }))
  },
}))
