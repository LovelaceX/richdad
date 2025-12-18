/**
 * Backtest Engine
 * Core logic for running backtests on AI trading recommendations
 *
 * Key principle: Point-in-time simulation
 * - Only use data that would have been available at each simulation point
 * - No look-ahead bias
 */

import type {
  BacktestConfig,
  BacktestTrade,
  BacktestResult,
  BacktestMetrics,
  BacktestEquityPoint,
  CandleData
} from '../renderer/types'
import { fetchHistoricalDataRange, validateCandleData } from './marketData'
import { generateRecommendationForBacktest } from './aiRecommendationEngine'
import { generateId } from '../renderer/lib/utils'

// Minimum candles needed for indicator calculation
const INDICATOR_LOOKBACK = 200

// Type for progress callback
export type BacktestProgressCallback = (
  phase: string,
  progress: number,
  message: string
) => void

/**
 * Run a backtest simulation
 *
 * @param config - Backtest configuration
 * @param onProgress - Optional callback for progress updates
 * @param abortSignal - Optional abort signal to cancel the backtest
 */
export async function runBacktest(
  config: BacktestConfig,
  onProgress?: BacktestProgressCallback,
  abortSignal?: AbortSignal
): Promise<BacktestResult> {
  const startTime = Date.now()
  const trades: BacktestTrade[] = []
  const equityCurve: BacktestEquityPoint[] = []
  const errors: string[] = []

  let currentCapital = config.initialCapital
  let openPosition: BacktestTrade | null = null
  let peakEquity = config.initialCapital
  let maxDrawdown = 0

  try {
    // Phase 1: Fetch historical data
    onProgress?.('fetching_data', 0, `Fetching historical data for ${config.symbol}...`)

    const timeframeMap: Record<string, '1d' | '1h' | '15m'> = {
      '1d': '1d',
      '1h': '1h',
      '15m': '15m'
    }

    const allCandles = await fetchHistoricalDataRange(
      config.symbol,
      config.startDate,
      config.endDate,
      timeframeMap[config.timeframe] || '1d',
      INDICATOR_LOOKBACK
    )

    if (abortSignal?.aborted) {
      throw new Error('Backtest cancelled')
    }

    // Validate data
    const validation = validateCandleData(allCandles)
    if (!validation.valid) {
      errors.push(...validation.issues.slice(0, 5)) // Limit to first 5 issues
      console.warn('[Backtest] Data validation issues:', validation.issues)
    }

    if (allCandles.length < INDICATOR_LOOKBACK + 10) {
      throw new Error(`Insufficient data: need ${INDICATOR_LOOKBACK + 10} candles, got ${allCandles.length}`)
    }

    onProgress?.('fetching_data', 100, `Loaded ${allCandles.length} candles`)

    // Find the first candle at or after the start date (after lookback period)
    const startIndex = findStartIndex(allCandles, config.startDate)
    const totalSimPoints = allCandles.length - startIndex

    console.log(`[Backtest] Starting simulation from index ${startIndex} to ${allCandles.length}`)
    console.log(`[Backtest] Total simulation points: ${totalSimPoints}`)

    // Phase 2: Run simulation
    onProgress?.('running_simulation', 0, 'Starting simulation...')

    for (let i = startIndex; i < allCandles.length; i++) {
      if (abortSignal?.aborted) {
        throw new Error('Backtest cancelled')
      }

      const currentCandle = allCandles[i]
      const historicalCandles = allCandles.slice(0, i + 1) // Only past data!
      const progress = Math.round(((i - startIndex) / totalSimPoints) * 100)

      // Update progress every 5%
      if (progress % 5 === 0) {
        onProgress?.('running_simulation', progress, `Processing ${new Date(currentCandle.time * 1000).toLocaleDateString()}...`)
      }

      // Check if open position should be closed
      if (openPosition) {
        const exitResult = checkTradeExit(openPosition, currentCandle)

        if (exitResult.shouldExit) {
          // Close the position
          openPosition.exitDate = currentCandle.time
          openPosition.exitPrice = exitResult.exitPrice
          openPosition.outcome = exitResult.outcome
          openPosition.daysHeld = calculateDaysHeld(openPosition.entryDate, currentCandle.time)
          openPosition.profitLossPercent = calculatePnLPercent(
            openPosition.action,
            openPosition.entryPrice,
            exitResult.exitPrice
          )
          openPosition.profitLossDollar = calculatePnLDollar(
            openPosition.action,
            openPosition.entryPrice,
            exitResult.exitPrice,
            config.initialCapital * (config.positionSizePercent / 100)
          )

          // Update capital
          currentCapital += openPosition.profitLossDollar

          // Record completed trade
          const completedTrade = { ...openPosition }
          trades.push(completedTrade)
          openPosition = null

          console.log(`[Backtest] Closed trade: ${exitResult.outcome}, P&L: ${completedTrade.profitLossPercent.toFixed(2)}%`)
        }
      }

      // Check if we should open a new position
      if (!openPosition) {
        // Skip weekends for daily data
        if (config.timeframe === '1d' && isWeekend(currentCandle.time)) {
          continue
        }

        // Generate recommendation using AI
        const recommendation = await generateRecommendationForBacktest(
          config.symbol,
          historicalCandles as CandleData[],
          {
            skipBudgetCheck: true,
            confidenceThreshold: config.confidenceThreshold,
            newsHeadlines: [] // No historical news for now
          }
        )

        // If we got a BUY or SELL recommendation, open position
        if (recommendation && recommendation.action !== 'HOLD') {
          openPosition = {
            id: generateId(),
            entryDate: currentCandle.time,
            exitDate: null,
            symbol: config.symbol,
            action: recommendation.action,
            entryPrice: currentCandle.close,
            exitPrice: null,
            priceTarget: recommendation.priceTarget || calculateDefaultTarget(recommendation.action, currentCandle.close),
            stopLoss: recommendation.stopLoss || calculateDefaultStopLoss(recommendation.action, currentCandle.close),
            confidence: recommendation.confidence,
            rationale: recommendation.rationale,
            outcome: 'pending',
            profitLossPercent: 0,
            profitLossDollar: 0,
            daysHeld: 0
          }

          console.log(`[Backtest] Opened ${recommendation.action} @ $${currentCandle.close.toFixed(2)} (conf: ${recommendation.confidence}%)`)
        }
      }

      // Calculate current equity (capital + open position value)
      const openPositionValue = openPosition
        ? calculateOpenPositionValue(openPosition, currentCandle.close, config.positionSizePercent / 100 * config.initialCapital)
        : 0
      const currentEquity = currentCapital + openPositionValue

      // Track peak and drawdown
      if (currentEquity > peakEquity) {
        peakEquity = currentEquity
      }
      const currentDrawdown = ((peakEquity - currentEquity) / peakEquity) * 100
      if (currentDrawdown > maxDrawdown) {
        maxDrawdown = currentDrawdown
      }

      // Record equity point
      equityCurve.push({
        date: currentCandle.time,
        equity: currentEquity,
        drawdown: currentDrawdown
      })

      // Rate limiting: Add delay between AI calls to avoid overwhelming the API
      if (!openPosition) {
        await delay(100) // 100ms delay between AI analysis calls
      }
    }

    // Close any remaining open position at end of backtest
    if (openPosition) {
      const lastCandle = allCandles[allCandles.length - 1]
      openPosition.exitDate = lastCandle.time
      openPosition.exitPrice = lastCandle.close
      openPosition.outcome = 'expired'
      openPosition.daysHeld = calculateDaysHeld(openPosition.entryDate, lastCandle.time)
      openPosition.profitLossPercent = calculatePnLPercent(
        openPosition.action,
        openPosition.entryPrice,
        lastCandle.close
      )
      openPosition.profitLossDollar = calculatePnLDollar(
        openPosition.action,
        openPosition.entryPrice,
        lastCandle.close,
        config.initialCapital * (config.positionSizePercent / 100)
      )
      currentCapital += openPosition.profitLossDollar
      trades.push({ ...openPosition })
    }

    // Phase 3: Calculate metrics
    onProgress?.('analyzing', 90, 'Calculating metrics...')
    const metrics = calculateBacktestMetrics(trades, config, maxDrawdown, equityCurve)

    onProgress?.('complete', 100, `Completed: ${trades.length} trades, ${metrics.winRate.toFixed(1)}% win rate`)

    return {
      id: generateId(),
      config,
      trades,
      metrics,
      equityCurve,
      errors,
      completedAt: Date.now(),
      duration: Date.now() - startTime
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    errors.push(errorMsg)
    console.error('[Backtest] Error:', error)

    // Return partial result
    return {
      id: generateId(),
      config,
      trades,
      metrics: getEmptyMetrics(),
      equityCurve,
      errors,
      completedAt: Date.now(),
      duration: Date.now() - startTime
    }
  }
}

/**
 * Check if a trade should be exited
 */
function checkTradeExit(
  position: BacktestTrade,
  candle: CandleData
): { shouldExit: boolean; exitPrice: number; outcome: 'win' | 'loss' | 'pending' | 'expired' } {
  const { action, priceTarget, stopLoss } = position

  if (action === 'BUY') {
    // Check if price target hit (high of candle reached target)
    if (priceTarget && candle.high >= priceTarget) {
      return { shouldExit: true, exitPrice: priceTarget, outcome: 'win' }
    }
    // Check if stop loss hit (low of candle reached stop)
    if (stopLoss && candle.low <= stopLoss) {
      return { shouldExit: true, exitPrice: stopLoss, outcome: 'loss' }
    }
  } else if (action === 'SELL') {
    // For short: target is below entry, stop is above
    if (priceTarget && candle.low <= priceTarget) {
      return { shouldExit: true, exitPrice: priceTarget, outcome: 'win' }
    }
    if (stopLoss && candle.high >= stopLoss) {
      return { shouldExit: true, exitPrice: stopLoss, outcome: 'loss' }
    }
  }

  return { shouldExit: false, exitPrice: candle.close, outcome: 'pending' }
}

/**
 * Calculate P&L percentage
 */
function calculatePnLPercent(action: 'BUY' | 'SELL', entryPrice: number, exitPrice: number): number {
  if (action === 'BUY') {
    return ((exitPrice - entryPrice) / entryPrice) * 100
  } else {
    // For short positions, profit when price goes down
    return ((entryPrice - exitPrice) / entryPrice) * 100
  }
}

/**
 * Calculate P&L in dollars
 */
function calculatePnLDollar(
  action: 'BUY' | 'SELL',
  entryPrice: number,
  exitPrice: number,
  positionSize: number
): number {
  const shares = positionSize / entryPrice
  if (action === 'BUY') {
    return (exitPrice - entryPrice) * shares
  } else {
    return (entryPrice - exitPrice) * shares
  }
}

/**
 * Calculate days held between entry and exit
 */
function calculateDaysHeld(entryTime: number, exitTime: number): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round(((exitTime - entryTime) * 1000) / msPerDay * 10) / 10
}

