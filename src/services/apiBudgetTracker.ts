/**
 * API Budget Tracker
 * Tracks API usage across market data providers with tier-aware limits
 *
 * Supported Providers:
 * - TwelveData: Free (8/min, 800/day) | Basic (30/min, 5K/day) | Pro (80/min, unlimited)
 * - Polygon: Free (5/min) | Starter (100/min) | Developer (1K/min) | Advanced (unlimited)
 * - Finnhub: Free (60/min) | Premium (300/min) - Used for Economic Calendar + News only
 *
 * Fallback Strategy:
 * When primary provider is exhausted, falls back to:
 * 1. Cached data (if < 24h old)
 * 2. Alternative provider (if configured)
 * 3. Empty state (no mock data)
 */

const STORAGE_KEY = 'richdad_api_budget'

export interface BudgetTracker {
  lastResetDate: string // ISO date (YYYY-MM-DD) for daily resets

  // Finnhub (minute-based) - for Economic Calendar + News
  finnhubCallsThisMinute: number
  finnhubMinuteWindow: number  // Unix timestamp in minutes

  // Polygon (minute-based)
  polygonCallsThisMinute: number
  polygonMinuteWindow: number

  // TwelveData (minute and daily)
  twelveDataCallsThisMinute: number
  twelveDataMinuteWindow: number
  twelveDataCallsToday: number
}

// Finnhub limits by tier
const FINNHUB_LIMITS = {
  free: { callsPerMinute: 60 },
  premium: { callsPerMinute: 300 }
} as const

// Polygon limits by tier
const POLYGON_LIMITS = {
  free: { callsPerMinute: 5 },
  starter: { callsPerMinute: 100 },
  developer: { callsPerMinute: 1000 },
  advanced: { callsPerMinute: Infinity }  // Unlimited
} as const

// TwelveData limits by tier
const TWELVEDATA_LIMITS = {
  free: { callsPerMinute: 8, callsPerDay: 800 },
  basic: { callsPerMinute: 30, callsPerDay: 5000 },
  pro: { callsPerMinute: 80, callsPerDay: Infinity }  // Unlimited daily
} as const

// Type for tier keys
export type PolygonTier = keyof typeof POLYGON_LIMITS
export type TwelveDataTier = keyof typeof TWELVEDATA_LIMITS
export type FinnhubTier = keyof typeof FINNHUB_LIMITS

// Current tier settings (loaded from user settings)
let currentPolygonTier: PolygonTier = 'free'
let currentTwelveDataTier: TwelveDataTier = 'free'
let currentFinnhubTier: FinnhubTier = 'free'

/**
 * Update tier settings from user preferences
 * Called when settings change
 */
export function updateTierSettings(tiers: {
  polygon?: PolygonTier
  twelveData?: TwelveDataTier
  finnhub?: FinnhubTier
}): void {
  if (tiers.polygon) currentPolygonTier = tiers.polygon
  if (tiers.twelveData) currentTwelveDataTier = tiers.twelveData
  if (tiers.finnhub) currentFinnhubTier = tiers.finnhub
  console.log('[API Budget] Tier settings updated:', {
    polygon: currentPolygonTier,
    twelveData: currentTwelveDataTier,
    finnhub: currentFinnhubTier
  })
}

/**
 * Get current Polygon tier (for rate limit calculations)
 */
export function getCurrentPolygonTier(): PolygonTier {
  return currentPolygonTier
}

/**
 * Get current minute window (Unix timestamp in minutes)
 */
function getCurrentMinuteWindow(): number {
  return Math.floor(Date.now() / 60000)
}

// ==========================================
// IN-MEMORY SINGLETON WITH ATOMIC OPERATIONS
// Fixes race condition where concurrent calls could lose updates
// ==========================================

let budgetSingleton: BudgetTracker | null = null
let persistTimeout: ReturnType<typeof setTimeout> | null = null
const PERSIST_DEBOUNCE_MS = 100 // Debounce localStorage writes

/**
 * Initialize the in-memory budget singleton from localStorage
 * Called once on first access
 */
