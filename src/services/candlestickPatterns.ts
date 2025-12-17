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
  description: string
  candleCount: number
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
      patterns.push({
        time: curr.time,
        pattern: 'Doji',
        type: 'neutral',
        reliability: 'Medium',
        description: PATTERN_DESCRIPTIONS['Doji'],
        candleCount: 1,
      })
    }

    if (isHammer(curr, trend)) {
      patterns.push({
        time: curr.time,
        pattern: 'Hammer',
        type: 'bullish',
        reliability: 'Medium',
        description: PATTERN_DESCRIPTIONS['Hammer'],
        candleCount: 1,
      })
    }

    if (isHangingMan(curr, trend)) {
      patterns.push({
        time: curr.time,
        pattern: 'Hanging Man',
        type: 'bearish',
        reliability: 'Medium',
        description: PATTERN_DESCRIPTIONS['Hanging Man'],
        candleCount: 1,
      })
    }

    if (isShootingStar(curr, trend)) {
      patterns.push({
        time: curr.time,
        pattern: 'Shooting Star',
        type: 'bearish',
        reliability: 'Medium',
        description: PATTERN_DESCRIPTIONS['Shooting Star'],
        candleCount: 1,
      })
    }

    if (isInvertedHammer(curr, trend)) {
      patterns.push({
        time: curr.time,
        pattern: 'Inverted Hammer',
        type: 'bullish',
        reliability: 'Medium',
        description: PATTERN_DESCRIPTIONS['Inverted Hammer'],
        candleCount: 1,
      })
    }

    // Two-candle patterns
    if (isBullishEngulfing(prev, curr)) {
      patterns.push({
        time: curr.time,
        pattern: 'Bullish Engulfing',
        type: 'bullish',
        reliability: 'High',
        description: PATTERN_DESCRIPTIONS['Bullish Engulfing'],
        candleCount: 2,
      })
    }

    if (isBearishEngulfing(prev, curr)) {
      patterns.push({
        time: curr.time,
        pattern: 'Bearish Engulfing',
        type: 'bearish',
        reliability: 'High',
        description: PATTERN_DESCRIPTIONS['Bearish Engulfing'],
        candleCount: 2,
      })
    }

    if (isPiercingLine(prev, curr, trend)) {
      patterns.push({
        time: curr.time,
        pattern: 'Piercing Line',
        type: 'bullish',
        reliability: 'Medium',
        description: PATTERN_DESCRIPTIONS['Piercing Line'],
        candleCount: 2,
      })
    }

    if (isDarkCloudCover(prev, curr, trend)) {
      patterns.push({
        time: curr.time,
        pattern: 'Dark Cloud Cover',
        type: 'bearish',
        reliability: 'Medium',
        description: PATTERN_DESCRIPTIONS['Dark Cloud Cover'],
        candleCount: 2,
      })
    }

    if (isBullishHarami(prev, curr)) {
      patterns.push({
        time: curr.time,
        pattern: 'Bullish Harami',
        type: 'bullish',
        reliability: 'Low',
        description: PATTERN_DESCRIPTIONS['Bullish Harami'],
        candleCount: 2,
      })
    }

    if (isBearishHarami(prev, curr)) {
      patterns.push({
        time: curr.time,
        pattern: 'Bearish Harami',
        type: 'bearish',
        reliability: 'Low',
        description: PATTERN_DESCRIPTIONS['Bearish Harami'],
        candleCount: 2,
      })
    }

    if (isInsideBar(prev, curr)) {
      patterns.push({
        time: curr.time,
        pattern: 'Inside Bar',
        type: 'neutral',
        reliability: 'Low',
        description: PATTERN_DESCRIPTIONS['Inside Bar'],
        candleCount: 2,
      })
    }

    if (isOutsideUp(prev, curr)) {
      patterns.push({
        time: curr.time,
        pattern: 'Outside Up',
        type: 'bullish',
        reliability: 'Medium',
        description: PATTERN_DESCRIPTIONS['Outside Up'],
        candleCount: 2,
      })
    }

    if (isOutsideDown(prev, curr)) {
      patterns.push({
        time: curr.time,
        pattern: 'Outside Down',
        type: 'bearish',
        reliability: 'Medium',
        description: PATTERN_DESCRIPTIONS['Outside Down'],
        candleCount: 2,
      })
    }

    // Three-candle patterns (need at least 3 candles)
    if (i >= 2) {
      const c1 = candles[i - 2]
      const c2 = candles[i - 1]
      const c3 = curr

      if (isMorningStar(c1, c2, c3, trend)) {
        patterns.push({
          time: curr.time,
          pattern: 'Morning Star',
          type: 'bullish',
          reliability: 'High',
          description: PATTERN_DESCRIPTIONS['Morning Star'],
          candleCount: 3,
        })
      }

      if (isEveningStar(c1, c2, c3, trend)) {
        patterns.push({
          time: curr.time,
          pattern: 'Evening Star',
          type: 'bearish',
          reliability: 'High',
          description: PATTERN_DESCRIPTIONS['Evening Star'],
          candleCount: 3,
        })
      }
    }

    // Five-candle patterns (need at least 5 candles)
    if (i >= 4) {
      const fiveCandles = candles.slice(i - 4, i + 1)

      if (isBreakawayBullish(fiveCandles)) {
        patterns.push({
          time: curr.time,
          pattern: 'Breakaway Bullish',
          type: 'bullish',
          reliability: 'High',
          description: PATTERN_DESCRIPTIONS['Breakaway Bullish'],
          candleCount: 5,
        })
      }

      if (isBreakawayBearish(fiveCandles)) {
        patterns.push({
          time: curr.time,
          pattern: 'Breakaway Bearish',
          type: 'bearish',
          reliability: 'High',
          description: PATTERN_DESCRIPTIONS['Breakaway Bearish'],
          candleCount: 5,
        })
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
 * Filter patterns by reliability
 */
export function filterPatternsByReliability(
  patterns: DetectedPattern[],
  minReliability: 'Low' | 'Medium' | 'High'
): DetectedPattern[] {
  const reliabilityOrder = { Low: 1, Medium: 2, High: 3 }
  const minLevel = reliabilityOrder[minReliability]

  return patterns.filter(p => reliabilityOrder[p.reliability] >= minLevel)
}
