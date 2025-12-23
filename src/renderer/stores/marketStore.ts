import { create } from 'zustand'
import type { Quote, CandleData, WatchlistItem } from '../types'
import { TOP_10_TICKERS, isTop10Symbol, getIndexConstituents } from '../lib/constants'
import { getUserWatchlist, addToUserWatchlist, removeFromUserWatchlist, getSettings } from '../lib/db'
import { fetchLivePrices } from '../../services/marketData'

// Track chart load requests to prevent stale data from race conditions
let chartLoadSequence = 0

// AbortController for cancelling in-flight chart data requests
let chartLoadController: AbortController | null = null

// Store market-changed listener reference for proper cleanup
let marketChangedHandler: ((e: Event) => void) | null = null

// Extended timeframe options: 1M, 5M, 15M, 30M, 45M, 1H, 2H, 4H, 5H, 1D, 1W
type Timeframe = '1min' | '5min' | '15min' | '30min' | '45min' | '60min' | '120min' | '240min' | '300min' | 'daily' | 'weekly'

// Data source tracking for transparency
export type DataProvider = 'polygon' | 'twelvedata' | 'alphavantage' | 'mock' | null

export interface DataSource {
  provider: DataProvider
  lastUpdated: number | null  // Unix timestamp (ms)
  isDelayed: boolean          // true for Polygon free tier (15-min delay)
  cacheAge: number            // ms since last fetch
}

interface MarketState {
  // Split watchlist into two parts
  top10: WatchlistItem[]         // Static Top 10 (cannot be removed)
  userWatchlist: WatchlistItem[] // User-added symbols (persisted)
  watchlist: WatchlistItem[]     // Combined for display (top10 + userWatchlist, deduplicated)

  selectedTicker: string
  chartData: CandleData[]
  cacheStatus: { age: number; isFresh: boolean } | null
  dataSource: DataSource | null  // Track where chart data comes from
  timeframe: Timeframe  // Chart timeframe
  selectedDate: string  // ISO date string (YYYY-MM-DD)
  isChartExpanded: boolean  // Full-screen chart mode
  isWatchlistLoaded: boolean  // Track if user watchlist has been loaded from DB

  // Actions
  setSelectedTicker: (symbol: string) => void
  updateQuote: (symbol: string, quote: Quote) => void
  setQuotes: (quotes: Quote[]) => void
  setCacheStatus: (status: { age: number; isFresh: boolean }) => void
  setDataSource: (source: DataSource) => void
  refreshAllQuotes: () => void
  setTimeframe: (timeframe: Timeframe) => void
  setSelectedDate: (date: string) => void
  loadChartData: (symbol?: string, interval?: Timeframe) => Promise<void>
  loadUserWatchlist: () => Promise<void>  // Load from IndexedDB
  loadSelectedMarket: () => Promise<void>  // Load selected market from settings
  addToWatchlist: (symbol: string, name?: string, sector?: string) => Promise<void>
  removeFromWatchlist: (symbol: string) => Promise<void>
  toggleChartExpanded: () => void
}

