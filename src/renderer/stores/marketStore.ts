import { create } from 'zustand'
import type { Quote, CandleData, WatchlistItem } from '../types'
import { WATCHLIST_LIMITS } from '../lib/constants'
import { getUserWatchlist, addToUserWatchlist, removeFromUserWatchlist, getSettings } from '../lib/db'
import { fetchLivePrices } from '../../services/marketData'
import { dataHeartbeat } from '../../services/DataHeartbeatService'

// Track chart load requests to prevent stale data from race conditions
let chartLoadSequence = 0

// AbortController for cancelling in-flight chart data requests
let chartLoadController: AbortController | null = null

// Debounce timer for chart loads (prevents rapid-fire API calls)
let chartLoadDebounceTimer: ReturnType<typeof setTimeout> | null = null
const CHART_LOAD_DEBOUNCE_MS = 300 // 300ms debounce

// Store market-changed listener reference for proper cleanup
let marketChangedHandler: ((e: Event) => void) | null = null

// Extended timeframe options: 1M, 5M, 15M, 30M, 45M, 1H, 2H, 4H, 5H, 1D, 1W
type Timeframe = '1min' | '5min' | '15min' | '30min' | '45min' | '60min' | '120min' | '240min' | '300min' | 'daily' | 'weekly'

// Data source tracking for transparency
export type DataProvider = 'tiingo' | 'mock' | null

export interface DataSource {
  provider: DataProvider
  lastUpdated: number | null  // Unix timestamp (ms)
  isDelayed: boolean          // true for Polygon free tier (15-min delay)
  cacheAge: number            // ms since last fetch
}

interface MarketState {
  // User's custom watchlist (persisted to IndexedDB)
  watchlist: WatchlistItem[]
  watchlistLimit: number  // Current limit based on plan

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
  addToWatchlist: (symbol: string, name?: string, sector?: string) => Promise<{ success: boolean; error?: string }>
  removeFromWatchlist: (symbol: string) => Promise<void>
  toggleChartExpanded: () => void
  getWatchlistStatus: () => { current: number; limit: number; canAdd: boolean }
  setWatchlistLimit: (limit: number) => void
}

// Default watchlist - empty on fresh install (user adds their own symbols)
const defaultWatchlist: WatchlistItem[] = []

