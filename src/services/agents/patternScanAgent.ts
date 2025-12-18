/**
 * Pattern Scanner Agent
 * Scans watchlist symbols for actionable technical setups
 */

import { fetchHistoricalData, fetchLivePrices } from '../marketData'
import { detectPatterns, type DetectedPattern } from '../candlestickPatterns'
import { calculateMarketRegime, type MarketRegime } from '../marketRegime'
import type { PatternScanReport, PatternSetup } from './types'

// Minimum reliability score to include in report
const MIN_RELIABILITY_SCORE = 50

// Maximum age of pattern to consider "recent" (in candles)
const RECENT_PATTERN_LOOKBACK = 3

/**
 * Generate Pattern Scan Report for watchlist symbols
 */
export async function generatePatternScanReport(
  symbols: string[]
): Promise<PatternScanReport> {
  const now = Date.now()
  const setupsFound: PatternSetup[] = []
  const failedSymbols: string[] = []

  // Get current market regime for context
  let marketRegime: MarketRegime | null = null
  try {
    marketRegime = await calculateMarketRegime()
  } catch (err) {
    console.warn('[PatternScanner] Could not get market regime:', err)
  }

  // Get current prices for all symbols
  let priceMap: Map<string, number> = new Map()
  try {
    const quotes = await fetchLivePrices(symbols)
    quotes.forEach(q => priceMap.set(q.symbol, q.price))
  } catch (err) {
    console.warn('[PatternScanner] Could not fetch prices:', err)
  }

  // Scan each symbol
  for (const symbol of symbols) {
    try {
      // Fetch historical data (use daily for most symbols, 5min for SPY)
      const interval = symbol === 'SPY' ? '5min' : 'daily'
      const historyResult = await fetchHistoricalData(symbol, interval)
      const candles = historyResult.candles

      if (candles.length < 10) {
        console.warn(`[PatternScanner] Insufficient data for ${symbol}`)
        failedSymbols.push(symbol)
        continue
      }

      // Detect patterns
      const patterns = detectPatterns(candles)

      // Filter to recent patterns with good reliability
      const recentPatterns = patterns
        .slice(-RECENT_PATTERN_LOOKBACK * 5) // Last few candles worth of patterns
        .filter(p => p.reliabilityScore >= MIN_RELIABILITY_SCORE)

      // Convert to PatternSetup format
      for (const pattern of recentPatterns) {
        const setup = createPatternSetup(
          symbol,
          pattern,
          marketRegime,
          priceMap.get(symbol) || candles[candles.length - 1].close
        )
        setupsFound.push(setup)
      }

    } catch (err) {
      console.warn(`[PatternScanner] Failed to scan ${symbol}:`, err)
      failedSymbols.push(symbol)
    }
  }

  // Sort by reliability score
  setupsFound.sort((a, b) => b.reliabilityScore - a.reliabilityScore)

  // Get top setups by type
  const topBullishSetups = setupsFound
    .filter(s => s.type === 'bullish')
    .slice(0, 5)

  const topBearishSetups = setupsFound
    .filter(s => s.type === 'bearish')
    .slice(0, 5)

  // Calculate summary
  const summary = {
    bullishCount: setupsFound.filter(s => s.type === 'bullish').length,
    bearishCount: setupsFound.filter(s => s.type === 'bearish').length,
    neutralCount: setupsFound.filter(s => s.type === 'neutral').length,
    highReliabilityCount: setupsFound.filter(s => s.reliability === 'High').length
  }

  console.log(`[PatternScanner] Scanned ${symbols.length} symbols, found ${setupsFound.length} setups`)

  return {
    timestamp: now,
    scannedSymbols: symbols.length - failedSymbols.length,
    failedSymbols,
    setupsFound,
    topBullishSetups,
    topBearishSetups,
    summary
  }
}

/**
 * Create a PatternSetup from a DetectedPattern
 */
