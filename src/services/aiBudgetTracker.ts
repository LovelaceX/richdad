/**
 * AI Budget Tracker
 * Tracks AI API calls (Claude, OpenAI, Grok, Gemini, etc.) to protect free tier users
 *
 * Default: 15 calls/day (conservative for free tiers)
 * User-configurable: 5-50 calls/day in Settings
 * Resets at midnight (local time)
 */

const STORAGE_KEY = 'richdad_ai_budget'
const DEFAULT_DAILY_LIMIT = 15

export interface AIBudgetState {
  aiCallsToday: number
  lastResetDate: string  // ISO date (YYYY-MM-DD)
  dailyLimit: number     // User configurable
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
  const canUse = budget.aiCallsToday < budget.dailyLimit

  if (!canUse) {
    console.warn(`[AI Budget] AI budget exhausted (${budget.aiCallsToday}/${budget.dailyLimit} calls used today)`)
  }

  return canUse
}

/**
 * Record an AI API call
 */
export function recordAICall(): void {
  const budget = loadBudget()
  budget.aiCallsToday += 1
  saveBudget(budget)

  const percentUsed = Math.round((budget.aiCallsToday / budget.dailyLimit) * 100)
  console.log(`[AI Budget] AI call recorded: ${budget.aiCallsToday}/${budget.dailyLimit} used today (${percentUsed}%)`)

  // Warn when approaching limit
  if (percentUsed >= 80 && percentUsed < 100) {
    console.warn(`[AI Budget] Warning: ${percentUsed}% of daily AI budget used`)
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
} {
  const budget = loadBudget()

  // Calculate reset time (midnight tonight)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)

  const percentUsed = Math.round((budget.aiCallsToday / budget.dailyLimit) * 100)

  return {
    used: budget.aiCallsToday,
    limit: budget.dailyLimit,
    remaining: Math.max(0, budget.dailyLimit - budget.aiCallsToday),
    percentUsed,
    resetsAt: tomorrow.toISOString()
  }
}

/**
 * Set the daily AI call limit (user configurable)
 */
export function setAIDailyLimit(limit: number): void {
  const budget = loadBudget()
  // Clamp to reasonable range (5-50)
  budget.dailyLimit = Math.max(5, Math.min(50, limit))
  saveBudget(budget)
  console.log(`[AI Budget] Daily limit updated to ${budget.dailyLimit} calls`)
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
