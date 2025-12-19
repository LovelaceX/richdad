/**
 * Technical Indicators Calculator
 * Provides RSI, MACD, Moving Averages, and other indicators for AI analysis
 */

export interface TechnicalIndicators {
  rsi14: number | null
  macd: {
    value: number
    signal: number
    histogram: number
  } | null
  ma20: number | null
  ma50: number | null
  ma200: number | null
  bollingerBands: BollingerBands | null
  atr14: number | null
  trend: 'bullish' | 'bearish' | 'neutral'
  momentum: 'strong' | 'moderate' | 'weak'
  volatility: 'high' | 'normal' | 'low'
}

export interface BollingerBands {
  upper: number   // Upper band (SMA + 2 * StdDev)
  middle: number  // Middle band (20-period SMA)
  lower: number   // Lower band (SMA - 2 * StdDev)
  width: number   // Band width as percentage ((upper - lower) / middle)
  percentB: number // %B: Where price is within bands (0 = lower, 1 = upper)
}

export interface CandleData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume?: number  // Optional since some data sources may not provide volume
}

// ============================================
// Series Data Interfaces (for charting)
// ============================================

export interface MACDSeriesResult {
  time: number
  macd: number      // MACD line
  signal: number    // Signal line
  histogram: number // MACD - Signal
}

export interface StochRSIResult {
  time: number
  k: number  // %K line (fast stochastic of RSI)
  d: number  // %D line (SMA of %K)
}

export interface RSISeriesResult {
  time: number
  value: number
}

export interface BollingerBandsSeriesResult {
  time: number
  upper: number
  middle: number
  lower: number
}

export interface ATRSeriesResult {
  time: number
  value: number
}

/**
 * Calculate RSI (Relative Strength Index)
 * Period: 14 candles (standard)
 */
export function calculateRSI(candles: CandleData[], period: number = 14): number | null {
  if (candles.length < period + 1) return null

  const gains: number[] = []
  const losses: number[] = []

  // Calculate price changes
  for (let i = 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close
    gains.push(change > 0 ? change : 0)
    losses.push(change < 0 ? Math.abs(change) : 0)
  }

  // Calculate average gain and loss
  const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period
  const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period

  if (avgLoss === 0) return 100

  const rs = avgGain / avgLoss
  const rsi = 100 - (100 / (1 + rs))

  return Math.round(rsi * 100) / 100
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 * Fast: 12, Slow: 26, Signal: 9 (standard)
 *
 * MACD Line = EMA(12) - EMA(26)
 * Signal Line = EMA(9) of MACD Line
 * Histogram = MACD Line - Signal Line
 */
export function calculateMACD(candles: CandleData[]): {
  value: number
  signal: number
  histogram: number
} | null {
  // Need enough data for slow EMA (26) + signal period (9) = 35 candles minimum
  if (candles.length < 35) return null

  const closes = candles.map(c => c.close)

  // Calculate full EMA series for both periods
  const ema12Series = calculateEMASeriesInternal(closes, 12)
  const ema26Series = calculateEMASeriesInternal(closes, 26)

  // Build MACD line series (only where both EMAs are valid)
  const macdSeries: number[] = []
  for (let i = 0; i < closes.length; i++) {
    if (!isNaN(ema12Series[i]) && !isNaN(ema26Series[i])) {
      macdSeries.push(ema12Series[i] - ema26Series[i])
    }
  }

  // Need at least 9 MACD values to calculate signal line
  if (macdSeries.length < 9) return null

  // Calculate signal line (9-period EMA of MACD line)
  const signalSeries = calculateEMASeriesInternal(macdSeries, 9)

  // Get the latest values
  const macdLine = macdSeries[macdSeries.length - 1]
  const signalLine = signalSeries[signalSeries.length - 1]

  if (isNaN(macdLine) || isNaN(signalLine)) return null

  const histogram = macdLine - signalLine

  return {
    value: Math.round(macdLine * 100) / 100,
    signal: Math.round(signalLine * 100) / 100,
    histogram: Math.round(histogram * 100) / 100
  }
}

/**
 * Internal EMA series calculation (returns array with NaN for warmup period)
 */
function calculateEMASeriesInternal(values: number[], period: number): number[] {
  if (values.length < period) return values.map(() => NaN)

  const result: number[] = []
  const k = 2 / (period + 1)

  // Fill warmup period with NaN
  for (let i = 0; i < period - 1; i++) {
    result.push(NaN)
  }

  // First EMA value is SMA of first period
  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period
  result.push(ema)

  // Calculate remaining EMA values
  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k)
    result.push(ema)
  }

  return result
}

