/**
 * AI Budget Tracker
 * Tracks AI API calls (Claude, OpenAI, Grok, Gemini, etc.) to protect free tier users
 *
 * Default: 15 calls/day (conservative for free tiers)
 * User-configurable: 5-100 calls/day OR unlimited
 * Resets at midnight (local time)
 */

const STORAGE_KEY = 'richdad_ai_budget'
const DEFAULT_DAILY_LIMIT = 15
const UNLIMITED_VALUE = -1  // Special value for unlimited mode

export interface AIBudgetState {
  aiCallsToday: number
  lastResetDate: string  // ISO date (YYYY-MM-DD)
  dailyLimit: number     // User configurable, -1 = unlimited
}

/**
 * Load AI budget from localStorage, auto-reset if new day
 */
function loadBudget(): AIBudgetState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const today = new Date().toISOString().split('T')[0]

    if (!stored) {
      // First time, create fresh budget
      const freshBudget: AIBudgetState = {
        aiCallsToday: 0,
        lastResetDate: today,
        dailyLimit: DEFAULT_DAILY_LIMIT
      }
      saveBudget(freshBudget)
      return freshBudget
    }

    const budget: AIBudgetState = JSON.parse(stored)

    // Check if date has changed (midnight reset)
    if (budget.lastResetDate !== today) {
      console.log('[AI Budget] New day detected, resetting AI call counter')
      budget.aiCallsToday = 0
      budget.lastResetDate = today
      saveBudget(budget)
    }

    return budget
  } catch (error) {
    console.error('[AI Budget] Failed to load budget from localStorage:', error)
    // Return fresh budget on error
    const today = new Date().toISOString().split('T')[0]
    return {
      aiCallsToday: 0,
      lastResetDate: today,
      dailyLimit: DEFAULT_DAILY_LIMIT
    }
  }
}

/**
 * Save AI budget to localStorage
 */
function saveBudget(budget: AIBudgetState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(budget))
  } catch (error) {
    console.error('[AI Budget] Failed to save budget to localStorage:', error)
  }
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
