/**
 * Pattern Scanner Web Worker
 * Offloads CPU-intensive pattern detection from main thread
 *
 * This worker contains all pattern detection logic inline to avoid
 * IndexedDB dependencies that don't work in Web Workers.
 */

// ==========================================
// TYPES
// ==========================================

interface CandleData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

interface ReliabilityFactors {
  baseScore: number
  volumeBonus: number
  trendBonus: number
  locationBonus: number
  formationQuality: number
}

interface DetectedPattern {
  time: number
  pattern: string
  type: 'bullish' | 'bearish' | 'neutral'
  reliability: 'Low' | 'Medium' | 'High'
  reliabilityScore: number
  description: string
  candleCount: number
  factors?: ReliabilityFactors
}

interface TradingThresholds {
  patternHighScore: number
  patternMediumScore: number
}

interface ScanRequest {
  type: 'scan'
  candleData: Record<string, CandleData[]>  // symbol -> candles
  thresholds: TradingThresholds
}

interface ScanResult {
  type: 'result'
  patterns: Record<string, DetectedPattern[]>  // symbol -> patterns
  duration: number
  symbolCount: number
}

interface ErrorResult {
  type: 'error'
  error: string
}

// ==========================================
// DEFAULT THRESHOLDS
// ==========================================

const DEFAULT_THRESHOLDS: TradingThresholds = {
  patternHighScore: 75,
  patternMediumScore: 50
}

let currentThresholds: TradingThresholds = DEFAULT_THRESHOLDS

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

function getAverageVolume(candles: CandleData[], lookback: number = 20): number {
  const volumeCandles = candles.slice(-lookback).filter(c => c.volume !== undefined)
  if (volumeCandles.length === 0) return 0
  return volumeCandles.reduce((sum, c) => sum + (c.volume || 0), 0) / volumeCandles.length
}

function isVolumeSpike(currentVolume: number | undefined, avgVolume: number): number {
  if (!currentVolume || avgVolume === 0) return 0
  const ratio = currentVolume / avgVolume
  if (ratio >= 2.5) return 25
  if (ratio >= 2.0) return 20
  if (ratio >= 1.5) return 15
  if (ratio >= 1.2) return 10
  return 0
}

function getTrendBonus(patternType: 'bullish' | 'bearish' | 'neutral', trend: 'up' | 'down' | 'flat'): number {
  if (patternType === 'bullish' && trend === 'down') return 15
  if (patternType === 'bearish' && trend === 'up') return 15
  if (patternType === 'bullish' && trend === 'up') return 10
  if (patternType === 'bearish' && trend === 'down') return 10
  if (patternType === 'neutral') return 5
  return 0
}

function getFormationQualityBonus(candle: CandleData, pattern: string): number {
  const body = getBody(candle)
  const range = getRange(candle)
  const upperWick = getUpperWick(candle)
  const lowerWick = getLowerWick(candle)

  if (range === 0) return 0

  switch (pattern) {
    case 'Hammer':
    case 'Hanging Man':
      if (lowerWick >= body * 3 && upperWick <= body * 0.1) return 10
      else if (lowerWick >= body * 2.5) return 7
      return 5

    case 'Shooting Star':
    case 'Inverted Hammer':
      if (upperWick >= body * 3 && lowerWick <= body * 0.1) return 10
      else if (upperWick >= body * 2.5) return 7
      return 5

    case 'Doji':
      const bodyRatio = body / range
      if (bodyRatio < 0.03) return 10
      else if (bodyRatio < 0.05) return 7
      return 5

    case 'Bullish Engulfing':
    case 'Bearish Engulfing':
      if (body / range > 0.7) return 10
      else if (body / range > 0.5) return 7
      return 5

    default:
      return 5
  }
}

function getLocationBonus(price: number): number {
  const roundness = price % 10
  if (roundness < 0.5 || roundness > 9.5) return 15
  if (price % 5 < 0.25 || price % 5 > 4.75) return 10
  if (price % 1 < 0.1 || price % 1 > 0.9) return 5
  return 0
}

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
    factors: { baseScore, volumeBonus, trendBonus, locationBonus, formationQuality }
  }
}

function scoreToReliability(score: number): 'Low' | 'Medium' | 'High' {
  if (score >= currentThresholds.patternHighScore) return 'High'
  if (score >= currentThresholds.patternMediumScore) return 'Medium'
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
  const engulfs = curr.open <= prev.close && curr.close >= prev.open
  const currBody = getBody(curr)
  const prevBody = getBody(prev)

  return prevBearish && currBullish && engulfs && currBody > prevBody * 1.1
}

function isBearishEngulfing(prev: CandleData, curr: CandleData): boolean {
  const prevBullish = isBullish(prev)
  const currBearish = isBearish(curr)
  const engulfs = curr.open >= prev.close && curr.close <= prev.open
  const currBody = getBody(curr)
  const prevBody = getBody(prev)

  return prevBullish && currBearish && engulfs && currBody > prevBody * 1.1
}

function isPiercingLine(prev: CandleData, curr: CandleData, trend: string): boolean {
  if (trend !== 'down') return false
  const prevBearish = isBearish(prev)
  const currBullish = isBullish(curr)
  const gapDown = curr.open < prev.close
  const prevMidpoint = (prev.open + prev.close) / 2
  const closesAboveMid = curr.close > prevMidpoint && curr.close < prev.open

  return prevBearish && currBullish && gapDown && closesAboveMid
}

