/**
 * Memory Store
 * Stores trade outcomes and retrieves similar scenarios for AI context
 * Enables the AI to learn from past recommendations without local LLM
 */

import { db, type TradeMemory } from '../renderer/lib/db'

// Re-export TradeMemory for convenience
export type { TradeMemory }

// Scenario signature type (matches TradeMemory.signature)
export type ScenarioSignature = TradeMemory['signature']

/**
 * Get RSI bucket from raw RSI value
 */
export function getRSIBucket(rsi: number): 'oversold' | 'neutral' | 'overbought' {
  if (rsi <= 30) return 'oversold'
  if (rsi >= 70) return 'overbought'
  return 'neutral'
}

/**
 * Extract scenario signature from analysis context
 */
export function extractSignature(context: {
  rsi?: number
  macdHistogram?: number
  trend?: string
  patterns?: string[]
  regime?: string
}): ScenarioSignature {
  return {
    rsiBucket: getRSIBucket(context.rsi ?? 50),
    macdSignal: context.macdHistogram !== undefined
      ? (context.macdHistogram > 0 ? 'bullish' : context.macdHistogram < 0 ? 'bearish' : 'neutral')
      : 'neutral',
    trend: (context.trend?.toLowerCase().includes('up') ? 'up' :
            context.trend?.toLowerCase().includes('down') ? 'down' : 'sideways') as 'up' | 'down' | 'sideways',
    patterns: context.patterns || [],
    regime: context.regime || 'UNKNOWN'
  }
}

/**
 * Save a trade memory to IndexedDB
 */
export async function saveTradeMemory(memory: Omit<TradeMemory, 'id'>): Promise<number> {
  try {
    const id = await db.tradeMemories.add(memory as TradeMemory)
    console.log(`[Memory Store] Saved trade memory #${id} for ${memory.symbol}`)
    return id as number
  } catch (error) {
    console.error('[Memory Store] Failed to save trade memory:', error)
    throw error
  }
}

/**
 * Update outcome of an existing trade memory
 */
export async function updateTradeOutcome(
  id: number,
  outcome: TradeMemory['outcome']
): Promise<void> {
  try {
    await db.tradeMemories.update(id, { outcome })
    console.log(`[Memory Store] Updated outcome for memory #${id}: ${outcome.result}`)
  } catch (error) {
    console.error('[Memory Store] Failed to update trade outcome:', error)
    throw error
  }
}

/**
 * Find similar past scenarios based on signature
 */
export async function findSimilarScenarios(
  signature: ScenarioSignature,
  limit: number = 5
): Promise<TradeMemory[]> {
  try {
    // Get all completed memories (not pending)
    const allMemories = await db.tradeMemories
      .where('outcome.result')
      .notEqual('pending')
      .toArray()

    // Calculate similarity scores
    const scored = allMemories.map(memory => ({
      memory,
      score: calculateSimilarity(signature, memory.signature)
    }))

    // Sort by similarity (highest first) and return top N
    scored.sort((a, b) => b.score - a.score)

    return scored
      .slice(0, limit)
      .filter(s => s.score > 0.3) // Only return reasonably similar ones
      .map(s => s.memory)
  } catch (error) {
    console.error('[Memory Store] Failed to find similar scenarios:', error)
    return []
  }
}

/**
 * Calculate similarity score between two signatures (0-1)
 */
function calculateSimilarity(a: ScenarioSignature, b: ScenarioSignature): number {
  let score = 0

  // RSI bucket match (20%)
  if (a.rsiBucket === b.rsiBucket) score += 0.2

  // MACD signal match (20%)
  if (a.macdSignal === b.macdSignal) score += 0.2

  // Trend match (20%)
  if (a.trend === b.trend) score += 0.2

  // Pattern overlap - Jaccard similarity (20%)
  const aPatterns = new Set(a.patterns)
  const bPatterns = new Set(b.patterns)
  const intersection = [...aPatterns].filter(p => bPatterns.has(p))
  const union = new Set([...aPatterns, ...bPatterns])
  if (union.size > 0) {
    score += (intersection.length / union.size) * 0.2
  }

  // Regime match (20%)
  if (a.regime === b.regime) score += 0.2

  return score
}

