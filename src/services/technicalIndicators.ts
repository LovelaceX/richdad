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
  trend: 'bullish' | 'bearish' | 'neutral'
  momentum: 'strong' | 'moderate' | 'weak'
}

export interface CandleData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
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
 */
export function calculateMACD(candles: CandleData[]): {
  value: number
  signal: number
  histogram: number
} | null {
  if (candles.length < 26) return null

  const closes = candles.map(c => c.close)

  // Calculate EMA
  const ema12 = calculateEMA(closes, 12)
  const ema26 = calculateEMA(closes, 26)

  if (!ema12 || !ema26) return null

  const macdLine = ema12 - ema26

  // Calculate MACD signal line (9-period EMA of MACD line)
  // Simplified: use SMA instead of EMA for signal
  const macdValues = [macdLine]
  const signalLine = macdValues[0] // Simplified - would need historical MACD for true signal

  const histogram = macdLine - signalLine

  return {
    value: Math.round(macdLine * 100) / 100,
    signal: Math.round(signalLine * 100) / 100,
    histogram: Math.round(histogram * 100) / 100
  }
}

/**
 * Calculate EMA (Exponential Moving Average)
 */
function calculateEMA(values: number[], period: number): number | null {
  if (values.length < period) return null

  const k = 2 / (period + 1)
  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period

  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k)
  }

  return ema
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
 * Calculate all technical indicators
 */
export function calculateIndicators(candles: CandleData[]): TechnicalIndicators {
  const rsi14 = calculateRSI(candles, 14)
  const macd = calculateMACD(candles)
  const ma20 = calculateSMA(candles, 20)
  const ma50 = calculateSMA(candles, 50)
  const ma200 = calculateSMA(candles, 200)

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

  return {
    rsi14,
    macd,
    ma20,
    ma50,
    ma200,
    trend,
    momentum
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

  if (indicators.ma20 && indicators.ma50) {
    parts.push(`MA20: $${indicators.ma20}, MA50: $${indicators.ma50}`)
  }

  parts.push(`Trend: ${indicators.trend}`)
  parts.push(`Momentum: ${indicators.momentum}`)

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