export const useMarketStore = create<MarketState>((set, get) => ({
  watchlist: defaultWatchlist,
  watchlistLimit: WATCHLIST_LIMITS.free,  // Default to free tier limit

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
    set(state => ({
      watchlist: state.watchlist.map(item =>
        item.symbol === symbol ? { ...item, quote } : item
      )
    }))
  },

  setQuotes: (quotes: Quote[]) => {
    set(state => ({
      watchlist: state.watchlist.map(item => {
        const quote = quotes.find(q => q.symbol === item.symbol)
        return quote ? { ...item, quote } : item
      })
    }))
  },

  setCacheStatus: (status: { age: number; isFresh: boolean }) => {
    set({ cacheStatus: status })
  },

  setDataSource: (source: DataSource) => {
    set({ dataSource: source })
  },

  /**
   * Trigger a manual refresh of all quotes for watchlist symbols.
   * This calls the DataHeartbeatService with actual symbols.
   */
  refreshAllQuotes: async () => {
    const { watchlist, selectedTicker } = get()
    // Collect unique symbols: selected ticker + watchlist symbols
    const symbols = [...new Set([
      selectedTicker,
      ...watchlist.map(w => w.symbol)
    ].filter(Boolean))]

    if (symbols.length === 0) {
      console.log('[Market Store] No symbols to refresh')
      return
    }

    try {
      const quotes = await dataHeartbeat.updateMarketData(symbols)
      // Update watchlist with new quotes
      if (quotes.length > 0) {
        set(state => ({
          watchlist: state.watchlist.map(item => {
            const quote = quotes.find(q => q.symbol === item.symbol)
            return quote ? { ...item, quote } : item
          })
        }))
      }
    } catch (error) {
      console.error('[Market Store] Failed to refresh quotes:', error)
    }
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
    // Clear any pending debounced load
    if (chartLoadDebounceTimer) {
      clearTimeout(chartLoadDebounceTimer)
      chartLoadDebounceTimer = null
    }

    // Cancel any previous in-flight request
    if (chartLoadController) {
      chartLoadController.abort()
    }

    // Debounce the actual API call to prevent rapid-fire requests
    // This saves API calls when users quickly click through tickers
    return new Promise<void>((resolve) => {
      chartLoadDebounceTimer = setTimeout(async () => {
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

          // Check if this request is still recent (allow 1 overlap for debounce timing)
          // Only discard if significantly stale (more than 1 behind current)
          if (currentSequence < chartLoadSequence - 1) {
            console.log('[Market Store] Discarding stale chart response', currentSequence, 'vs', chartLoadSequence)
            resolve()
            return
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
          resolve()
        } catch (error) {
          // Silently ignore abort errors - they're expected when user changes ticker rapidly
          if (error instanceof Error && error.name === 'AbortError') {
            resolve()
            return
          }

          // Only update state if this is still a recent request
          if (currentSequence < chartLoadSequence - 1) {
            resolve()
            return
          }

          console.error('[Market Store] Failed to load chart data:', error)

          // Show empty state - no mock data
          // Always set lastUpdated to avoid "Loading..." stuck forever
          set({
            chartData: [],
            dataSource: {
              provider: null,
              lastUpdated: Date.now(),
              isDelayed: false,
              cacheAge: 0
            }
          })
          resolve()
        }
      }, CHART_LOAD_DEBOUNCE_MS)
    })
  },

  /**
   * Load user's watchlist from IndexedDB on app startup
   */
  loadUserWatchlist: async () => {
    try {
      // Get settings to determine plan and watchlist limit
      const settings = await getSettings()
      const plan = settings.plan || 'free'
      const limit = WATCHLIST_LIMITS[plan]

      const entries = await getUserWatchlist()

      // If user has no saved watchlist, use default (SPY)
      if (entries.length === 0) {
        set({
          watchlist: defaultWatchlist,
          watchlistLimit: limit,
          isWatchlistLoaded: true
        })
        console.log('[Market Store] No saved watchlist, using default (SPY)')
        return
      }

      // Convert entries to watchlist items (respect limit)
      const watchlist: WatchlistItem[] = entries.slice(0, limit).map(entry => ({
        symbol: entry.symbol,
        name: entry.name || entry.symbol,
        sector: entry.sector || 'Custom',
        // quote is undefined until API data is fetched
      }))

      set({
        watchlist,
        watchlistLimit: limit,
        isWatchlistLoaded: true
      })

      console.log(`[Market Store] Loaded ${watchlist.length} watchlist items (limit: ${limit})`)
    } catch (error) {
      console.error('[Market Store] Failed to load user watchlist:', error)
      set({ isWatchlistLoaded: true })  // Mark as loaded even on error
    }
  },

  /**
   * Load selected market from settings on app startup
   * Sets up the selected ticker and loads initial chart
   */
  loadSelectedMarket: async () => {
    try {
      const settings = await getSettings()
      const etf = settings.selectedMarket?.etf || 'SPY'
      const plan = settings.plan || 'free'
      const limit = WATCHLIST_LIMITS[plan]

      console.log(`[Market Store] Loading selected market: ${etf}, plan: ${plan}`)

      // Update selected ticker and limit
      set({
        selectedTicker: etf,
        watchlistLimit: limit
      })

      // Load chart data for the selected market
      get().loadChartData(etf, '5min').catch(err => {
        console.error('[Market Store] Chart load error:', err)
      })

      // Fetch initial quotes for watchlist
      try {
        const { watchlist } = get()
        const symbols = [etf, ...watchlist.map(w => w.symbol)]
        const uniqueSymbols = [...new Set(symbols)]

        const quotes = await fetchLivePrices(uniqueSymbols)
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

      // Create new handler for market changes
      const handleMarketChange = (event: Event) => {
        const customEvent = event as CustomEvent<{ market: { etf: string } }>
        const { etf: newEtf } = customEvent.detail.market

        // Update selected ticker
        set({ selectedTicker: newEtf })

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
   * Returns success/error for UI feedback
   */
  addToWatchlist: async (symbol: string, name?: string, sector?: string) => {
    const upperSymbol = symbol.toUpperCase()
    const { watchlist, watchlistLimit } = get()

    // Check if already in watchlist
    if (watchlist.some(item => item.symbol === upperSymbol)) {
      console.log(`[Market Store] ${upperSymbol} already in watchlist`)
      return { success: false, error: 'Symbol already in watchlist' }
    }

    // Check limit
    if (watchlist.length >= watchlistLimit) {
      console.log(`[Market Store] Watchlist limit reached (${watchlistLimit})`)
      return {
        success: false,
        error: `Watchlist limit reached (${watchlistLimit}). Upgrade to Pro for more symbols.`
      }
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

    set(state => ({
      watchlist: [...state.watchlist, newItem]
    }))

    console.log(`[Market Store] Added ${upperSymbol} to watchlist (${watchlist.length + 1}/${watchlistLimit})`)
    return { success: true }
  },

  /**
   * Remove symbol from watchlist
   */
  removeFromWatchlist: async (symbol: string) => {
    // Remove from IndexedDB
    await removeFromUserWatchlist(symbol)

    // Update store
    set(state => ({
      watchlist: state.watchlist.filter(item => item.symbol !== symbol)
    }))

    console.log(`[Market Store] Removed ${symbol} from watchlist`)
  },

  toggleChartExpanded: () => {
    set(state => ({ isChartExpanded: !state.isChartExpanded }))
  },

  /**
   * Get current watchlist status for UI display
   */
  getWatchlistStatus: () => {
    const { watchlist, watchlistLimit } = get()
    return {
      current: watchlist.length,
      limit: watchlistLimit,
      canAdd: watchlist.length < watchlistLimit
    }
  },

  /**
   * Update watchlist limit (called when plan changes)
   */
  setWatchlistLimit: (limit: number) => {
    set({ watchlistLimit: limit })
    console.log(`[Market Store] Watchlist limit updated to: ${limit}`)
  }
}))

// Listen for plan changes and update watchlist limit
if (typeof window !== 'undefined') {
  window.addEventListener('plan-changed', (event) => {
    const { watchlistLimit } = (event as CustomEvent).detail
    useMarketStore.getState().setWatchlistLimit(watchlistLimit)
  })
}
