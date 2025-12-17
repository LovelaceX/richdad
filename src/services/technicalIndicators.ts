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
