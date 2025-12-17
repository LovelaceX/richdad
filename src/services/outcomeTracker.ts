/**
 * Outcome Tracker Service
 * Background job that monitors pending trade decisions and updates their outcomes
 * Runs daily to check if price targets or stop losses have been hit
 */

import { db, updateTradeOutcome } from '../renderer/lib/db'
import { fetchLivePrices } from './marketData'

const MAX_DAYS_PENDING = 30  // Mark as neutral after 30 days

/**
 * Check all pending trade decisions and update their outcomes
 */
export async function checkTradeOutcomes(): Promise<{
  checked: number
  wins: number
  losses: number
  expired: number
}> {
  try {
    console.log('[OutcomeTracker] Checking pending trade outcomes...')

    // Get all pending decisions
    const pending = await db.tradeDecisions
      .where('outcome')
      .equals('pending')
      .and(d => d.decision === 'execute')
      .toArray()

    console.log(`[OutcomeTracker] Found ${pending.length} pending trades`)

    if (pending.length === 0) {
      return { checked: 0, wins: 0, losses: 0, expired: 0 }
    }

    // Get unique symbols to fetch prices
    const symbols = [...new Set(pending.map(d => d.symbol))]

    // Fetch current prices
    const quotes = await fetchLivePrices(symbols)
    const priceMap = new Map(quotes.map(q => [q.symbol, q.price]))

    let wins = 0
    let losses = 0
    let expired = 0

    // Check each pending trade
    for (const decision of pending) {
      if (!decision.id) continue

      const currentPrice = priceMap.get(decision.symbol)
      if (!currentPrice || !decision.priceAtDecision) {
        console.warn(`[OutcomeTracker] Missing price data for ${decision.symbol}`)
        continue
      }

      const daysSinceDecision = (Date.now() - decision.timestamp) / (1000 * 60 * 60 * 24)

      // Check if trade has expired (30 days with no target hit)
      if (daysSinceDecision > MAX_DAYS_PENDING) {
        console.log(`[OutcomeTracker] ${decision.symbol} expired after ${Math.round(daysSinceDecision)} days`)
        await updateTradeOutcome(decision.id, 'neutral', currentPrice)
        expired++
        continue
      }

      // Check BUY outcomes
      if (decision.action === 'BUY') {
        if (decision.priceTarget && currentPrice >= decision.priceTarget) {
          // Target hit - WIN!
          console.log(`[OutcomeTracker] ${decision.symbol} BUY target hit: $${currentPrice} >= $${decision.priceTarget}`)
          await updateTradeOutcome(decision.id, 'win', currentPrice)
          wins++
        } else if (decision.stopLoss && currentPrice <= decision.stopLoss) {
          // Stop loss hit - LOSS
          console.log(`[OutcomeTracker] ${decision.symbol} BUY stop loss hit: $${currentPrice} <= $${decision.stopLoss}`)
          await updateTradeOutcome(decision.id, 'loss', currentPrice)
          losses++
        }
      }

      // Check SELL outcomes (inverse logic)
      else if (decision.action === 'SELL') {
        if (decision.priceTarget && currentPrice <= decision.priceTarget) {
          // Target hit (price went down) - WIN!
          console.log(`[OutcomeTracker] ${decision.symbol} SELL target hit: $${currentPrice} <= $${decision.priceTarget}`)
          await updateTradeOutcome(decision.id, 'win', currentPrice)
          wins++
        } else if (decision.stopLoss && currentPrice >= decision.stopLoss) {
          // Stop loss hit (price went up) - LOSS
          console.log(`[OutcomeTracker] ${decision.symbol} SELL stop loss hit: $${currentPrice} >= $${decision.stopLoss}`)
          await updateTradeOutcome(decision.id, 'loss', currentPrice)
          losses++
        }
      }

      // HOLD recommendations - mark as neutral after checking
      else if (decision.action === 'HOLD') {
        console.log(`[OutcomeTracker] ${decision.symbol} HOLD marked as neutral`)
        await updateTradeOutcome(decision.id, 'neutral', currentPrice)
        expired++
      }
    }

    console.log(`[OutcomeTracker] Results: ${wins} wins, ${losses} losses, ${expired} expired/neutral`)

    return {
      checked: pending.length,
      wins,
      losses,
      expired
    }

  } catch (error) {
    console.error('[OutcomeTracker] Failed to check outcomes:', error)
    return { checked: 0, wins: 0, losses: 0, expired: 0 }
  }
}

/**
 * Outcome Tracker Service (Singleton)
 * Runs daily to check pending trades
 */
class OutcomeTrackerService {
  private interval: NodeJS.Timeout | null = null
  private isRunning = false

  // Check outcomes daily at market close (4 PM ET = ~9 PM UTC)
  private CHECK_INTERVAL = 86400000  // 24 hours

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[OutcomeTracker] Already running')
      return
    }

    console.log('[OutcomeTracker] Starting outcome tracker service...')
    this.isRunning = true

    // Initial check (wait 30 seconds for app to initialize)
    setTimeout(() => {
      this.runCheck()
    }, 30000)

    // Daily checks
    this.interval = setInterval(() => {
      this.runCheck()
    }, this.CHECK_INTERVAL)

    console.log('[OutcomeTracker] Service started (runs daily)')
  }

  stop(): void {
    if (!this.isRunning) return

    console.log('[OutcomeTracker] Stopping outcome tracker service...')
    this.isRunning = false

    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }

    console.log('[OutcomeTracker] Service stopped')
  }

  private async runCheck(): Promise<void> {
    const results = await checkTradeOutcomes()
    console.log(`[OutcomeTracker] Daily check complete: ${results.checked} trades checked`)
  }

  /**
   * Manually trigger outcome check
   */
  async checkNow(): Promise<void> {
    await this.runCheck()
  }
}

// Export singleton instance
export const outcomeTracker = new OutcomeTrackerService()