function isDarkCloudCover(prev: CandleData, curr: CandleData, trend: string): boolean {
  if (trend !== 'up') return false
  const prevBullish = isBullish(prev)
  const currBearish = isBearish(curr)
  const gapUp = curr.open > prev.close
  const prevMidpoint = (prev.open + prev.close) / 2
  const closesBelowMid = curr.close < prevMidpoint && curr.close > prev.open

  return prevBullish && currBearish && gapUp && closesBelowMid
}

function isBullishHarami(prev: CandleData, curr: CandleData): boolean {
  const prevBearish = isBearish(prev)
  const currBullish = isBullish(curr)
  const contained = curr.open > prev.close && curr.close < prev.open && curr.open < curr.close
  const currBody = getBody(curr)
  const prevBody = getBody(prev)

  return prevBearish && currBullish && contained && currBody < prevBody * 0.6
}

function isBearishHarami(prev: CandleData, curr: CandleData): boolean {
  const prevBullish = isBullish(prev)
  const currBearish = isBearish(curr)
  const contained = curr.open < prev.close && curr.close > prev.open && curr.open > curr.close
  const currBody = getBody(curr)
  const prevBody = getBody(prev)

  return prevBullish && currBearish && contained && currBody < prevBody * 0.6
}

function isInsideBar(prev: CandleData, curr: CandleData): boolean {
  return curr.high < prev.high && curr.low > prev.low
}

function isOutsideUp(prev: CandleData, curr: CandleData): boolean {
  return (
    curr.high > prev.high &&
    curr.low < prev.low &&
    curr.close > prev.close &&
    isBullish(curr)
  )
}

function isOutsideDown(prev: CandleData, curr: CandleData): boolean {
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
  const c1Bearish = isBearish(c1)
  const c1LongBody = getBody(c1) > getRange(c1) * 0.5
  const c2SmallBody = getBody(c2) < getBody(c1) * 0.3
  const c3Bullish = isBullish(c3)
  const c1Midpoint = (c1.open + c1.close) / 2
  const c3ClosesAboveMid = c3.close > c1Midpoint

  return c1Bearish && c1LongBody && c2SmallBody && c3Bullish && c3ClosesAboveMid
}

function isEveningStar(c1: CandleData, c2: CandleData, c3: CandleData, trend: string): boolean {
  if (trend !== 'up') return false
  const c1Bullish = isBullish(c1)
  const c1LongBody = getBody(c1) > getRange(c1) * 0.5
  const c2SmallBody = getBody(c2) < getBody(c1) * 0.3
  const c3Bearish = isBearish(c3)
  const c1Midpoint = (c1.open + c1.close) / 2
  const c3ClosesBelowMid = c3.close < c1Midpoint

  return c1Bullish && c1LongBody && c2SmallBody && c3Bearish && c3ClosesBelowMid
}

// ==========================================
// FIVE-CANDLE PATTERNS
// ==========================================

function isBreakawayBullish(candles: CandleData[]): boolean {
  if (candles.length < 5) return false
  const [c1, c2, c3, c4, c5] = candles.slice(-5)

  const c1Bearish = isBearish(c1) && getBody(c1) > getRange(c1) * 0.5
  const middleSmall =
    getBody(c2) < getBody(c1) * 0.5 &&
    getBody(c3) < getBody(c1) * 0.5 &&
    getBody(c4) < getBody(c1) * 0.5
  const c5Bullish = isBullish(c5) && getBody(c5) > getBody(c1) * 0.8
  const breaksAbove = c5.close > c2.high

  return c1Bearish && middleSmall && c5Bullish && breaksAbove
}

function isBreakawayBearish(candles: CandleData[]): boolean {
  if (candles.length < 5) return false
  const [c1, c2, c3, c4, c5] = candles.slice(-5)

  const c1Bullish = isBullish(c1) && getBody(c1) > getRange(c1) * 0.5
  const middleSmall =
    getBody(c2) < getBody(c1) * 0.5 &&
    getBody(c3) < getBody(c1) * 0.5 &&
    getBody(c4) < getBody(c1) * 0.5
  const c5Bearish = isBearish(c5) && getBody(c5) > getBody(c1) * 0.8
  const breaksBelow = c5.close < c2.low

  return c1Bullish && middleSmall && c5Bearish && breaksBelow
}

// ==========================================
// PATTERN CREATION
// ==========================================

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
    description: PATTERN_DESCRIPTIONS[pattern] || 'Unknown pattern',
    candleCount,
    factors
  }
}

// ==========================================
// MAIN DETECTION FUNCTION
// ==========================================

function detectPatterns(candles: CandleData[]): DetectedPattern[] {
  const patterns: DetectedPattern[] = []

  if (candles.length < 2) return patterns

  for (let i = 1; i < candles.length; i++) {
    const curr = candles[i]
    const prev = candles[i - 1]
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

    // Three-candle patterns
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

    // Five-candle patterns
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

// ==========================================
// WORKER MESSAGE HANDLER
// ==========================================

self.onmessage = (e: MessageEvent<ScanRequest>) => {
  const startTime = performance.now()

  try {
    const { candleData, thresholds } = e.data

    // Update thresholds if provided
    if (thresholds) {
      currentThresholds = thresholds
    }

    const results: Record<string, DetectedPattern[]> = {}
    let symbolCount = 0

    // Process each symbol
    for (const [symbol, candles] of Object.entries(candleData)) {
      if (candles && candles.length >= 10) {
        results[symbol] = detectPatterns(candles)
        symbolCount++
      }
    }

    const duration = performance.now() - startTime

    self.postMessage({
      type: 'result',
      patterns: results,
      duration,
      symbolCount
    } as ScanResult)

  } catch (error: any) {
    console.error('[Pattern Worker] Error:', error)
    self.postMessage({
      type: 'error',
      error: error.message || 'Unknown error'
    } as ErrorResult)
  }
}