/**
 * Calculate Simple Moving Average
 */
export function calculateSMA(candles: CandleData[], period: number): number | null {
  if (candles.length < period) return null

  const closes = candles.slice(-period).map(c => c.close)
  const sum = closes.reduce((a, b) => a + b, 0)

  return Math.round((sum / period) * 100) / 100
}

/**
 * Calculate Bollinger Bands
 * Standard: 20-period SMA with 2 standard deviations
 *
 * Upper Band = SMA + (2 × Standard Deviation)
 * Middle Band = 20-period SMA
 * Lower Band = SMA - (2 × Standard Deviation)
 * %B = (Price - Lower Band) / (Upper Band - Lower Band)
 */
export function calculateBollingerBands(
  candles: CandleData[],
  period: number = 20,
  stdDevMultiplier: number = 2
): BollingerBands | null {
  if (candles.length < period) return null

  const closes = candles.slice(-period).map(c => c.close)
  const currentPrice = candles[candles.length - 1].close

  // Calculate SMA (middle band)
  const sma = closes.reduce((a, b) => a + b, 0) / period

  // Calculate Standard Deviation
  const squaredDiffs = closes.map(price => Math.pow(price - sma, 2))
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / period
  const stdDev = Math.sqrt(avgSquaredDiff)

  // Calculate bands
  const upper = sma + (stdDevMultiplier * stdDev)
  const lower = sma - (stdDevMultiplier * stdDev)

  // Calculate band width as percentage
  const width = ((upper - lower) / sma) * 100

  // Calculate %B (where price is within bands)
  // 0 = at lower band, 1 = at upper band, 0.5 = at middle
  const percentB = upper !== lower ? (currentPrice - lower) / (upper - lower) : 0.5

  return {
    upper: Math.round(upper * 100) / 100,
    middle: Math.round(sma * 100) / 100,
    lower: Math.round(lower * 100) / 100,
    width: Math.round(width * 100) / 100,
    percentB: Math.round(percentB * 100) / 100
  }
}

/**
 * Calculate ATR (Average True Range)
 * Measures volatility by decomposing the entire range of an asset price
 *
 * True Range = max of:
 *   - Current High - Current Low
 *   - |Current High - Previous Close|
 *   - |Current Low - Previous Close|
 *
 * ATR = Wilder's Smoothed Average of True Range
 */
export function calculateATR(candles: CandleData[], period: number = 14): number | null {
  if (candles.length < period + 1) return null

  // Calculate True Range for each candle
  const trueRanges: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const current = candles[i]
    const prevClose = candles[i - 1].close

    const highLow = current.high - current.low
    const highPrevClose = Math.abs(current.high - prevClose)
    const lowPrevClose = Math.abs(current.low - prevClose)

    const tr = Math.max(highLow, highPrevClose, lowPrevClose)
    trueRanges.push(tr)
  }

  // Use Wilder's smoothing (same as RSI)
  // First ATR is simple average of first 'period' true ranges
  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period

  // Subsequent values use smoothing
  for (let i = period; i < trueRanges.length; i++) {
    atr = ((atr * (period - 1)) + trueRanges[i]) / period
  }

  return Math.round(atr * 100) / 100
}

