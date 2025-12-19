/**
 * Pattern Scanner Agent
 * Scans watchlist symbols for actionable technical setups
 *
 * Uses a Web Worker for off-main-thread pattern detection to prevent UI blocking.
 */

import { fetchHistoricalData, fetchLivePrices } from '../marketData'
import { type DetectedPattern } from '../candlestickPatterns'
import { calculateMarketRegime, type MarketRegime } from '../marketRegime'
import { getTradingThresholds, DEFAULT_TRADING_THRESHOLDS } from '../../renderer/lib/db'
import type { PatternScanReport, PatternSetup } from './types'

// Minimum reliability score to include in report
const MIN_RELIABILITY_SCORE = 50

// Maximum age of pattern to consider "recent" (in candles)
const RECENT_PATTERN_LOOKBACK = 3

// Rate limiting: Delay between historical data fetches (Polygon free tier: 5 calls/min = 12s between calls)
const RATE_LIMIT_DELAY_MS = 13000

// ==========================================
// WEB WORKER MANAGEMENT
// ==========================================

let patternWorker: Worker | null = null

/**
 * Get or create the pattern scanner worker
 */
function getPatternWorker(): Worker {
  if (!patternWorker) {
    patternWorker = new Worker(
      new URL('../patternScannerWorker.ts', import.meta.url),
      { type: 'module' }
    )
    console.log('[PatternScanner] Web Worker initialized')
  }
  return patternWorker
}

/**
 * Terminate the worker (call on app shutdown if needed)
 */
export function terminatePatternWorker(): void {
  if (patternWorker) {
    patternWorker.terminate()
    patternWorker = null
    console.log('[PatternScanner] Web Worker terminated')
  }
}

/**
 * Run pattern detection in Web Worker
 */
async function detectPatternsInWorker(
  candleData: Record<string, any[]>,
  thresholds: { patternHighScore: number; patternMediumScore: number }
): Promise<Record<string, DetectedPattern[]>> {
  return new Promise((resolve, reject) => {
    const worker = getPatternWorker()
    const timeout = setTimeout(() => {
      reject(new Error('Pattern scanner worker timeout'))
    }, 30000) // 30 second timeout

    worker.onmessage = (e) => {
      clearTimeout(timeout)
      if (e.data.type === 'result') {
        console.log(`[PatternScanner] Worker completed in ${e.data.duration.toFixed(0)}ms`)
        resolve(e.data.patterns)
      } else if (e.data.type === 'error') {
        reject(new Error(e.data.error))
      }
    }

    worker.onerror = (err) => {
      clearTimeout(timeout)
      reject(err)
    }

    worker.postMessage({
      type: 'scan',
      candleData,
      thresholds
    })
  })
}

/**
 * Fallback: detect patterns on main thread (if worker fails)
 */
async function detectPatternsOnMainThread(
  candleData: Record<string, any[]>
): Promise<Record<string, DetectedPattern[]>> {
  // Dynamic import to avoid loading unless needed
  const { detectPatterns, refreshPatternThresholds } = await import('../candlestickPatterns')
  await refreshPatternThresholds()

  const results: Record<string, DetectedPattern[]> = {}
  for (const [symbol, candles] of Object.entries(candleData)) {
    if (candles && candles.length >= 10) {
      results[symbol] = detectPatterns(candles)
    }
  }
  return results
}

// ==========================================
// MAIN REPORT GENERATION
// ==========================================

/**
 * Generate Pattern Scan Report for watchlist symbols
 */
export async function generatePatternScanReport(
  symbols: string[]
): Promise<PatternScanReport> {
  const now = Date.now()
  const setupsFound: PatternSetup[] = []
  const failedSymbols: string[] = []

  // Get trading thresholds from user settings
  let thresholds: { patternHighScore: number; patternMediumScore: number }
  try {
    const fullThresholds = await getTradingThresholds()
    thresholds = {
      patternHighScore: fullThresholds.patternHighScore,
      patternMediumScore: fullThresholds.patternMediumScore
    }
  } catch {
    thresholds = {
      patternHighScore: DEFAULT_TRADING_THRESHOLDS.patternHighScore,
      patternMediumScore: DEFAULT_TRADING_THRESHOLDS.patternMediumScore
    }
  }

  // Get current market regime for context
  let marketRegime: MarketRegime | null = null
  try {
    marketRegime = await calculateMarketRegime()
  } catch (err) {
    console.warn('[PatternScanner] Could not get market regime:', err)
  }

  // Get current prices for all symbols
  const priceMap: Map<string, number> = new Map()
  try {
    const quotes = await fetchLivePrices(symbols)
    quotes.forEach(q => priceMap.set(q.symbol, q.price))
  } catch (err) {
    console.warn('[PatternScanner] Could not fetch prices:', err)
  }

  // Fetch historical data for all symbols with rate limiting
  // Polygon free tier: 5 calls/min, so we add delay between fetches
  const candleData: Record<string, any[]> = {}
  let isFirstFetch = true
  for (const symbol of symbols) {
    try {
      // Add delay between API calls to respect rate limits (skip first)
      if (!isFirstFetch) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS))
      }
      isFirstFetch = false

      const interval = symbol === 'SPY' ? '5min' : 'daily'
      const historyResult = await fetchHistoricalData(symbol, interval)
      if (historyResult.candles.length >= 10) {
        candleData[symbol] = historyResult.candles
      } else {
        console.warn(`[PatternScanner] Insufficient data for ${symbol}`)
        failedSymbols.push(symbol)
      }
    } catch (err) {
      console.warn(`[PatternScanner] Failed to fetch ${symbol}:`, err)
      failedSymbols.push(symbol)
    }
  }

  // Detect patterns using Web Worker (or fallback to main thread)
  let allPatterns: Record<string, DetectedPattern[]>
  try {
    allPatterns = await detectPatternsInWorker(candleData, thresholds)
  } catch (err) {
    console.warn('[PatternScanner] Worker failed, falling back to main thread:', err)
    allPatterns = await detectPatternsOnMainThread(candleData)
  }

  // Process patterns into setups
  for (const [symbol, patterns] of Object.entries(allPatterns)) {
    const candles = candleData[symbol]
    if (!candles || !patterns) continue

    // Filter to recent patterns with good reliability
    const recentPatterns = patterns
      .slice(-RECENT_PATTERN_LOOKBACK * 5)
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

  const scannedCount = Object.keys(candleData).length
  console.log(`[PatternScanner] Scanned ${scannedCount} symbols, found ${setupsFound.length} setups`)

  return {
    timestamp: now,
    scannedSymbols: scannedCount,
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
