/**
 * Candlestick Pattern Detection Service
 *
 * Detects 18+ candlestick patterns for technical analysis.
 * Based on traditional Japanese candlestick charting techniques.
 */

export interface CandleData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface DetectedPattern {
  time: number
  pattern: string
  type: 'bullish' | 'bearish' | 'neutral'
  reliability: 'Low' | 'Medium' | 'High'
  reliabilityScore: number  // 0-100 numeric score
  description: string
  candleCount: number
  factors?: ReliabilityFactors  // Optional detailed breakdown
}

export interface ReliabilityFactors {
  baseScore: number        // Pattern's inherent reliability
  volumeBonus: number      // +10-25 if volume spike
  trendBonus: number       // +10-15 if with trend
  locationBonus: number    // +5-15 if near key level
  formationQuality: number // +5-10 for clean formation
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function isBullish(candle: CandleData): boolean {
  return candle.close > candle.open
}

function isBearish(candle: CandleData): boolean {
  return candle.close < candle.open
}

function getBody(candle: CandleData): number {
  return Math.abs(candle.close - candle.open)
}

function getBodyTop(candle: CandleData): number {
  return Math.max(candle.open, candle.close)
}

function getBodyBottom(candle: CandleData): number {
  return Math.min(candle.open, candle.close)
}

function getUpperWick(candle: CandleData): number {
  return candle.high - getBodyTop(candle)
}

function getLowerWick(candle: CandleData): number {
  return getBodyBottom(candle) - candle.low
}

function getRange(candle: CandleData): number {
  return candle.high - candle.low
}

/**
 * Determine trend from recent candles
 * @param candles - Array of candles (newest last)
 * @param lookback - Number of candles to analyze
 */
function getTrend(candles: CandleData[], lookback: number = 5): 'up' | 'down' | 'flat' {
  if (candles.length < lookback) return 'flat'

  const recentCandles = candles.slice(-lookback)
  const firstClose = recentCandles[0].close
  const lastClose = recentCandles[recentCandles.length - 1].close
  const change = (lastClose - firstClose) / firstClose

  if (change > 0.02) return 'up'
  if (change < -0.02) return 'down'
  return 'flat'
}

// ==========================================
// RELIABILITY SCORING
// ==========================================

/**
 * Base reliability scores for each pattern type
 */
const PATTERN_BASE_SCORES: Record<string, number> = {
  'Doji': 35,
  'Hammer': 55,
  'Hanging Man': 50,
  'Shooting Star': 55,
  'Inverted Hammer': 45,
  'Bullish Engulfing': 70,
  'Bearish Engulfing': 70,
  'Piercing Line': 60,
  'Dark Cloud Cover': 60,
  'Bullish Harami': 40,
  'Bearish Harami': 40,
  'Inside Bar': 35,
  'Outside Up': 55,
  'Outside Down': 55,
  'Morning Star': 75,
  'Evening Star': 75,
  'Breakaway Bullish': 80,
  'Breakaway Bearish': 80,
}

/**
 * Calculate average volume for recent candles
 */
function getAverageVolume(candles: CandleData[], lookback: number = 20): number {
  const volumeCandles = candles.slice(-lookback).filter(c => c.volume !== undefined)
  if (volumeCandles.length === 0) return 0
  return volumeCandles.reduce((sum, c) => sum + (c.volume || 0), 0) / volumeCandles.length
}

/**
 * Check if current volume is a spike (significantly above average)
 */
function isVolumeSpike(currentVolume: number | undefined, avgVolume: number): number {
  if (!currentVolume || avgVolume === 0) return 0

  const ratio = currentVolume / avgVolume

  if (ratio >= 2.5) return 25  // Extreme volume spike
  if (ratio >= 2.0) return 20  // Strong volume spike
  if (ratio >= 1.5) return 15  // Moderate volume spike
  if (ratio >= 1.2) return 10  // Slight volume increase
  return 0
}

/**
 * Calculate trend bonus based on pattern type and current trend
 */
function getTrendBonus(patternType: 'bullish' | 'bearish' | 'neutral', trend: 'up' | 'down' | 'flat'): number {
  // Reversal patterns are MORE reliable when they appear at the end of a trend
  if (patternType === 'bullish' && trend === 'down') return 15  // Bullish at bottom
  if (patternType === 'bearish' && trend === 'up') return 15    // Bearish at top
  if (patternType === 'bullish' && trend === 'up') return 10    // Continuation
  if (patternType === 'bearish' && trend === 'down') return 10  // Continuation
  if (patternType === 'neutral') return 5                        // Neutral always some value
  return 0  // Against trend for continuation patterns
}

/**
 * Calculate formation quality bonus based on candle proportions
 */
function getFormationQualityBonus(candle: CandleData, pattern: string): number {
  const body = getBody(candle)
  const range = getRange(candle)
  const upperWick = getUpperWick(candle)
  const lowerWick = getLowerWick(candle)

  if (range === 0) return 0

  let score = 0

  switch (pattern) {
    case 'Hammer':
    case 'Hanging Man':
      // Perfect hammer: lower wick 3x+ body, minimal upper wick
      if (lowerWick >= body * 3 && upperWick <= body * 0.1) score = 10
      else if (lowerWick >= body * 2.5) score = 7
      else score = 5
      break

    case 'Shooting Star':
    case 'Inverted Hammer':
      // Perfect shooting star: upper wick 3x+ body, minimal lower wick
      if (upperWick >= body * 3 && lowerWick <= body * 0.1) score = 10
      else if (upperWick >= body * 2.5) score = 7
      else score = 5
      break

    case 'Doji':
      // Perfect doji: body less than 5% of range
      const bodyRatio = body / range
      if (bodyRatio < 0.03) score = 10
      else if (bodyRatio < 0.05) score = 7
      else score = 5
      break

    case 'Bullish Engulfing':
    case 'Bearish Engulfing':
      // Large engulfing body relative to prior
      if (body / range > 0.7) score = 10
      else if (body / range > 0.5) score = 7
      else score = 5
      break

    default:
      score = 5  // Default formation quality
  }

  return score
}

/**
 * Calculate location bonus (near round numbers, key levels)
 */
function getLocationBonus(price: number): number {
  // Check if near round number (psychological level)
  const roundness = price % 10
  if (roundness < 0.5 || roundness > 9.5) return 15  // Near $X0.00
  if (price % 5 < 0.25 || price % 5 > 4.75) return 10  // Near $X5.00
  if (price % 1 < 0.1 || price % 1 > 0.9) return 5  // Near whole dollar

  return 0
}

/**
 * Calculate complete reliability score for a pattern
 */
function calculateReliabilityScore(
  pattern: string,
  patternType: 'bullish' | 'bearish' | 'neutral',
  candle: CandleData,
  candles: CandleData[],
  trend: 'up' | 'down' | 'flat'
): { score: number; factors: ReliabilityFactors } {
  const baseScore = PATTERN_BASE_SCORES[pattern] || 50
  const avgVolume = getAverageVolume(candles)
  const volumeBonus = isVolumeSpike(candle.volume, avgVolume)
  const trendBonus = getTrendBonus(patternType, trend)
  const formationQuality = getFormationQualityBonus(candle, pattern)
  const locationBonus = getLocationBonus(candle.close)

  const totalScore = Math.min(100, baseScore + volumeBonus + trendBonus + formationQuality + locationBonus)

  return {
    score: totalScore,
    factors: {
      baseScore,
      volumeBonus,
      trendBonus,
      locationBonus,
      formationQuality
    }
  }
}

/**
 * Convert numeric score to reliability tier
 */
function scoreToReliability(score: number): 'Low' | 'Medium' | 'High' {
  if (score >= 70) return 'High'
  if (score >= 50) return 'Medium'
  return 'Low'
}

// ==========================================
// SINGLE-CANDLE PATTERNS
// ==========================================

function isDoji(candle: CandleData): boolean {
  const body = getBody(candle)
  const range = getRange(candle)
  if (range === 0) return false
  return body / range < 0.1
}

function isHammer(candle: CandleData, trend: string): boolean {
  const body = getBody(candle)
  const lowerWick = getLowerWick(candle)
  const upperWick = getUpperWick(candle)
  const range = getRange(candle)

  if (range === 0 || body === 0) return false

  return (
    trend === 'down' &&
    lowerWick >= body * 2 &&
    upperWick <= body * 0.3 &&
    body / range >= 0.1
  )
}

function isHangingMan(candle: CandleData, trend: string): boolean {
  const body = getBody(candle)
  const lowerWick = getLowerWick(candle)
  const upperWick = getUpperWick(candle)
  const range = getRange(candle)

  if (range === 0 || body === 0) return false

  return (
    trend === 'up' &&
    lowerWick >= body * 2 &&
    upperWick <= body * 0.3 &&
    body / range >= 0.1
  )
}

function isShootingStar(candle: CandleData, trend: string): boolean {
  const body = getBody(candle)
  const upperWick = getUpperWick(candle)
  const lowerWick = getLowerWick(candle)
  const range = getRange(candle)

  if (range === 0 || body === 0) return false

  return (
    trend === 'up' &&
    upperWick >= body * 2 &&
    lowerWick <= body * 0.3 &&
    body / range >= 0.1
  )
}

function isInvertedHammer(candle: CandleData, trend: string): boolean {
  const body = getBody(candle)
  const upperWick = getUpperWick(candle)
  const lowerWick = getLowerWick(candle)
  const range = getRange(candle)

  if (range === 0 || body === 0) return false

  return (
    trend === 'down' &&
    upperWick >= body * 2 &&
    lowerWick <= body * 0.3 &&
    body / range >= 0.1
  )
}

// ==========================================
// TWO-CANDLE PATTERNS
// ==========================================

function isBullishEngulfing(prev: CandleData, curr: CandleData): boolean {
  const prevBearish = isBearish(prev)
  const currBullish = isBullish(curr)

  // Current body must engulf previous body
  const engulfs = curr.open <= prev.close && curr.close >= prev.open

  // Current candle should be significantly larger
  const currBody = getBody(curr)
  const prevBody = getBody(prev)

  return prevBearish && currBullish && engulfs && currBody > prevBody * 1.1
}

function isBearishEngulfing(prev: CandleData, curr: CandleData): boolean {
  const prevBullish = isBullish(prev)
  const currBearish = isBearish(curr)

  // Current body must engulf previous body
  const engulfs = curr.open >= prev.close && curr.close <= prev.open

  // Current candle should be significantly larger
  const currBody = getBody(curr)
  const prevBody = getBody(prev)

  return prevBullish && currBearish && engulfs && currBody > prevBody * 1.1
}

function isPiercingLine(prev: CandleData, curr: CandleData, trend: string): boolean {
  if (trend !== 'down') return false

  const prevBearish = isBearish(prev)
  const currBullish = isBullish(curr)

  // Current opens below previous close
  const gapDown = curr.open < prev.close

  // Current closes above midpoint of previous body
  const prevMidpoint = (prev.open + prev.close) / 2
  const closesAboveMid = curr.close > prevMidpoint && curr.close < prev.open

  return prevBearish && currBullish && gapDown && closesAboveMid
}

function isDarkCloudCover(prev: CandleData, curr: CandleData, trend: string): boolean {
  if (trend !== 'up') return false

  const prevBullish = isBullish(prev)
  const currBearish = isBearish(curr)

  // Current opens above previous close
  const gapUp = curr.open > prev.close

  // Current closes below midpoint of previous body
  const prevMidpoint = (prev.open + prev.close) / 2
  const closesBelowMid = curr.close < prevMidpoint && curr.close > prev.open

  return prevBullish && currBearish && gapUp && closesBelowMid
}

function isBullishHarami(prev: CandleData, curr: CandleData): boolean {
  const prevBearish = isBearish(prev)
  const currBullish = isBullish(curr)

  // Current body is contained within previous body
  const contained =
    curr.open > prev.close &&
    curr.close < prev.open &&
    curr.open < curr.close

  // Current body is smaller than previous
  const currBody = getBody(curr)
  const prevBody = getBody(prev)

  return prevBearish && currBullish && contained && currBody < prevBody * 0.6
}

function isBearishHarami(prev: CandleData, curr: CandleData): boolean {
  const prevBullish = isBullish(prev)
  const currBearish = isBearish(curr)

  // Current body is contained within previous body
  const contained =
    curr.open < prev.close &&
    curr.close > prev.open &&
    curr.open > curr.close

  // Current body is smaller than previous
  const currBody = getBody(curr)
  const prevBody = getBody(prev)

  return prevBullish && currBearish && contained && currBody < prevBody * 0.6
}

function isInsideBar(prev: CandleData, curr: CandleData): boolean {
  // Current candle's range is completely within previous candle's range
  return curr.high < prev.high && curr.low > prev.low
}

function isOutsideUp(prev: CandleData, curr: CandleData): boolean {
  // Current candle's range exceeds previous, closes higher
  return (
    curr.high > prev.high &&
    curr.low < prev.low &&
    curr.close > prev.close &&
    isBullish(curr)
  )
}

function isOutsideDown(prev: CandleData, curr: CandleData): boolean {
  // Current candle's range exceeds previous, closes lower
  return (
    curr.high > prev.high &&
    curr.low < prev.low &&
    curr.close < prev.close &&
    isBearish(curr)
  )
}

// ==========================================
// THREE-CANDLE PATTERNS
// ==========================================

function isMorningStar(c1: CandleData, c2: CandleData, c3: CandleData, trend: string): boolean {
  if (trend !== 'down') return false

  // First candle: long bearish
  const c1Bearish = isBearish(c1)
  const c1LongBody = getBody(c1) > getRange(c1) * 0.5

  // Second candle: small body (gap down preferred)
  const c2SmallBody = getBody(c2) < getBody(c1) * 0.3

  // Third candle: long bullish, closes above midpoint of first
  const c3Bullish = isBullish(c3)
  const c1Midpoint = (c1.open + c1.close) / 2
  const c3ClosesAboveMid = c3.close > c1Midpoint

  return c1Bearish && c1LongBody && c2SmallBody && c3Bullish && c3ClosesAboveMid
}

function isEveningStar(c1: CandleData, c2: CandleData, c3: CandleData, trend: string): boolean {
  if (trend !== 'up') return false

  // First candle: long bullish
  const c1Bullish = isBullish(c1)
  const c1LongBody = getBody(c1) > getRange(c1) * 0.5

  // Second candle: small body (gap up preferred)
  const c2SmallBody = getBody(c2) < getBody(c1) * 0.3

  // Third candle: long bearish, closes below midpoint of first
  const c3Bearish = isBearish(c3)
  const c1Midpoint = (c1.open + c1.close) / 2
  const c3ClosesBelowMid = c3.close < c1Midpoint

  return c1Bullish && c1LongBody && c2SmallBody && c3Bearish && c3ClosesBelowMid
}

// ==========================================
// MULTI-CANDLE PATTERNS (5-candle)
// ==========================================

function isBreakawayBullish(candles: CandleData[]): boolean {
  if (candles.length < 5) return false

  const [c1, c2, c3, c4, c5] = candles.slice(-5)

  // First candle: long bearish (establishes downtrend)
  const c1Bearish = isBearish(c1) && getBody(c1) > getRange(c1) * 0.5

  // Candles 2-4: small bodies, gradually moving against trend
  const middleSmall =
    getBody(c2) < getBody(c1) * 0.5 &&
    getBody(c3) < getBody(c1) * 0.5 &&
    getBody(c4) < getBody(c1) * 0.5

  // Fifth candle: strong bullish breakaway
  const c5Bullish = isBullish(c5) && getBody(c5) > getBody(c1) * 0.8
  const breaksAbove = c5.close > c2.high

  return c1Bearish && middleSmall && c5Bullish && breaksAbove
}

function isBreakawayBearish(candles: CandleData[]): boolean {
  if (candles.length < 5) return false

  const [c1, c2, c3, c4, c5] = candles.slice(-5)

  // First candle: long bullish (establishes uptrend)
  const c1Bullish = isBullish(c1) && getBody(c1) > getRange(c1) * 0.5

  // Candles 2-4: small bodies, gradually moving against trend
  const middleSmall =
    getBody(c2) < getBody(c1) * 0.5 &&
    getBody(c3) < getBody(c1) * 0.5 &&
    getBody(c4) < getBody(c1) * 0.5

  // Fifth candle: strong bearish breakaway
  const c5Bearish = isBearish(c5) && getBody(c5) > getBody(c1) * 0.8
  const breaksBelow = c5.close < c2.low

  return c1Bullish && middleSmall && c5Bearish && breaksBelow
}

// ==========================================
// PATTERN DESCRIPTIONS
// ==========================================

const PATTERN_DESCRIPTIONS: Record<string, string> = {
  'Doji': 'Indecision candle - open and close nearly equal',
  'Hammer': 'Bullish reversal after decline',
  'Hanging Man': 'Bearish reversal after rally',
  'Shooting Star': 'Bearish reversal at top of uptrend',
  'Inverted Hammer': 'Bullish reversal signal after decline',
  'Bullish Engulfing': 'Bullish reversal - green engulfs prior red',
  'Bearish Engulfing': 'Bearish reversal - red engulfs prior green',
  'Piercing Line': 'Bullish reversal - closes above midpoint',
  'Dark Cloud Cover': 'Bearish reversal - closes below midpoint',
  'Bullish Harami': 'Possible bullish reversal - small green in large red',
  'Bearish Harami': 'Possible bearish reversal - small red in large green',
  'Inside Bar': 'Consolidation - range within prior bar',
  'Outside Up': 'Bullish momentum - exceeds prior range',
  'Outside Down': 'Bearish momentum - exceeds prior range',
  'Morning Star': 'Bullish reversal - three candle pattern',
  'Evening Star': 'Bearish reversal - three candle pattern',
  'Breakaway Bullish': 'Strong bullish breakout from consolidation',
  'Breakaway Bearish': 'Strong bearish breakdown from consolidation',
}

// ==========================================
// MAIN DETECTION FUNCTION
// ==========================================

/**
 * Helper function to create a pattern with reliability scoring
 */
function createPattern(
  pattern: string,
  type: 'bullish' | 'bearish' | 'neutral',
  candle: CandleData,
  candles: CandleData[],
  trend: 'up' | 'down' | 'flat',
  candleCount: number
): DetectedPattern {
  const { score, factors } = calculateReliabilityScore(pattern, type, candle, candles, trend)

  return {
    time: candle.time,
    pattern,
    type,
    reliability: scoreToReliability(score),
    reliabilityScore: score,
    description: PATTERN_DESCRIPTIONS[pattern],
    candleCount,
    factors
  }
}

export function detectPatterns(candles: CandleData[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = []

  if (candles.length < 2) return patterns

  // Analyze each candle position
  for (let i = 1; i < candles.length; i++) {
    const curr = candles[i]
    const prev = candles[i - 1]

    // Get trend from previous candles
    const trendCandles = candles.slice(Math.max(0, i - 5), i)
    const trend = getTrend(trendCandles)

    // Single-candle patterns
    if (isDoji(curr)) {
      patterns.push(createPattern('Doji', 'neutral', curr, candles, trend, 1))
    }

    if (isHammer(curr, trend)) {
      patterns.push(createPattern('Hammer', 'bullish', curr, candles, trend, 1))
    }

    if (isHangingMan(curr, trend)) {
      patterns.push(createPattern('Hanging Man', 'bearish', curr, candles, trend, 1))
    }

    if (isShootingStar(curr, trend)) {
      patterns.push(createPattern('Shooting Star', 'bearish', curr, candles, trend, 1))
    }

    if (isInvertedHammer(curr, trend)) {
      patterns.push(createPattern('Inverted Hammer', 'bullish', curr, candles, trend, 1))
    }

    // Two-candle patterns
    if (isBullishEngulfing(prev, curr)) {
      patterns.push(createPattern('Bullish Engulfing', 'bullish', curr, candles, trend, 2))
    }

    if (isBearishEngulfing(prev, curr)) {
      patterns.push(createPattern('Bearish Engulfing', 'bearish', curr, candles, trend, 2))
    }

    if (isPiercingLine(prev, curr, trend)) {
      patterns.push(createPattern('Piercing Line', 'bullish', curr, candles, trend, 2))
    }

    if (isDarkCloudCover(prev, curr, trend)) {
      patterns.push(createPattern('Dark Cloud Cover', 'bearish', curr, candles, trend, 2))
    }

    if (isBullishHarami(prev, curr)) {
      patterns.push(createPattern('Bullish Harami', 'bullish', curr, candles, trend, 2))
    }

    if (isBearishHarami(prev, curr)) {
      patterns.push(createPattern('Bearish Harami', 'bearish', curr, candles, trend, 2))
    }

    if (isInsideBar(prev, curr)) {
      patterns.push(createPattern('Inside Bar', 'neutral', curr, candles, trend, 2))
    }

    if (isOutsideUp(prev, curr)) {
      patterns.push(createPattern('Outside Up', 'bullish', curr, candles, trend, 2))
    }

    if (isOutsideDown(prev, curr)) {
      patterns.push(createPattern('Outside Down', 'bearish', curr, candles, trend, 2))
    }

    // Three-candle patterns (need at least 3 candles)
    if (i >= 2) {
      const c1 = candles[i - 2]
      const c2 = candles[i - 1]
      const c3 = curr

      if (isMorningStar(c1, c2, c3, trend)) {
        patterns.push(createPattern('Morning Star', 'bullish', curr, candles, trend, 3))
      }

      if (isEveningStar(c1, c2, c3, trend)) {
        patterns.push(createPattern('Evening Star', 'bearish', curr, candles, trend, 3))
      }
    }

    // Five-candle patterns (need at least 5 candles)
    if (i >= 4) {
      const fiveCandles = candles.slice(i - 4, i + 1)

      if (isBreakawayBullish(fiveCandles)) {
        patterns.push(createPattern('Breakaway Bullish', 'bullish', curr, candles, trend, 5))
      }

      if (isBreakawayBearish(fiveCandles)) {
        patterns.push(createPattern('Breakaway Bearish', 'bearish', curr, candles, trend, 5))
      }
    }
  }

  return patterns
}

/**
 * Get pattern descriptions for tooltips
 */
export function getPatternDescription(patternName: string): string {
  return PATTERN_DESCRIPTIONS[patternName] || 'Unknown pattern'
}

/**
 * Filter patterns by type
 */
export function filterPatternsByType(
  patterns: DetectedPattern[],
  type: 'bullish' | 'bearish' | 'neutral'
): DetectedPattern[] {
  return patterns.filter(p => p.type === type)
}

/**
 * Filter patterns by reliability tier
 */
export function filterPatternsByReliability(
  patterns: DetectedPattern[],
  minReliability: 'Low' | 'Medium' | 'High'
): DetectedPattern[] {
  const reliabilityOrder = { Low: 1, Medium: 2, High: 3 }
  const minLevel = reliabilityOrder[minReliability]

  return patterns.filter(p => reliabilityOrder[p.reliability] >= minLevel)
}

/**
 * Filter patterns by minimum reliability score (0-100)
 */
export function filterPatternsByScore(
  patterns: DetectedPattern[],
  minScore: number
): DetectedPattern[] {
  return patterns.filter(p => p.reliabilityScore >= minScore)
}

/**
 * Get score breakdown description for UI display
 */
export function getScoreBreakdown(pattern: DetectedPattern): string {
  if (!pattern.factors) return `Score: ${pattern.reliabilityScore}`

  const { baseScore, volumeBonus, trendBonus, locationBonus, formationQuality } = pattern.factors
  const parts: string[] = [`Base: ${baseScore}`]

  if (volumeBonus > 0) parts.push(`Volume: +${volumeBonus}`)
  if (trendBonus > 0) parts.push(`Trend: +${trendBonus}`)
  if (locationBonus > 0) parts.push(`Location: +${locationBonus}`)
  if (formationQuality > 0) parts.push(`Formation: +${formationQuality}`)

  return parts.join(' | ')
}