function initializeBudget(): BudgetTracker {
  const today = new Date().toISOString().split('T')[0]
  const currentMinute = getCurrentMinuteWindow()

  try {
    const stored = localStorage.getItem(STORAGE_KEY)

    if (!stored) {
      // First time, create fresh budget
      return {
        lastResetDate: today,
        finnhubCallsThisMinute: 0,
        finnhubMinuteWindow: currentMinute,
        polygonCallsThisMinute: 0,
        polygonMinuteWindow: currentMinute,
        twelveDataCallsThisMinute: 0,
        twelveDataMinuteWindow: currentMinute,
        twelveDataCallsToday: 0
      }
    }

    const budget: BudgetTracker = JSON.parse(stored)

    // Ensure all fields exist (migration from old format)
    if (budget.polygonCallsThisMinute === undefined) {
      budget.polygonCallsThisMinute = 0
      budget.polygonMinuteWindow = currentMinute
    }
    if (budget.twelveDataCallsThisMinute === undefined) {
      budget.twelveDataCallsThisMinute = 0
      budget.twelveDataMinuteWindow = currentMinute
      budget.twelveDataCallsToday = 0
    }

    return budget
  } catch (error) {
    console.error('[API Budget] Failed to load from localStorage:', error)
    return {
      lastResetDate: today,
      finnhubCallsThisMinute: 0,
      finnhubMinuteWindow: currentMinute,
      polygonCallsThisMinute: 0,
      polygonMinuteWindow: currentMinute,
      twelveDataCallsThisMinute: 0,
      twelveDataMinuteWindow: currentMinute,
      twelveDataCallsToday: 0
    }
  }
}

/**
 * Get the budget singleton, applying time-based resets atomically
 * This is the ONLY way to access the budget - ensures consistency
 */
function getBudget(): BudgetTracker {
  // Initialize on first access
  if (!budgetSingleton) {
    budgetSingleton = initializeBudget()
    schedulePersist() // Persist initial state
  }

  const today = new Date().toISOString().split('T')[0]
  const currentMinute = getCurrentMinuteWindow()

  // Check for daily reset (midnight) - TwelveData has daily limits
  if (budgetSingleton.lastResetDate !== today) {
    console.log('[API Budget] New day detected, resetting daily counters')
    budgetSingleton.twelveDataCallsToday = 0
    budgetSingleton.lastResetDate = today
    schedulePersist()
  }

  // Check for minute window resets
  if (budgetSingleton.finnhubMinuteWindow !== currentMinute) {
    budgetSingleton.finnhubCallsThisMinute = 0
    budgetSingleton.finnhubMinuteWindow = currentMinute
  }

  if (budgetSingleton.polygonMinuteWindow !== currentMinute) {
    budgetSingleton.polygonCallsThisMinute = 0
    budgetSingleton.polygonMinuteWindow = currentMinute
  }

  if (budgetSingleton.twelveDataMinuteWindow !== currentMinute) {
    budgetSingleton.twelveDataCallsThisMinute = 0
    budgetSingleton.twelveDataMinuteWindow = currentMinute
  }

  return budgetSingleton
}

/**
 * Schedule a debounced persist to localStorage
 * Multiple rapid updates will only trigger one write
 */
function schedulePersist(): void {
  if (persistTimeout) {
    clearTimeout(persistTimeout)
  }
  persistTimeout = setTimeout(() => {
    if (budgetSingleton) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(budgetSingleton))
      } catch (error) {
        console.error('[API Budget] Failed to persist to localStorage:', error)
      }
    }
    persistTimeout = null
  }, PERSIST_DEBOUNCE_MS)
}

/**
 * Force immediate persist (used before page unload)
 */
function forcePersist(): void {
  if (persistTimeout) {
    clearTimeout(persistTimeout)
    persistTimeout = null
  }
  if (budgetSingleton) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(budgetSingleton))
    } catch (error) {
      console.error('[API Budget] Failed to persist to localStorage:', error)
    }
  }
}

// Persist on page unload to avoid losing recent updates
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', forcePersist)
}

// Legacy aliases for backward compatibility
function loadBudget(): BudgetTracker {
  return getBudget()
}

function saveBudget(_budget: BudgetTracker): void {
  // Now handled by schedulePersist() - this is a no-op for compatibility
  schedulePersist()
}