/**
 * Calculate ATR as a percentage of price (useful for comparing across stocks)
 */
export function calculateATRPercent(candles: CandleData[], period: number = 14): number | null {
  const atr = calculateATR(candles, period)
  if (atr === null) return null

  const currentPrice = candles[candles.length - 1].close
  return Math.round((atr / currentPrice) * 10000) / 100 // Returns as percentage
}

/**
 * Calculate all technical indicators
 */
export function calculateIndicators(candles: CandleData[]): TechnicalIndicators {
  const rsi14 = calculateRSI(candles, 14)
  const macd = calculateMACD(candles)
  const ma20 = calculateSMA(candles, 20)
  const ma50 = calculateSMA(candles, 50)
  const ma200 = calculateSMA(candles, 200)
  const bollingerBands = calculateBollingerBands(candles, 20, 2)
  const atr14 = calculateATR(candles, 14)

  // Determine trend based on moving averages
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  if (ma20 && ma50) {
    if (ma20 > ma50) {
      trend = 'bullish'
    } else if (ma20 < ma50) {
      trend = 'bearish'
    }
  }

  // Determine momentum based on RSI
  let momentum: 'strong' | 'moderate' | 'weak' = 'moderate'
  if (rsi14) {
    if (rsi14 > 70 || rsi14 < 30) {
      momentum = 'strong'
    } else if (rsi14 > 60 || rsi14 < 40) {
      momentum = 'moderate'
    } else {
      momentum = 'weak'
    }
  }

  // Determine volatility based on Bollinger Band width and ATR
  // Band width > 4% or ATR% > 3% = high volatility
  // Band width < 2% or ATR% < 1% = low volatility
  let volatility: 'high' | 'normal' | 'low' = 'normal'
  if (bollingerBands) {
    if (bollingerBands.width > 4) {
      volatility = 'high'
    } else if (bollingerBands.width < 2) {
      volatility = 'low'
    }
  }
  // ATR% can override if significantly different
  if (atr14 && candles.length > 0) {
    const currentPrice = candles[candles.length - 1].close
    const atrPercent = (atr14 / currentPrice) * 100
    if (atrPercent > 3) {
      volatility = 'high'
    } else if (atrPercent < 1 && volatility !== 'high') {
      volatility = 'low'
    }
  }

  return {
    rsi14,
    macd,
    ma20,
    ma50,
    ma200,
    bollingerBands,
    atr14,
    trend,
    momentum,
    volatility
  }
}

/**
 * Get human-readable indicator summary
 */
export function getIndicatorSummary(indicators: TechnicalIndicators): string {
  const parts: string[] = []

  if (indicators.rsi14) {
    const rsiStatus = indicators.rsi14 > 70 ? 'Overbought' : indicators.rsi14 < 30 ? 'Oversold' : 'Neutral'
    parts.push(`RSI: ${indicators.rsi14} (${rsiStatus})`)
  }

  if (indicators.macd) {
    const macdStatus = indicators.macd.histogram > 0 ? 'Bullish' : 'Bearish'
    parts.push(`MACD: ${macdStatus} (${indicators.macd.value})`)
  }

  if (indicators.bollingerBands) {
    const bb = indicators.bollingerBands
    let bbStatus = 'Middle'
    if (bb.percentB > 1) bbStatus = 'Above Upper'
    else if (bb.percentB < 0) bbStatus = 'Below Lower'
    else if (bb.percentB > 0.8) bbStatus = 'Near Upper'
    else if (bb.percentB < 0.2) bbStatus = 'Near Lower'
    parts.push(`BB: ${bbStatus} (%B: ${bb.percentB})`)
  }

  if (indicators.atr14) {
    parts.push(`ATR: $${indicators.atr14}`)
  }

  if (indicators.ma20 && indicators.ma50) {
    parts.push(`MA20: $${indicators.ma20}, MA50: $${indicators.ma50}`)
  }

  parts.push(`Trend: ${indicators.trend}`)
  parts.push(`Momentum: ${indicators.momentum}`)
  parts.push(`Volatility: ${indicators.volatility}`)

  return parts.join(' | ')
}

