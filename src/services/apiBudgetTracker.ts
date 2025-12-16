/**
 * API Budget Tracker
 * Tracks Alpha Vantage (daily) and Finnhub (minute-based) API usage
 *
 * Alpha Vantage Free Tier: 25 calls/day, 5 calls/minute
 * Finnhub Free Tier: 60 calls/minute
 *
 * Budget Split (Alpha Vantage):
 * - Market Data: 23 calls/day (BATCH_STOCK_QUOTES for SPY + top 9, hourly cache)
 * - Chart Data: 1 call/day (TIME_SERIES_INTRADAY for SPY 5-min, 24h cache)
 *               Other symbols use TIME_SERIES_DAILY (same budget)
 * - News: 1 call/day (hybrid RSS + Alpha Vantage fallback)
 * TOTAL: 25 calls/day
 *
 * Finnhub Budget:
 * - 60 calls/minute (no daily limit on free tier)
 * - Used as fallback when Alpha Vantage exhausted
 *
 * SPY-Focused Strategy:
 * - SPY chart: 5-minute intraday candles (TIME_SERIES_INTRADAY)
 * - Watchlist: SPY + top 9 S&P 500 holdings (AAPL, MSFT, NVDA, etc.)
 * - Other charts: Daily candles only (budget-efficient)
 */

const STORAGE_KEY = 'richdad_api_budget'

export interface BudgetTracker {
  // Alpha Vantage (daily)
  marketCallsToday: number
  chartCallsToday: number
  newsCallsToday: number
  lastResetDate: string // ISO date (YYYY-MM-DD)

  // Finnhub (minute-based)
  finnhubCallsThisMinute: number
  finnhubMinuteWindow: number  // Unix timestamp in minutes
}

// Alpha Vantage limits
const MAX_MARKET_CALLS_PER_DAY = 23  // Reduced from 24
const MAX_CHART_CALLS_PER_DAY = 1    // NEW - for historical data
const MAX_NEWS_CALLS_PER_DAY = 1

// Finnhub limits
const MAX_FINNHUB_CALLS_PER_MINUTE = 60

/**
 * Get current minute window (Unix timestamp in minutes)
 */
function getCurrentMinuteWindow(): number {
  return Math.floor(Date.now() / 60000)
}

/**
 * Load budget from localStorage, auto-reset if new day
 */
function loadBudget(): BudgetTracker {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const today = new Date().toISOString().split('T')[0]
    const currentMinute = getCurrentMinuteWindow()

    if (!stored) {
      // First time, create fresh budget
      const freshBudget: BudgetTracker = {
        marketCallsToday: 0,
        chartCallsToday: 0,
        newsCallsToday: 0,
        lastResetDate: today,
        finnhubCallsThisMinute: 0,
        finnhubMinuteWindow: currentMinute
      }
      saveBudget(freshBudget)
      return freshBudget
    }

    const budget: BudgetTracker = JSON.parse(stored)

    // Check if date has changed (midnight reset)
    if (budget.lastResetDate !== today) {
      console.log('[API Budget] New day detected, resetting Alpha Vantage counters')
      budget.marketCallsToday = 0
      budget.chartCallsToday = 0
      budget.newsCallsToday = 0
      budget.lastResetDate = today
      saveBudget(budget)
    }

    // Reset Finnhub minute window if we've moved to a new minute
    if (budget.finnhubMinuteWindow !== currentMinute) {
      budget.finnhubCallsThisMinute = 0
      budget.finnhubMinuteWindow = currentMinute
      saveBudget(budget)
    }

    return budget
  } catch (error) {
    console.error('[API Budget] Failed to load budget from localStorage:', error)
    // Return fresh budget on error
    const today = new Date().toISOString().split('T')[0]
    const currentMinute = getCurrentMinuteWindow()
    return {
      marketCallsToday: 0,
      chartCallsToday: 0,
      newsCallsToday: 0,
      lastResetDate: today,
      finnhubCallsThisMinute: 0,
      finnhubMinuteWindow: currentMinute
    }
  }
}

/**
 * Save budget to localStorage
 */
function saveBudget(budget: BudgetTracker): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(budget))
  } catch (error) {
    console.error('[API Budget] Failed to save budget to localStorage:', error)
  }
}

/**
 * Check if we can make an Alpha Vantage news call today
 */
export function canUseAlphaVantageForNews(): boolean {
  const budget = loadBudget()
  const canUse = budget.newsCallsToday < MAX_NEWS_CALLS_PER_DAY

  if (!canUse) {
    console.warn(`[API Budget] News budget exhausted (${budget.newsCallsToday}/${MAX_NEWS_CALLS_PER_DAY} used today)`)
  }

  return canUse
}

/**
 * Check if we can make an Alpha Vantage market data call today
 */