/**
 * Get win rate statistics for a specific pattern
 */
export async function getPatternWinRate(pattern: string): Promise<{
  wins: number
  losses: number
  total: number
  winRate: number
}> {
  try {
    const memories = await db.tradeMemories
      .filter(m =>
        m.signature.patterns.includes(pattern) &&
        m.outcome.result !== 'pending'
      )
      .toArray()

    const wins = memories.filter(m => m.outcome.result === 'win').length
    const losses = memories.filter(m => m.outcome.result === 'loss').length
    const total = wins + losses

    return {
      wins,
      losses,
      total,
      winRate: total > 0 ? (wins / total) * 100 : 0
    }
  } catch (error) {
    console.error('[Memory Store] Failed to get pattern win rate:', error)
    return { wins: 0, losses: 0, total: 0, winRate: 0 }
  }
}

/**
 * Get overall memory statistics
 */
export async function getMemoryStats(): Promise<{
  totalMemories: number
  completedTrades: number
  pendingTrades: number
  overallWinRate: number
  avgProfitPercent: number
}> {
  try {
    const allMemories = await db.tradeMemories.toArray()
    const completed = allMemories.filter(m => m.outcome.result !== 'pending')
    const wins = completed.filter(m => m.outcome.result === 'win')

    const totalProfit = completed.reduce((sum, m) => sum + m.outcome.profitPercent, 0)

    return {
      totalMemories: allMemories.length,
      completedTrades: completed.length,
      pendingTrades: allMemories.length - completed.length,
      overallWinRate: completed.length > 0 ? (wins.length / completed.length) * 100 : 0,
      avgProfitPercent: completed.length > 0 ? totalProfit / completed.length : 0
    }
  } catch (error) {
    console.error('[Memory Store] Failed to get memory stats:', error)
    return {
      totalMemories: 0,
      completedTrades: 0,
      pendingTrades: 0,
      overallWinRate: 0,
      avgProfitPercent: 0
    }
  }
}

/**
 * Clear all trade memories
 */
export async function clearAllMemories(): Promise<void> {
  try {
    await db.tradeMemories.clear()
    console.log('[Memory Store] Cleared all trade memories')
  } catch (error) {
    console.error('[Memory Store] Failed to clear memories:', error)
    throw error
  }
}

/**
 * Build context string from similar scenarios for AI prompt
 */
export function buildMemoryContext(similarScenarios: TradeMemory[]): string {
  if (similarScenarios.length === 0) return ''

  const winCount = similarScenarios.filter(s => s.outcome.result === 'win').length
  const winRate = Math.round((winCount / similarScenarios.length) * 100)

  const scenarioDescriptions = similarScenarios.map((s, i) => {
    const date = new Date(s.timestamp).toLocaleDateString()
    const patterns = s.signature.patterns.join(', ') || 'none'
    const profitSign = s.outcome.profitPercent >= 0 ? '+' : ''

    return `${i + 1}. ${date} - ${s.symbol}
   Conditions: RSI ${s.signature.rsiBucket}, MACD ${s.signature.macdSignal}, trend ${s.signature.trend}
   Patterns: ${patterns}
   Recommended: ${s.recommendation.action} (${s.recommendation.confidence}% confidence)
   Outcome: ${s.outcome.result.toUpperCase()} (${profitSign}${s.outcome.profitPercent.toFixed(1)}% in ${s.outcome.daysHeld} days)`
  }).join('\n\n')

  return `
**HISTORICAL CONTEXT (from past recommendations):**
Found ${similarScenarios.length} similar past scenarios:

${scenarioDescriptions}

Overall win rate in similar conditions: ${winRate}%

Consider this historical performance when making your recommendation.
`
}