// Initialize Top 10 without quotes (quotes will be fetched from API)
const initialTop10: WatchlistItem[] = TOP_10_TICKERS.map(ticker => ({
  ...ticker,
  // quote is undefined until API data is fetched
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

  chartData: [],  // Empty until API data is fetched

  cacheStatus: null,

  dataSource: null,  // Will be set when chart data is fetched

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

  setDataSource: (source: DataSource) => {
    set({ dataSource: source })
  },

  /**
   * @deprecated This function is a no-op. Quote refresh is handled by DataHeartbeatService.
   * Will be removed in a future version.
   */
  refreshAllQuotes: () => {
    // No-op - quote refresh is handled by DataHeartbeatService fetching real API data
    // Kept for backward compatibility but should not be relied upon
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
    // Cancel any previous in-flight request
    if (chartLoadController) {
      chartLoadController.abort()
    }
    chartLoadController = new AbortController()
    const signal = chartLoadController.signal

    // Increment sequence to track this request
    const currentSequence = ++chartLoadSequence

    try {
      const state = get()
      const targetSymbol = symbol || state.selectedTicker
      const targetInterval = interval || state.timeframe

      // Import marketData service
      const { fetchHistoricalData } = await import('../../services/marketData')

      const result = await fetchHistoricalData(targetSymbol, targetInterval, { signal })

      // Check if this request is still the latest (prevent stale data from race conditions)
      if (currentSequence !== chartLoadSequence) {
        return // Discard stale response
      }

      // Update chart data and data source info
      set({
        chartData: result.candles,
        selectedTicker: targetSymbol,
        dataSource: result.source,
        cacheStatus: {
          age: result.source.cacheAge,
          isFresh: result.source.cacheAge < 300000 // Fresh if < 5 minutes
        }
      })
    } catch (error) {
      // Silently ignore abort errors - they're expected when user changes ticker rapidly
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }

      // Only update state if this is still the latest request
      if (currentSequence !== chartLoadSequence) return

      console.error('[Market Store] Failed to load chart data:', error)

      // Show empty state - no mock data
      set({
        chartData: [],
        dataSource: {
          provider: null,
          lastUpdated: null,
          isDelayed: false,
          cacheAge: 0
        }
      })
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
        // quote is undefined until API data is fetched
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
   * Load selected market from settings on app startup
   * Also sets up listener for market-changed events
   */
  loadSelectedMarket: async () => {
    try {
      const settings = await getSettings()
      const etf = settings.selectedMarket?.etf || 'SPY'
      console.log(`[Market Store] Loading selected market: ${etf}`)

      // Get Top 10 constituents for the selected index
      const constituents = getIndexConstituents(etf)
      const newTop10: WatchlistItem[] = constituents.map(ticker => ({ ...ticker }))

      // Update selected ticker and Top 10
      set(state => ({
        selectedTicker: etf,
        top10: newTop10,
        watchlist: combineWatchlists(newTop10, state.userWatchlist)
      }))

      // Load chart data for the selected market
      get().loadChartData(etf, '5min').catch(err => {
        console.error('[Market Store] Chart load error:', err)
      })

      // Fetch initial quotes for watchlist (so Market Watch shows data on startup)
      // This is a one-time fetch that doesn't require Live Data toggle
      try {
        const symbols = [etf, ...constituents.map(c => c.symbol)]
        const quotes = await fetchLivePrices(symbols)
        if (quotes.length > 0) {
          console.log(`[Market Store] Initial quotes fetched: ${quotes.length} symbols`)
          set(state => ({
            watchlist: state.watchlist.map(item => {
              const quote = quotes.find(q => q.symbol === item.symbol)
              return quote ? { ...item, quote } : item
            })
          }))
        }
      } catch (err) {
        console.warn('[Market Store] Initial quote fetch failed (non-critical):', err)
      }

      // Remove old listener if exists (prevents accumulation during HMR or re-init)
      if (marketChangedHandler) {
        window.removeEventListener('market-changed', marketChangedHandler)
      }

      // Create new handler
      const handleMarketChange = (event: Event) => {
        const customEvent = event as CustomEvent<{ market: { etf: string } }>
        const { etf: newEtf } = customEvent.detail.market

        // Get Top 10 constituents for the new index
        const newConstituents = getIndexConstituents(newEtf)
        const updatedTop10: WatchlistItem[] = newConstituents.map(ticker => ({ ...ticker }))

        // Update selected ticker and Top 10
        set(state => ({
          selectedTicker: newEtf,
          top10: updatedTop10,
          watchlist: combineWatchlists(updatedTop10, state.userWatchlist)
        }))

        // Load chart data for the new market
        get().loadChartData(newEtf, '5min').catch(err => {
          console.error('[Market Store] Chart load error:', err)
        })
      }

      // Store reference and register listener
      marketChangedHandler = handleMarketChange
      window.addEventListener('market-changed', handleMarketChange)
    } catch (error) {
      console.error('[Market Store] Failed to load selected market:', error)
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

    // Update store - quote will be fetched by DataHeartbeatService
    const newItem: WatchlistItem = {
      symbol: upperSymbol,
      name: name || upperSymbol,
      sector: sector || 'Custom',
      // quote is undefined until API data is fetched
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