function createPatternSetup(
  symbol: string,
  pattern: DetectedPattern,
  regime: MarketRegime | null,
  currentPrice: number
): PatternSetup {
  // Determine if pattern aligns with market regime
  const regimeAligned = checkRegimeAlignment(pattern.type, regime)

  // Determine trend context
  const trendContext = getTrendContext(pattern.type, regime)

  // Check if volume confirmed (from pattern factors)
  const volumeConfirmed = (pattern.factors?.volumeBonus || 0) >= 15

  // Generate notes
  const notes = generatePatternNotes(pattern, regimeAligned, volumeConfirmed)

  return {
    symbol,
    pattern: pattern.pattern,
    type: pattern.type,
    reliability: pattern.reliability,
    reliabilityScore: pattern.reliabilityScore,
    volumeConfirmed,
    regimeAligned,
    trendContext,
    priceAtDetection: currentPrice,
    detectedAt: pattern.time,
    notes
  }
}

/**
 * Check if pattern aligns with current market regime
 */
function checkRegimeAlignment(
  patternType: 'bullish' | 'bearish' | 'neutral',
  regime: MarketRegime | null
): boolean {
  if (!regime) return false

  const regimeName = regime.regime

  // Bullish patterns align with bullish regimes
  if (patternType === 'bullish') {
    return regimeName.includes('BULLISH')
  }

  // Bearish patterns align with bearish regimes
  if (patternType === 'bearish') {
    return regimeName.includes('BEARISH')
  }

  // Neutral patterns don't have strong alignment
  return false
}

/**
 * Get trend context based on pattern and regime
 */
function getTrendContext(
  patternType: 'bullish' | 'bearish' | 'neutral',
  regime: MarketRegime | null
): 'with_trend' | 'against_trend' | 'neutral' {
  if (!regime || patternType === 'neutral') return 'neutral'

  const regimeName = regime.regime

  if (patternType === 'bullish') {
    if (regimeName.includes('BULLISH')) return 'with_trend'
    if (regimeName.includes('BEARISH')) return 'against_trend'
  }

  if (patternType === 'bearish') {
    if (regimeName.includes('BEARISH')) return 'with_trend'
    if (regimeName.includes('BULLISH')) return 'against_trend'
  }

  return 'neutral'
}

/**
 * Generate descriptive notes for the pattern
 */
function generatePatternNotes(
  pattern: DetectedPattern,
  regimeAligned: boolean,
  volumeConfirmed: boolean
): string {
  const parts: string[] = []

  // Pattern description
  parts.push(pattern.description)

  // Volume confirmation
  if (volumeConfirmed) {
    parts.push('Volume confirmed')
  }

  // Regime alignment
  if (regimeAligned) {
    parts.push('Aligns with market regime')
  } else if (pattern.type !== 'neutral') {
    parts.push('Counter-trend signal')
  }

  // Reliability context
  if (pattern.reliability === 'High') {
    parts.push('High reliability pattern')
  }

  return parts.join('. ')
}

/**
 * Get a summary string for the scan
 */
export function getPatternScanSummary(report: PatternScanReport): string {
  const { summary, topBullishSetups, topBearishSetups } = report

  if (summary.bullishCount === 0 && summary.bearishCount === 0) {
    return 'No significant patterns detected'
  }

  const parts: string[] = []

  if (topBullishSetups.length > 0) {
    const topBull = topBullishSetups[0]
    parts.push(`Top bullish: ${topBull.symbol} (${topBull.pattern})`)
  }

  if (topBearishSetups.length > 0) {
    const topBear = topBearishSetups[0]
    parts.push(`Top bearish: ${topBear.symbol} (${topBear.pattern})`)
  }

  return parts.join(' | ')
}

/**
 * Check if there are any high-priority setups
 */
export function hasHighPrioritySetups(report: PatternScanReport): boolean {
  return report.setupsFound.some(
    s => s.reliability === 'High' && s.regimeAligned
  )
}
