/**
 * API Budget Tracker
 * Tracks API usage for Tiingo market data provider with tier-aware limits
 *
 * Tiingo Tiers:
 * - Starter (Free): 50 unique tickers/hour, 500 lookups/month
 * - Power ($10/mo): 5,000 unique tickers/hour
 *
 * Fallback Strategy:
 * When limit is reached, falls back to:
 * 1. Cached data (if < 24h old)
 * 2. Empty state (no mock data)
 */

const STORAGE_KEY = 'richdad_api_budget'

export interface BudgetTracker {
  lastResetDate: string // ISO date (YYYY-MM-DD) for daily tracking

  // Tiingo (hour-based)
  tiingoCallsThisHour: number
  tiingoHourWindow: number // Unix timestamp in hours
}

// Tiingo limits by tier
const TIINGO_LIMITS = {
  starter: { callsPerHour: 50 },    // Free tier: 50 unique tickers/hour
  power: { callsPerHour: 5000 }     // Power tier ($10/mo): 5000/hour
} as const

// Type for tier keys
export type TiingoTier = keyof typeof TIINGO_LIMITS

// Current tier setting (loaded from user settings)
let currentTiingoTier: TiingoTier = 'starter'

/**
 * Update tier settings from user preferences
 * Called when settings change
 */
export function updateTierSettings(tiers: {
  tiingo?: TiingoTier
}): void {
  if (tiers.tiingo) currentTiingoTier = tiers.tiingo
  console.log('[API Budget] Tier settings updated:', {
    tiingo: currentTiingoTier
  })
}

/**
 * Get current Tiingo tier (for rate limit calculations)
 */
export function getCurrentTiingoTier(): TiingoTier {
  return currentTiingoTier
}

/**
 * Get current hour window (Unix timestamp in hours)
 */