/**
 * Calculate open position value
 */
function calculateOpenPositionValue(
  position: BacktestTrade,
  currentPrice: number,
  positionSize: number
): number {
  const shares = positionSize / position.entryPrice
  if (position.action === 'BUY') {
    return shares * currentPrice - positionSize + positionSize
  } else {
    // For short: profit when price drops
    const pnl = (position.entryPrice - currentPrice) * shares
    return positionSize + pnl
  }
}

/**
 * Calculate default price target
 */
function calculateDefaultTarget(action: 'BUY' | 'SELL', price: number): number {
  const targetPercent = 0.05 // 5%
  if (action === 'BUY') {
    return Math.round(price * (1 + targetPercent) * 100) / 100
  } else {
    return Math.round(price * (1 - targetPercent) * 100) / 100
  }
}

/**
 * Calculate default stop loss
 */
function calculateDefaultStopLoss(action: 'BUY' | 'SELL', price: number): number {
  const stopPercent = 0.03 // 3%
  if (action === 'BUY') {
    return Math.round(price * (1 - stopPercent) * 100) / 100
  } else {
    return Math.round(price * (1 + stopPercent) * 100) / 100
  }
}

/**
 * Calculate backtest metrics
 */
function calculateBacktestMetrics(
  trades: BacktestTrade[],
  config: BacktestConfig,
  maxDrawdown: number,
  equityCurve: BacktestEquityPoint[]
): BacktestMetrics {
  const completedTrades = trades.filter(t => t.outcome === 'win' || t.outcome === 'loss')
  const winningTrades = trades.filter(t => t.outcome === 'win')
  const losingTrades = trades.filter(t => t.outcome === 'loss')

  // Win rate
  const winRate = completedTrades.length > 0
    ? (winningTrades.length / completedTrades.length) * 100
    : 0

  // Average win/loss
  const avgWin = winningTrades.length > 0
    ? winningTrades.reduce((sum, t) => sum + t.profitLossPercent, 0) / winningTrades.length
    : 0

  const avgLoss = losingTrades.length > 0
    ? Math.abs(losingTrades.reduce((sum, t) => sum + t.profitLossPercent, 0) / losingTrades.length)
    : 0

  // Profit factor
  const grossProfit = winningTrades.reduce((sum, t) => sum + t.profitLossDollar, 0)
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.profitLossDollar, 0))
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0

  // Total return
  const finalEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : config.initialCapital
  const totalReturn = finalEquity - config.initialCapital
  const totalReturnPercent = (totalReturn / config.initialCapital) * 100

  // Annualized return
  const daysInBacktest = (config.endDate - config.startDate) / (24 * 60 * 60 * 1000)
  const yearsInBacktest = daysInBacktest / 365
  const annualizedReturn = yearsInBacktest > 0
    ? Math.pow(1 + totalReturnPercent / 100, 1 / yearsInBacktest) - 1
    : 0

  // Average holding days
  const avgHoldingDays = completedTrades.length > 0
    ? completedTrades.reduce((sum, t) => sum + t.daysHeld, 0) / completedTrades.length
    : 0

  // Sharpe ratio (simplified: assume 0% risk-free rate)
  const returns = calculateDailyReturns(equityCurve)
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0
  const stdDev = calculateStdDev(returns, avgReturn)
  const sharpeRatio = stdDev > 0 ? (avgReturn * Math.sqrt(252)) / stdDev : 0

  // Win/lose streaks
  const { longestWinStreak, longestLoseStreak } = calculateStreaks(trades)

  // Expectancy
  const lossRate = 100 - winRate
  const expectancy = (winRate / 100 * avgWin) - (lossRate / 100 * avgLoss)

  return {
    totalTrades: trades.length,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    winRate,
    avgWin,
    avgLoss,
    profitFactor,
    maxDrawdown,
    maxDrawdownPercent: maxDrawdown,
    sharpeRatio,
    avgHoldingDays,
    totalReturn,
    totalReturnPercent,
    annualizedReturn: annualizedReturn * 100,
    longestWinStreak,
    longestLoseStreak,
    expectancy
  }
}