/**
 * Reset budget manually (for testing)
 * NOT exported by default - only used in tests
 */
export function __resetBudgetForTesting(): void {
  const today = new Date().toISOString().split('T')[0]
  const currentMinute = getCurrentMinuteWindow()

  // Reset the singleton directly
  budgetSingleton = {
    lastResetDate: today,
    finnhubCallsThisMinute: 0,
    finnhubMinuteWindow: currentMinute,
    polygonCallsThisMinute: 0,
    polygonMinuteWindow: currentMinute,
    twelveDataCallsThisMinute: 0,
    twelveDataMinuteWindow: currentMinute,
    twelveDataCallsToday: 0
  }

  // Force immediate persist
  forcePersist()
  console.log('[API Budget] Budget manually reset (testing mode)')
}

// Finnhub budget functions

/**
 * Check if we can make a Finnhub API call this minute
 */
export function canUseFinnhub(): boolean {
  const budget = loadBudget()
  const limit = FINNHUB_LIMITS[currentFinnhubTier].callsPerMinute
  const canUse = budget.finnhubCallsThisMinute < limit

  if (!canUse) {
    console.warn(`[API Budget] Finnhub minute budget exhausted (${budget.finnhubCallsThisMinute}/${limit} used this minute)`)
    emitLimitReached('finnhub', `Rate limit reached (${limit}/min on ${currentFinnhubTier} tier)`)
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

  const limit = FINNHUB_LIMITS[currentFinnhubTier].callsPerMinute
  console.log(`[API Budget] Finnhub call recorded: ${budget.finnhubCallsThisMinute}/${limit} this minute`)
}

/**
 * Get Finnhub budget status (for UI display)
 */
export function getFinnhubBudgetStatus(): {
  used: number
  limit: number
  remaining: number
  tier: FinnhubTier
} {
  const budget = loadBudget()
  const limit = FINNHUB_LIMITS[currentFinnhubTier].callsPerMinute
  return {
    used: budget.finnhubCallsThisMinute,
    limit,
    remaining: Math.max(0, limit - budget.finnhubCallsThisMinute),
    tier: currentFinnhubTier
  }
}

// ==========================================
// POLYGON BUDGET FUNCTIONS
// ==========================================

/**
 * Check if we can make a Polygon API call this minute
 */
export function canUsePolygon(): boolean {
  const budget = loadBudget()
  const limit = POLYGON_LIMITS[currentPolygonTier].callsPerMinute

  // Unlimited tier
  if (limit === Infinity) return true

  const canUse = budget.polygonCallsThisMinute < limit

  if (!canUse) {
    console.warn(`[API Budget] Polygon minute budget exhausted (${budget.polygonCallsThisMinute}/${limit} used this minute)`)
    emitLimitReached('polygon', `Rate limit reached (${limit}/min on ${currentPolygonTier} tier). Using cached data.`)
  }

  return canUse
}

/**
 * Record a Polygon API call
 */
export function recordPolygonCall(): void {
  const budget = loadBudget()
  budget.polygonCallsThisMinute++
  saveBudget(budget)

  const limit = POLYGON_LIMITS[currentPolygonTier].callsPerMinute
  const limitStr = limit === Infinity ? '∞' : String(limit)
  console.log(`[API Budget] Polygon call recorded: ${budget.polygonCallsThisMinute}/${limitStr} this minute`)
}

/**
 * Get Polygon budget status (for UI display)
 */
export function getPolygonBudgetStatus(): {
  used: number
  limit: number
  remaining: number
  tier: PolygonTier
  isUnlimited: boolean
} {
  const budget = loadBudget()
  const limit = POLYGON_LIMITS[currentPolygonTier].callsPerMinute
  const isUnlimited = limit === Infinity

  return {
    used: budget.polygonCallsThisMinute,
    limit: isUnlimited ? 999999 : limit,
    remaining: isUnlimited ? 999999 : Math.max(0, limit - budget.polygonCallsThisMinute),
    tier: currentPolygonTier,
    isUnlimited
  }
}

// ==========================================
// TWELVEDATA BUDGET FUNCTIONS
// ==========================================

/**
 * Check if we can make a TwelveData API call
 * Checks both minute and daily limits
 */
export function canUseTwelveData(): boolean {
  const budget = loadBudget()
  const tierLimits = TWELVEDATA_LIMITS[currentTwelveDataTier]

  // Check minute limit
  const minuteLimitOk = budget.twelveDataCallsThisMinute < tierLimits.callsPerMinute

  // Check daily limit (Infinity means unlimited)
  const dailyLimitOk = tierLimits.callsPerDay === Infinity ||
    budget.twelveDataCallsToday < tierLimits.callsPerDay

  if (!minuteLimitOk) {
    console.warn(`[API Budget] TwelveData minute limit reached (${budget.twelveDataCallsThisMinute}/${tierLimits.callsPerMinute})`)
    emitLimitReached('twelveData', `Minute limit reached (${tierLimits.callsPerMinute}/min). Wait 60 seconds.`)
    return false
  }

  if (!dailyLimitOk) {
    console.warn(`[API Budget] TwelveData daily limit reached (${budget.twelveDataCallsToday}/${tierLimits.callsPerDay})`)
    emitLimitReached('twelveData', `Daily limit reached (${tierLimits.callsPerDay}/day on ${currentTwelveDataTier} tier). Resets at midnight.`)
    return false
  }

  return true
}

/**
 * Record a TwelveData API call
 */
export function recordTwelveDataCall(): void {
  const budget = loadBudget()
  budget.twelveDataCallsThisMinute++
  budget.twelveDataCallsToday++
  saveBudget(budget)

  const tierLimits = TWELVEDATA_LIMITS[currentTwelveDataTier]
  const dailyStr = tierLimits.callsPerDay === Infinity ? '∞' : String(tierLimits.callsPerDay)
  console.log(`[API Budget] TwelveData call recorded: ${budget.twelveDataCallsThisMinute}/${tierLimits.callsPerMinute}/min, ${budget.twelveDataCallsToday}/${dailyStr}/day`)
}

/**
 * Get TwelveData budget status (for UI display)
 */
export function getTwelveDataBudgetStatus(): {
  minuteUsed: number
  minuteLimit: number
  minuteRemaining: number
  dailyUsed: number
  dailyLimit: number
  dailyRemaining: number
  tier: TwelveDataTier
  isDailyUnlimited: boolean
} {
  const budget = loadBudget()
  const tierLimits = TWELVEDATA_LIMITS[currentTwelveDataTier]
  const isDailyUnlimited = tierLimits.callsPerDay === Infinity

  return {
    minuteUsed: budget.twelveDataCallsThisMinute,
    minuteLimit: tierLimits.callsPerMinute,
    minuteRemaining: Math.max(0, tierLimits.callsPerMinute - budget.twelveDataCallsThisMinute),
    dailyUsed: budget.twelveDataCallsToday,
    dailyLimit: isDailyUnlimited ? 999999 : tierLimits.callsPerDay,
    dailyRemaining: isDailyUnlimited ? 999999 : Math.max(0, tierLimits.callsPerDay - budget.twelveDataCallsToday),
    tier: currentTwelveDataTier,
    isDailyUnlimited
  }
}

// ==========================================
// UNIFIED BUDGET STATUS (ALL PROVIDERS)
// ==========================================

export interface ProviderBudgetStatus {
  provider: string
  used: number
  limit: number
  remaining: number
  tier: string
  type: 'minute' | 'daily'
  isUnlimited: boolean
  percentUsed: number
}

/**
 * Get unified budget status for all providers (for UI display)
 */
export function getAllProvidersBudgetStatus(): ProviderBudgetStatus[] {
  const statuses: ProviderBudgetStatus[] = []

  // TwelveData (show daily limit as primary - recommended free tier)
  const tdStatus = getTwelveDataBudgetStatus()
  statuses.push({
    provider: 'TwelveData',
    used: tdStatus.dailyUsed,
    limit: tdStatus.dailyLimit,
    remaining: tdStatus.dailyRemaining,
    tier: tdStatus.tier,
    type: 'daily',
    isUnlimited: tdStatus.isDailyUnlimited,
    percentUsed: tdStatus.isDailyUnlimited ? 0 : Math.round((tdStatus.dailyUsed / tdStatus.dailyLimit) * 100)
  })

  // Polygon
  const polygonStatus = getPolygonBudgetStatus()
  statuses.push({
    provider: 'Polygon',
    used: polygonStatus.used,
    limit: polygonStatus.limit,
    remaining: polygonStatus.remaining,
    tier: polygonStatus.tier,
    type: 'minute',
    isUnlimited: polygonStatus.isUnlimited,
    percentUsed: polygonStatus.isUnlimited ? 0 : Math.round((polygonStatus.used / polygonStatus.limit) * 100)
  })

  // Finnhub (for Economic Calendar + News)
  const finnhubStatus = getFinnhubBudgetStatus()
  statuses.push({
    provider: 'Finnhub',
    used: finnhubStatus.used,
    limit: finnhubStatus.limit,
    remaining: finnhubStatus.remaining,
    tier: finnhubStatus.tier,
    type: 'minute',
    isUnlimited: false,
    percentUsed: Math.round((finnhubStatus.used / finnhubStatus.limit) * 100)
  })

  return statuses
}

// ==========================================
// EVENT EMISSION FOR UI NOTIFICATIONS
// ==========================================

/**
 * Emit event when API limit is reached (for toast notifications)
 */
function emitLimitReached(provider: string, message: string): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('api-limit-reached', {
      detail: { provider, message, timestamp: Date.now() }
    }))
  }
}