function getCurrentHourWindow(): number {
  return Math.floor(Date.now() / 3600000)
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
  const currentHour = getCurrentHourWindow()

  try {
    const stored = localStorage.getItem(STORAGE_KEY)

    if (!stored) {
      // First time, create fresh budget
      return {
        lastResetDate: today,
        tiingoCallsThisHour: 0,
        tiingoHourWindow: currentHour
      }
    }

    const budget: BudgetTracker = JSON.parse(stored)

    // Ensure all fields exist (migration from old format)
    if (budget.tiingoCallsThisHour === undefined) {
      budget.tiingoCallsThisHour = 0
      budget.tiingoHourWindow = currentHour
    }

    return budget
  } catch (error) {
    console.error('[API Budget] Failed to load from localStorage:', error)
    return {
      lastResetDate: today,
      tiingoCallsThisHour: 0,
      tiingoHourWindow: currentHour
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
  const currentHour = getCurrentHourWindow()

  // Check for daily reset (for tracking purposes)
  if (budgetSingleton.lastResetDate !== today) {
    console.log('[API Budget] New day detected')
    budgetSingleton.lastResetDate = today
    schedulePersist()
  }

  // Check for hour window reset
  if (budgetSingleton.tiingoHourWindow !== currentHour) {
    console.log('[API Budget] New hour detected, resetting Tiingo counter')
    budgetSingleton.tiingoCallsThisHour = 0
    budgetSingleton.tiingoHourWindow = currentHour
    schedulePersist()
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
  const currentHour = getCurrentHourWindow()

  // Reset the singleton directly
  budgetSingleton = {
    lastResetDate: today,
    tiingoCallsThisHour: 0,
    tiingoHourWindow: currentHour
  }

  // Force immediate persist
  forcePersist()
  console.log('[API Budget] Budget manually reset (testing mode)')
}

// ==========================================
// TIINGO BUDGET FUNCTIONS
// ==========================================

/**
 * Check if we can make a Tiingo API call this hour
 */
export function canUseTiingo(): boolean {
  const budget = loadBudget()
  const limit = TIINGO_LIMITS[currentTiingoTier].callsPerHour

  const canUse = budget.tiingoCallsThisHour < limit

  if (!canUse) {
    // Console warning is throttled inside emitLimitReached
    emitLimitReached('tiingo', `Rate limit reached (${limit}/hr on ${currentTiingoTier} tier). Using cached data.`)
  }

  return canUse
}

/**
 * Record a Tiingo API call
 */
export function recordTiingoCall(): void {
  const budget = loadBudget()
  budget.tiingoCallsThisHour++
  saveBudget(budget)

  const limit = TIINGO_LIMITS[currentTiingoTier].callsPerHour
  console.log(`[API Budget] Tiingo call recorded: ${budget.tiingoCallsThisHour}/${limit} this hour`)
}

/**
 * Get Tiingo budget status (for UI display)
 */
export function getTiingoBudgetStatus(): {
  used: number
  limit: number
  remaining: number
  tier: TiingoTier
  percentUsed: number
} {
  const budget = loadBudget()
  const limit = TIINGO_LIMITS[currentTiingoTier].callsPerHour

  return {
    used: budget.tiingoCallsThisHour,
    limit,
    remaining: Math.max(0, limit - budget.tiingoCallsThisHour),
    tier: currentTiingoTier,
    percentUsed: Math.round((budget.tiingoCallsThisHour / limit) * 100)
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
  type: 'hour' | 'minute' | 'daily'
  isUnlimited: boolean
  percentUsed: number
}

/**
 * Get unified budget status for all providers (for UI display)
 */
export function getAllProvidersBudgetStatus(): ProviderBudgetStatus[] {
  const statuses: ProviderBudgetStatus[] = []

  // Tiingo (hourly limit)
  const tiingoStatus = getTiingoBudgetStatus()
  statuses.push({
    provider: 'Tiingo',
    used: tiingoStatus.used,
    limit: tiingoStatus.limit,
    remaining: tiingoStatus.remaining,
    tier: tiingoStatus.tier,
    type: 'hour',
    isUnlimited: false,
    percentUsed: tiingoStatus.percentUsed
  })

  return statuses
}

// ==========================================
// EVENT EMISSION FOR UI NOTIFICATIONS
// ==========================================

// Throttle console warnings to prevent spam (30 second cooldown per provider)
const lastWarnTimestamps: Record<string, number> = {}
const WARN_COOLDOWN_MS = 30000 // 30 seconds

/**
 * Emit event when API limit is reached (for toast notifications)
 * Console warnings are throttled to prevent spam
 */
function emitLimitReached(provider: string, message: string): void {
  const now = Date.now()
  const lastWarn = lastWarnTimestamps[provider] || 0

  // Only log to console if enough time has passed (prevents spam)
  if (now - lastWarn > WARN_COOLDOWN_MS) {
    console.warn(`[API Budget] ${provider}: ${message}`)
    lastWarnTimestamps[provider] = now
  }

  // Always emit event for UI (UI handles its own display logic)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('api-limit-reached', {
      detail: { provider, message, timestamp: now }
    }))
  }
}

// ==========================================
// API USAGE SNAPSHOT (FOR DASHBOARD)
// ==========================================

export interface ApiUsageSnapshot {
  tiingo: {
    used: number
    limit: number
    tier: TiingoTier
    resetInSeconds: number
  }
}

/**
 * Get a snapshot of current API usage for the dashboard
 * Includes reset time calculations
 */
export function getApiUsageSnapshot(): ApiUsageSnapshot {
  const budget = getBudget()

  // Calculate seconds until hour resets (3600 - seconds into current hour)
  const secondsIntoHour = Math.floor((Date.now() % 3600000) / 1000)
  const hourResetInSeconds = 3600 - secondsIntoHour

  const tiingoLimit = TIINGO_LIMITS[currentTiingoTier].callsPerHour

  return {
    tiingo: {
      used: budget.tiingoCallsThisHour,
      limit: tiingoLimit,
      tier: currentTiingoTier,
      resetInSeconds: hourResetInSeconds
    }
  }
}