/**
 * Calculate daily returns from equity curve
 */
function calculateDailyReturns(equityCurve: BacktestEquityPoint[]): number[] {
  const returns: number[] = []
  for (let i = 1; i < equityCurve.length; i++) {
    const dailyReturn = (equityCurve[i].equity - equityCurve[i - 1].equity) / equityCurve[i - 1].equity
    returns.push(dailyReturn)
  }
  return returns
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[], mean: number): number {
  if (values.length === 0) return 0
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length
  return Math.sqrt(avgSquaredDiff)
}

/**
 * Calculate win/loss streaks
 */
function calculateStreaks(trades: BacktestTrade[]): { longestWinStreak: number; longestLoseStreak: number } {
  let currentWinStreak = 0
  let currentLoseStreak = 0
  let longestWinStreak = 0
  let longestLoseStreak = 0

  for (const trade of trades) {
    if (trade.outcome === 'win') {
      currentWinStreak++
      currentLoseStreak = 0
      longestWinStreak = Math.max(longestWinStreak, currentWinStreak)
    } else if (trade.outcome === 'loss') {
      currentLoseStreak++
      currentWinStreak = 0
      longestLoseStreak = Math.max(longestLoseStreak, currentLoseStreak)
    }
  }

  return { longestWinStreak, longestLoseStreak }
}

