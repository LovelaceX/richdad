/**
 * AI Budget Tracker
 * Tracks AI API calls (Claude, OpenAI, Grok, Gemini, etc.)
 *
 * Default: Unlimited (AI providers handle their own rate limits)
 * User-configurable: 5-100 calls/day OR unlimited
 * Shows helpful message when AI provider returns rate limit error
 *
 * Uses debounced persistence (100ms) to batch rapid updates and
 * beforeunload hook to prevent data loss on browser close/crash.
 */

const STORAGE_KEY = 'richdad_ai_budget'
const DEFAULT_DAILY_LIMIT = -1  // Unlimited by default - AI providers handle their own rate limits
const UNLIMITED_VALUE = -1  // Special value for unlimited mode
const PERSIST_DEBOUNCE_MS = 100  // Batch writes within 100ms

export interface AIBudgetState {
  aiCallsToday: number
  lastResetDate: string  // ISO date (YYYY-MM-DD)
  dailyLimit: number     // User configurable, -1 = unlimited
}

// Singleton state - keeps budget in memory to avoid repeated localStorage reads
let budgetSingleton: AIBudgetState | null = null

// Debounce timer for batching writes
let persistTimeout: ReturnType<typeof setTimeout> | null = null

/**
 * Schedule a debounced write to localStorage
 * Multiple rapid updates will be batched into a single write
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
        console.error('[AI Budget] Failed to persist budget to localStorage:', error)
      }
    }
    persistTimeout = null
  }, PERSIST_DEBOUNCE_MS)
}

/**
 * Immediately flush any pending writes to localStorage
 * Called on page unload to prevent data loss
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
      console.error('[AI Budget] Failed to force persist budget:', error)
    }
  }
}

// Register beforeunload handler to flush pending writes before page close
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', forcePersist)
}

/**
 * Load AI budget from localStorage (or singleton), auto-reset if new day
 */
function loadBudget(): AIBudgetState {
  const today = new Date().toISOString().split('T')[0]

  // If singleton exists, check for day reset and return
  if (budgetSingleton) {
    if (budgetSingleton.lastResetDate !== today) {
      console.log('[AI Budget] New day detected, resetting AI call counter')
      budgetSingleton.aiCallsToday = 0
      budgetSingleton.lastResetDate = today
      schedulePersist()
    }
    return budgetSingleton
  }

  // First load - read from localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY)

    if (!stored) {
      // First time, create fresh budget
      budgetSingleton = {
        aiCallsToday: 0,
        lastResetDate: today,
        dailyLimit: DEFAULT_DAILY_LIMIT
      }
      schedulePersist()
      return budgetSingleton
    }

    const parsed: AIBudgetState = JSON.parse(stored)

    // Check if date has changed (midnight reset)
    if (parsed.lastResetDate !== today) {
      console.log('[AI Budget] New day detected, resetting AI call counter')
      parsed.aiCallsToday = 0
      parsed.lastResetDate = today
    }

    budgetSingleton = parsed
    schedulePersist()
    return budgetSingleton
  } catch (error) {
    console.error('[AI Budget] Failed to load budget from localStorage:', error)
    // Return fresh budget on error
    budgetSingleton = {
      aiCallsToday: 0,
      lastResetDate: today,
      dailyLimit: DEFAULT_DAILY_LIMIT
    }
    return budgetSingleton
  }
}

/**
 * Save AI budget - updates singleton and schedules debounced persist
 */
function saveBudget(budget: AIBudgetState): void {
  budgetSingleton = budget
  schedulePersist()
}

/**
 * Check if we can make an AI API call today
 */
export function canMakeAICall(): boolean {
  const budget = loadBudget()

  // Unlimited mode - always allow
  if (budget.dailyLimit === UNLIMITED_VALUE) {
    return true
  }

  const canUse = budget.aiCallsToday < budget.dailyLimit

  if (!canUse) {
    console.warn(`[AI Budget] AI budget exhausted (${budget.aiCallsToday}/${budget.dailyLimit} calls used today)`)
  }

  return canUse
}

/**
 * Check if unlimited mode is enabled
 */
export function isUnlimitedMode(): boolean {
  const budget = loadBudget()
  return budget.dailyLimit === UNLIMITED_VALUE
}

/**
 * Record an AI API call
 */
export function recordAICall(): void {
  const budget = loadBudget()
  budget.aiCallsToday += 1
  saveBudget(budget)

  // Logging differs for unlimited vs limited mode
  if (budget.dailyLimit === UNLIMITED_VALUE) {
    console.log(`[AI Budget] AI call recorded: ${budget.aiCallsToday} calls today (unlimited mode)`)
  } else {
    const percentUsed = Math.round((budget.aiCallsToday / budget.dailyLimit) * 100)
    console.log(`[AI Budget] AI call recorded: ${budget.aiCallsToday}/${budget.dailyLimit} used today (${percentUsed}%)`)

    // Warn when approaching limit
    if (percentUsed >= 80 && percentUsed < 100) {
      console.warn(`[AI Budget] Warning: ${percentUsed}% of daily AI budget used`)
    }
  }
}

/**
 * Get current AI budget status (for UI display)
 */
export function getAIBudgetStatus(): {
  used: number
  limit: number
  remaining: number
  percentUsed: number
  resetsAt: string
  isUnlimited: boolean
} {
  const budget = loadBudget()
  const isUnlimited = budget.dailyLimit === UNLIMITED_VALUE

  // Calculate reset time (midnight tonight)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)

  const percentUsed = isUnlimited ? 0 : Math.round((budget.aiCallsToday / budget.dailyLimit) * 100)

  return {
    used: budget.aiCallsToday,
    limit: budget.dailyLimit,
    remaining: isUnlimited ? Infinity : Math.max(0, budget.dailyLimit - budget.aiCallsToday),
    percentUsed,
    resetsAt: tomorrow.toISOString(),
    isUnlimited
  }
}

/**
 * Set the daily AI call limit (user configurable)
 * Pass -1 for unlimited mode
 */
export function setAIDailyLimit(limit: number): void {
  const budget = loadBudget()

  if (limit === UNLIMITED_VALUE) {
    budget.dailyLimit = UNLIMITED_VALUE
    console.log('[AI Budget] Daily limit set to UNLIMITED')
  } else {
    // Clamp to reasonable range (5-100)
    budget.dailyLimit = Math.max(5, Math.min(100, limit))
    console.log(`[AI Budget] Daily limit updated to ${budget.dailyLimit} calls`)
  }

  saveBudget(budget)
}

/**
 * Enable unlimited mode
 */
export function enableUnlimitedMode(): void {
  setAIDailyLimit(UNLIMITED_VALUE)
}

/**
 * Disable unlimited mode (revert to default)
 */
export function disableUnlimitedMode(): void {
  setAIDailyLimit(DEFAULT_DAILY_LIMIT)
}

/**
 * Get the current daily limit
 */
export function getAIDailyLimit(): number {
  const budget = loadBudget()
  return budget.dailyLimit
}

/**
 * Reset budget manually (for testing)
 */
export function __resetAIBudgetForTesting(): void {
  const today = new Date().toISOString().split('T')[0]
  const freshBudget: AIBudgetState = {
    aiCallsToday: 0,
    lastResetDate: today,
    dailyLimit: DEFAULT_DAILY_LIMIT
  }
  saveBudget(freshBudget)
  console.log('[AI Budget] AI budget manually reset (testing mode)')
}