// ============================================
// Series Calculations (for charting)
// ============================================

/**
 * Helper: Calculate EMA series
 */
function calculateEMASeries(values: number[], period: number): number[] {
  if (values.length < period) return []

  const result: number[] = []
  const k = 2 / (period + 1)

  // Start with SMA for the first period
  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period

  // Fill initial values with null equivalent (we'll filter these)
  for (let i = 0; i < period - 1; i++) {
    result.push(NaN)
  }
  result.push(ema)

  // Calculate EMA for remaining values
  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k)
    result.push(ema)
  }

  return result
}

/**
 * Calculate RSI series for charting
 * Returns RSI value for each candle (after warmup period)
 */
export function calculateRSISeries(
  candles: CandleData[],
  period: number = 14
): RSISeriesResult[] {
  if (candles.length < period + 1) return []

  const results: RSISeriesResult[] = []

  // Calculate all price changes
  const changes: number[] = []
  for (let i = 1; i < candles.length; i++) {
    changes.push(candles[i].close - candles[i - 1].close)
  }

  // Use Wilder's smoothing method
  let avgGain = 0
  let avgLoss = 0

  // First calculation uses simple average
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i]
    else avgLoss += Math.abs(changes[i])
  }
  avgGain /= period
  avgLoss /= period

  // First RSI value
  const firstRS = avgLoss === 0 ? 100 : avgGain / avgLoss
  const firstRSI = 100 - (100 / (1 + firstRS))
  results.push({
    time: candles[period].time,
    value: Math.round(firstRSI * 100) / 100
  })

  // Subsequent RSI values using Wilder's smoothing
  for (let i = period; i < changes.length; i++) {
    const change = changes[i]
    const gain = change > 0 ? change : 0
    const loss = change < 0 ? Math.abs(change) : 0

    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    const rsi = 100 - (100 / (1 + rs))

    results.push({
      time: candles[i + 1].time,
      value: Math.round(rsi * 100) / 100
    })
  }

  return results
}

/**
 * Calculate MACD series for charting
 * Returns MACD line, signal line, and histogram for each candle
 */