/**
 * Find the index of the first candle at or after start date
 */
function findStartIndex(candles: CandleData[], startDate: number): number {
  const startTimeSec = startDate / 1000
  for (let i = INDICATOR_LOOKBACK; i < candles.length; i++) {
    if (candles[i].time >= startTimeSec) {
      return i
    }
  }
  return INDICATOR_LOOKBACK
}

/**
 * Check if a timestamp is a weekend
 */
function isWeekend(timestampSec: number): boolean {
  const date = new Date(timestampSec * 1000)
  const day = date.getDay()
  return day === 0 || day === 6
}

/**
 * Delay helper
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Get empty metrics object for failed backtests
 */
function getEmptyMetrics(): BacktestMetrics {
  return {
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: 0,
    maxDrawdown: 0,
    maxDrawdownPercent: 0,
    sharpeRatio: 0,
    avgHoldingDays: 0,
    totalReturn: 0,
    totalReturnPercent: 0,
    annualizedReturn: 0,
    longestWinStreak: 0,
    longestLoseStreak: 0,
    expectancy: 0
  }
}

/**
 * Estimate AI calls needed for a backtest
 */
export function estimateAICalls(config: BacktestConfig): number {
  const daysInRange = (config.endDate - config.startDate) / (24 * 60 * 60 * 1000)

  switch (config.timeframe) {
    case '1d':
      // ~252 trading days per year, estimate 70% of calendar days are trading days
      return Math.ceil(daysInRange * 0.7)
    case '1h':
      // ~6.5 market hours per day * 0.7 trading days
      return Math.ceil(daysInRange * 0.7 * 6.5)
    case '15m':
      // 26 15-min candles per trading day
      return Math.ceil(daysInRange * 0.7 * 26)
    default:
      return Math.ceil(daysInRange * 0.7)
  }
}