// ==========================================
// API USAGE SNAPSHOT (FOR DASHBOARD)
// ==========================================

export interface ApiUsageSnapshot {
  polygon: {
    used: number
    limit: number
    tier: PolygonTier
    resetInSeconds: number
    isUnlimited: boolean
  }
  twelveData: {
    minuteUsed: number
    minuteLimit: number
    dailyUsed: number
    dailyLimit: number
    tier: TwelveDataTier
    minuteResetInSeconds: number
    dailyResetInSeconds: number
    isDailyUnlimited: boolean
  }
  finnhub: {
    used: number
    limit: number
    tier: FinnhubTier
    resetInSeconds: number
  }
}

/**
 * Get a snapshot of current API usage for the dashboard
 * Includes reset time calculations
 */
export function getApiUsageSnapshot(): ApiUsageSnapshot {
  const budget = getBudget()

  // Calculate seconds until minute resets (60 - seconds into current minute)
  const secondsIntoMinute = Math.floor((Date.now() % 60000) / 1000)
  const minuteResetInSeconds = 60 - secondsIntoMinute

  // Calculate seconds until midnight for daily resets
  const now = new Date()
  const midnight = new Date(now)
  midnight.setDate(midnight.getDate() + 1)
  midnight.setHours(0, 0, 0, 0)
  const dailyResetInSeconds = Math.floor((midnight.getTime() - now.getTime()) / 1000)

  const polygonLimit = POLYGON_LIMITS[currentPolygonTier].callsPerMinute
  const finnhubLimit = FINNHUB_LIMITS[currentFinnhubTier].callsPerMinute
  const twelveDataLimits = TWELVEDATA_LIMITS[currentTwelveDataTier]

  return {
    polygon: {
      used: budget.polygonCallsThisMinute,
      limit: polygonLimit === Infinity ? 999999 : polygonLimit,
      tier: currentPolygonTier,
      resetInSeconds: minuteResetInSeconds,
      isUnlimited: polygonLimit === Infinity
    },
    twelveData: {
      minuteUsed: budget.twelveDataCallsThisMinute,
      minuteLimit: twelveDataLimits.callsPerMinute,
      dailyUsed: budget.twelveDataCallsToday,
      dailyLimit: twelveDataLimits.callsPerDay === Infinity ? 999999 : twelveDataLimits.callsPerDay,
      tier: currentTwelveDataTier,
      minuteResetInSeconds: minuteResetInSeconds,
      dailyResetInSeconds: dailyResetInSeconds,
      isDailyUnlimited: twelveDataLimits.callsPerDay === Infinity
    },
    finnhub: {
      used: budget.finnhubCallsThisMinute,
      limit: finnhubLimit,
      tier: currentFinnhubTier,
      resetInSeconds: minuteResetInSeconds
    }
  }
}
