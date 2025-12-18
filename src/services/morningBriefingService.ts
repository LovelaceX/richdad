/**
 * Morning Briefing Service
 * Generates batch AI analysis for all watchlist tickers
 */

import { generateRecommendation } from './aiRecommendationEngine'
import type { MorningBriefing, BriefingResult, AnalysisPhase } from '../renderer/types'

// Delay between each ticker analysis (ms) to respect API rate limits
const ANALYSIS_DELAY_MS = 2000

/**
 * Progress callback type for UI updates
 */
type BriefingProgressCallback = (
  current: number,
  total: number,
  ticker: string,
  phase?: { phaseId: string; status: AnalysisPhase['status']; result?: string }
) => void

/**
 * Generate morning briefing for a list of symbols
 * Analyzes each ticker sequentially with rate limiting
 *
 * @param symbols - Array of ticker symbols to analyze
 * @param onProgress - Optional callback for progress updates
 * @param confidenceThreshold - Minimum confidence to include recommendation (default 60 for briefing)
 */
export async function generateMorningBriefing(
  symbols: string[],
  onProgress?: BriefingProgressCallback,
  confidenceThreshold: number = 60 // Lower threshold for briefing (show more results)
): Promise<MorningBriefing> {
  console.log(`[MorningBriefing] Starting briefing for ${symbols.length} symbols`)
  const startTime = Date.now()
  const results: BriefingResult[] = []

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i]

    // Report progress
    if (onProgress) {
      onProgress(i + 1, symbols.length, symbol)
    }

    try {
      console.log(`[MorningBriefing] Analyzing ${symbol} (${i + 1}/${symbols.length})`)

      // Create phase callback if progress callback exists
      const onPhaseUpdate = onProgress
        ? (phaseId: string, status: AnalysisPhase['status'], result?: string) => {
            onProgress(i + 1, symbols.length, symbol, { phaseId, status, result })
          }
        : undefined

      const recommendation = await generateRecommendation(
        symbol,
        confidenceThreshold,
        onPhaseUpdate
      )

      results.push({
        ticker: symbol,
        recommendation,
        error: recommendation ? undefined : 'Low confidence or no data'
      })

      console.log(`[MorningBriefing] ${symbol}: ${recommendation?.action || 'NO SIGNAL'} (${recommendation?.confidence || 0}%)`)

    } catch (error) {
      console.error(`[MorningBriefing] Failed to analyze ${symbol}:`, error)
      results.push({
        ticker: symbol,
        recommendation: null,
        error: error instanceof Error ? error.message : String(error)
      })
    }

    // Rate limit delay between tickers (skip after last one)
    if (i < symbols.length - 1) {
      await new Promise(resolve => setTimeout(resolve, ANALYSIS_DELAY_MS))
    }
  }

  // Calculate summary
  const summary = {
    total: results.length,
    buy: results.filter(r => r.recommendation?.action === 'BUY').length,
    sell: results.filter(r => r.recommendation?.action === 'SELL').length,
    hold: results.filter(r => r.recommendation?.action === 'HOLD').length,
    failed: results.filter(r => r.recommendation === null).length
  }

  const duration = Math.round((Date.now() - startTime) / 1000)
  console.log(`[MorningBriefing] Complete in ${duration}s: ${summary.buy} BUY, ${summary.sell} SELL, ${summary.hold} HOLD, ${summary.failed} failed`)

  return {
    generatedAt: Date.now(),
    results,
    summary
  }
}

/**
 * Get estimated duration for briefing based on symbol count
 * @param symbolCount - Number of symbols to analyze
 * @returns Estimated duration in seconds
 */
export function estimateBriefingDuration(symbolCount: number): number {
  // ~5 seconds per symbol (analysis + delay + API calls)
  return symbolCount * 5
}