export function canUseAlphaVantageForMarket(): boolean {
  const budget = loadBudget()
  const canUse = budget.marketCallsToday < MAX_MARKET_CALLS_PER_DAY

  if (!canUse) {
    console.warn(`[API Budget] Market budget exhausted (${budget.marketCallsToday}/${MAX_MARKET_CALLS_PER_DAY} used today)`)
  }

  return canUse
}

/**
 * Check if we can make an Alpha Vantage chart data call today
 */
export function canUseAlphaVantageForCharts(): boolean {
  const budget = loadBudget()
  const canUse = budget.chartCallsToday < MAX_CHART_CALLS_PER_DAY

  if (!canUse) {
    console.warn(`[API Budget] Chart budget exhausted (${budget.chartCallsToday}/${MAX_CHART_CALLS_PER_DAY} used today)`)
  }

  return canUse
}

/**
 * Record a news API call
 */
export function recordNewsCall(): void {
  const budget = loadBudget()
  budget.newsCallsToday += 1
  saveBudget(budget)

  // Debug logging for testing
  console.log(`[API Budget] News call recorded: ${budget.newsCallsToday}/${MAX_NEWS_CALLS_PER_DAY} used today`)
}

/**
 * Record a market data API call
 */
export function recordMarketCall(): void {
  const budget = loadBudget()
  budget.marketCallsToday += 1
  saveBudget(budget)

  // Debug logging for testing
  console.log(`[API Budget] Market call recorded: ${budget.marketCallsToday}/${MAX_MARKET_CALLS_PER_DAY} used today`)
}

/**
 * Record a chart data API call
 */
export function recordChartCall(): void {
  const budget = loadBudget()
  budget.chartCallsToday += 1
  saveBudget(budget)

  // Debug logging for testing
  console.log(`[API Budget] Chart call recorded: ${budget.chartCallsToday}/${MAX_CHART_CALLS_PER_DAY} used today`)
}

/**
 * Get current budget status (for UI display)
 */
export function getBudgetStatus(): {
  marketCallsUsed: number
  marketCallsRemaining: number
  chartCallsUsed: number
  chartCallsRemaining: number
  newsCallsUsed: number
  newsCallsRemaining: number
  resetsAt: string
} {
  const budget = loadBudget()

  // Calculate reset time (midnight tonight)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)

  return {
    marketCallsUsed: budget.marketCallsToday,
    marketCallsRemaining: Math.max(0, MAX_MARKET_CALLS_PER_DAY - budget.marketCallsToday),
    chartCallsUsed: budget.chartCallsToday,
    chartCallsRemaining: Math.max(0, MAX_CHART_CALLS_PER_DAY - budget.chartCallsToday),
    newsCallsUsed: budget.newsCallsToday,
    newsCallsRemaining: Math.max(0, MAX_NEWS_CALLS_PER_DAY - budget.newsCallsToday),
    resetsAt: tomorrow.toISOString()
  }
}

/**
 * Reset budget manually (for testing)
 * NOT exported by default - only used in tests
 */
export function __resetBudgetForTesting(): void {
  const today = new Date().toISOString().split('T')[0]
  const currentMinute = getCurrentMinuteWindow()
  const freshBudget: BudgetTracker = {
    marketCallsToday: 0,
    chartCallsToday: 0,
    newsCallsToday: 0,
    lastResetDate: today,
    finnhubCallsThisMinute: 0,
    finnhubMinuteWindow: currentMinute
  }
  saveBudget(freshBudget)
  console.log('[API Budget] Budget manually reset (testing mode)')
}

// Finnhub budget functions

/**
 * Check if we can make a Finnhub API call this minute
 */
export function canUseFinnhub(): boolean {
  const budget = loadBudget()
  const canUse = budget.finnhubCallsThisMinute < MAX_FINNHUB_CALLS_PER_MINUTE

  if (!canUse) {
    console.warn(`[API Budget] Finnhub minute budget exhausted (${budget.finnhubCallsThisMinute}/${MAX_FINNHUB_CALLS_PER_MINUTE} used this minute)`)
  }

  return canUse
}

/**
 * Record a Finnhub API call
 */
export function recordFinnhubCall(): void {
  const budget = loadBudget()
  budget.finnhubCallsThisMinute++
  saveBudget(budget)

  console.log(`[API Budget] Finnhub call recorded: ${budget.finnhubCallsThisMinute}/${MAX_FINNHUB_CALLS_PER_MINUTE} this minute`)
}

/**
 * Get Finnhub budget status (for UI display)
 */
export function getFinnhubBudgetStatus(): {
  used: number
  limit: number
  remaining: number
} {
  const budget = loadBudget()
  return {
    used: budget.finnhubCallsThisMinute,
    limit: MAX_FINNHUB_CALLS_PER_MINUTE,
    remaining: MAX_FINNHUB_CALLS_PER_MINUTE - budget.finnhubCallsThisMinute
  }
}