export function calculateMACDSeries(
  candles: CandleData[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDSeriesResult[] {
  if (candles.length < slowPeriod + signalPeriod) return []

  const closes = candles.map(c => c.close)
  const times = candles.map(c => c.time)

  // Calculate EMA series
  const ema12 = calculateEMASeries(closes, fastPeriod)
  const ema26 = calculateEMASeries(closes, slowPeriod)

  // Calculate MACD line (EMA12 - EMA26)
  const macdLine: number[] = []
  for (let i = 0; i < closes.length; i++) {
    if (isNaN(ema12[i]) || isNaN(ema26[i])) {
      macdLine.push(NaN)
    } else {
      macdLine.push(ema12[i] - ema26[i])
    }
  }

  // Calculate Signal line (9-period EMA of MACD)
  const validMacdValues = macdLine.filter(v => !isNaN(v))
  const signalEma = calculateEMASeries(validMacdValues, signalPeriod)

  // Build results
  const results: MACDSeriesResult[] = []
  let signalIdx = 0

  for (let i = 0; i < candles.length; i++) {
    if (isNaN(macdLine[i])) continue

    // Skip until we have enough signal values
    if (signalIdx < signalPeriod - 1) {
      signalIdx++
      continue
    }

    const macd = macdLine[i]
    const signal = signalEma[signalIdx] || macd
    const histogram = macd - signal

    results.push({
      time: times[i],
      macd: Math.round(macd * 1000) / 1000,
      signal: Math.round(signal * 1000) / 1000,
      histogram: Math.round(histogram * 1000) / 1000
    })

    signalIdx++
  }

  return results
}

/**
 * Calculate Stochastic RSI series for charting
 * Stochastic RSI = (RSI - Lowest RSI) / (Highest RSI - Lowest RSI)
 * %K = Smoothed Stochastic RSI
 * %D = SMA of %K
 */
export function calculateStochRSISeries(
  candles: CandleData[],
  rsiPeriod: number = 14,
  stochPeriod: number = 14,
  kSmooth: number = 3,
  dSmooth: number = 3
): StochRSIResult[] {
  // First calculate RSI series
  const rsiSeries = calculateRSISeries(candles, rsiPeriod)

  if (rsiSeries.length < stochPeriod) return []

  const rsiValues = rsiSeries.map(r => r.value)
  const rsiTimes = rsiSeries.map(r => r.time)

  // Calculate raw Stochastic RSI
  const stochRsiRaw: number[] = []
  for (let i = stochPeriod - 1; i < rsiValues.length; i++) {
    const window = rsiValues.slice(i - stochPeriod + 1, i + 1)
    const lowestRsi = Math.min(...window)
    const highestRsi = Math.max(...window)

    if (highestRsi === lowestRsi) {
      stochRsiRaw.push(50) // Neutral when no range
    } else {
      const stochRsi = ((rsiValues[i] - lowestRsi) / (highestRsi - lowestRsi)) * 100
      stochRsiRaw.push(stochRsi)
    }
  }

  // Smooth %K with SMA
  const kValues: number[] = []
  for (let i = kSmooth - 1; i < stochRsiRaw.length; i++) {
    const window = stochRsiRaw.slice(i - kSmooth + 1, i + 1)
    const k = window.reduce((a, b) => a + b, 0) / kSmooth
    kValues.push(k)
  }

  // Calculate %D (SMA of %K)
  const dValues: number[] = []
  for (let i = dSmooth - 1; i < kValues.length; i++) {
    const window = kValues.slice(i - dSmooth + 1, i + 1)
    const d = window.reduce((a, b) => a + b, 0) / dSmooth
    dValues.push(d)
  }

  // Build results - align with times
  const results: StochRSIResult[] = []
  const offset = stochPeriod - 1 + kSmooth - 1 + dSmooth - 1

  for (let i = 0; i < dValues.length; i++) {
    const timeIdx = offset + i
    if (timeIdx < rsiTimes.length) {
      results.push({
        time: rsiTimes[timeIdx],
        k: Math.round(kValues[i + dSmooth - 1] * 100) / 100,
        d: Math.round(dValues[i] * 100) / 100
      })
    }
  }

  return results
}

/**
 * Calculate Bollinger Bands series for charting
 * Returns upper, middle, and lower bands for each candle
 */
export function calculateBollingerBandsSeries(
  candles: CandleData[],
  period: number = 20,
  stdDevMultiplier: number = 2
): BollingerBandsSeriesResult[] {
  if (candles.length < period) return []

  const results: BollingerBandsSeriesResult[] = []

  for (let i = period - 1; i < candles.length; i++) {
    // Get the window of closes for this point
    const windowCandles = candles.slice(i - period + 1, i + 1)
    const closes = windowCandles.map(c => c.close)

    // Calculate SMA (middle band)
    const sma = closes.reduce((a, b) => a + b, 0) / period

    // Calculate Standard Deviation
    const squaredDiffs = closes.map(price => Math.pow(price - sma, 2))
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / period
    const stdDev = Math.sqrt(avgSquaredDiff)

    // Calculate bands
    const upper = sma + (stdDevMultiplier * stdDev)
    const lower = sma - (stdDevMultiplier * stdDev)

    results.push({
      time: candles[i].time,
      upper: Math.round(upper * 100) / 100,
      middle: Math.round(sma * 100) / 100,
      lower: Math.round(lower * 100) / 100
    })
  }

  return results
}

/**
 * Calculate ATR series for charting
 * Returns ATR value for each candle (after warmup period)
 */
export function calculateATRSeries(
  candles: CandleData[],
  period: number = 14
): ATRSeriesResult[] {
  if (candles.length < period + 1) return []

  const results: ATRSeriesResult[] = []

  // Calculate True Range for each candle
  const trueRanges: number[] = []
  for (let i = 1; i < candles.length; i++) {
    const current = candles[i]
    const prevClose = candles[i - 1].close

    const highLow = current.high - current.low
    const highPrevClose = Math.abs(current.high - prevClose)
    const lowPrevClose = Math.abs(current.low - prevClose)

    const tr = Math.max(highLow, highPrevClose, lowPrevClose)
    trueRanges.push(tr)
  }

  // First ATR is simple average of first 'period' true ranges
  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period

  // Add first ATR value
  results.push({
    time: candles[period].time,
    value: Math.round(atr * 100) / 100
  })

  // Calculate subsequent ATR values using Wilder's smoothing
  for (let i = period; i < trueRanges.length; i++) {
    atr = ((atr * (period - 1)) + trueRanges[i]) / period
    results.push({
      time: candles[i + 1].time,
      value: Math.round(atr * 100) / 100
    })
  }

  return results
}

/**
 * Get Bollinger Band signals for trading
 * Returns actionable signals based on band position
 */
export function getBollingerSignals(bb: BollingerBands): {
  signal: 'buy' | 'sell' | 'hold'
  strength: 'strong' | 'moderate' | 'weak'
  reason: string
} {
  // Price below lower band - potential mean reversion buy
  if (bb.percentB < 0) {
    return {
      signal: 'buy',
      strength: bb.percentB < -0.1 ? 'strong' : 'moderate',
      reason: `Price below lower band (%B: ${bb.percentB}) - oversold condition`
    }
  }

  // Price above upper band - potential mean reversion sell
  if (bb.percentB > 1) {
    return {
      signal: 'sell',
      strength: bb.percentB > 1.1 ? 'strong' : 'moderate',
      reason: `Price above upper band (%B: ${bb.percentB}) - overbought condition`
    }
  }

  // Near lower band - early buy signal
  if (bb.percentB < 0.2) {
    return {
      signal: 'buy',
      strength: 'weak',
      reason: `Price near lower band (%B: ${bb.percentB}) - approaching oversold`
    }
  }

  // Near upper band - early sell signal
  if (bb.percentB > 0.8) {
    return {
      signal: 'sell',
      strength: 'weak',
      reason: `Price near upper band (%B: ${bb.percentB}) - approaching overbought`
    }
  }

  return {
    signal: 'hold',
    strength: 'weak',
    reason: `Price within bands (%B: ${bb.percentB}) - no clear signal`
  }
}

/**
 * Get volatility-based position sizing using ATR
 * Returns suggested position size multiplier based on current volatility
 */
export function getATRPositionMultiplier(
  atr: number,
  currentPrice: number,
  baseVolatility: number = 2 // Expected "normal" ATR%
): number {
  const atrPercent = (atr / currentPrice) * 100

  // Higher volatility = smaller position
  // Lower volatility = larger position (but capped)
  const ratio = baseVolatility / atrPercent

  // Clamp between 0.5x and 1.5x normal position size
  return Math.min(1.5, Math.max(0.5, ratio))
}

/**
 * Calculate ATR-based stop loss level
 * Returns suggested stop loss price based on ATR multiplier
 */
export function calculateATRStopLoss(
  currentPrice: number,
  atr: number,
  multiplier: number = 2,
  direction: 'long' | 'short' = 'long'
): number {
  const stopDistance = atr * multiplier

  if (direction === 'long') {
    return Math.round((currentPrice - stopDistance) * 100) / 100
  } else {
    return Math.round((currentPrice + stopDistance) * 100) / 100
  }
}
