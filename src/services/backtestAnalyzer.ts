/**
 * Backtest Analyzer
 * Analyzes backtest results and generates insights for optimization
 */

import type { BacktestResult, BacktestTrade, BacktestInsights } from '../renderer/types'

/**
 * Analyze backtest results and generate insights
 */
export function analyzeBacktestResults(result: BacktestResult): BacktestInsights {
  const { trades } = result

  // Pattern analysis (placeholder - would need patterns stored in trades)
  const patternAnalysis = analyzePatterns(trades)

  // Day of week analysis
  const dayOfWeekAnalysis = analyzeDayOfWeek(trades)

  // Confidence analysis
  const confidenceAnalysis = analyzeConfidence(trades)

  // Generate optimization suggestions
  const suggestions = generateOptimizationSuggestions(result)

  return {
    bestPatterns: patternAnalysis.best,
    worstPatterns: patternAnalysis.worst,
    bestDayOfWeek: dayOfWeekAnalysis,
    performanceByRegime: [], // Would need regime data stored in trades
    confidenceCorrelation: confidenceAnalysis.correlation,
    optimalConfidenceThreshold: confidenceAnalysis.optimalThreshold,
    suggestions
  }
}

/**
 * Analyze performance by candlestick patterns
 */
function analyzePatterns(trades: BacktestTrade[]): {
  best: { pattern: string; winRate: number; count: number }[]
  worst: { pattern: string; winRate: number; count: number }[]
} {
  // Group trades by patterns
  const patternStats: Map<string, { wins: number; total: number }> = new Map()

  for (const trade of trades) {
    const patterns = trade.patterns || []
    for (const pattern of patterns) {
      const stats = patternStats.get(pattern) || { wins: 0, total: 0 }
      stats.total++
      if (trade.outcome === 'win') {
        stats.wins++
      }
      patternStats.set(pattern, stats)
    }
  }

  // Calculate win rates and sort
  const patternResults = Array.from(patternStats.entries())
    .filter(([_, stats]) => stats.total >= 3) // Minimum sample size
    .map(([pattern, stats]) => ({
      pattern,
      winRate: (stats.wins / stats.total) * 100,
      count: stats.total
    }))
    .sort((a, b) => b.winRate - a.winRate)

  return {
    best: patternResults.slice(0, 5),
    worst: patternResults.slice(-5).reverse()
  }
}

/**
 * Analyze performance by day of week
 */
function analyzeDayOfWeek(trades: BacktestTrade[]): { day: string; winRate: number; count: number } {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const dayStats: { wins: number; total: number }[] = Array(7).fill(null).map(() => ({ wins: 0, total: 0 }))

  for (const trade of trades) {
    const date = new Date(trade.entryDate * 1000)
    const dayIndex = date.getDay()
    dayStats[dayIndex].total++
    if (trade.outcome === 'win') {
      dayStats[dayIndex].wins++
    }
  }

  // Find best day
  let bestDay = { day: 'N/A', winRate: 0, count: 0 }

  for (let i = 0; i < 7; i++) {
    const stats = dayStats[i]
    if (stats.total >= 3) { // Minimum sample size
      const winRate = (stats.wins / stats.total) * 100
      if (winRate > bestDay.winRate) {
        bestDay = {
          day: dayNames[i],
          winRate,
          count: stats.total
        }
      }
    }
  }

  return bestDay
}

/**
 * Analyze confidence correlation with outcomes
 */
function analyzeConfidence(trades: BacktestTrade[]): {
  correlation: number
  optimalThreshold: number
} {
  if (trades.length === 0) {
    return { correlation: 0, optimalThreshold: 70 }
  }

  // Calculate correlation between confidence and outcome
  const completedTrades = trades.filter(t => t.outcome === 'win' || t.outcome === 'loss')

  if (completedTrades.length < 5) {
    return { correlation: 0, optimalThreshold: 70 }
  }

  // Simple correlation: do higher confidence trades win more?
  const highConfTrades = completedTrades.filter(t => t.confidence >= 80)
  const lowConfTrades = completedTrades.filter(t => t.confidence < 70)

  const highConfWinRate = highConfTrades.length > 0
    ? highConfTrades.filter(t => t.outcome === 'win').length / highConfTrades.length
    : 0
  const lowConfWinRate = lowConfTrades.length > 0
    ? lowConfTrades.filter(t => t.outcome === 'win').length / lowConfTrades.length
    : 0

  // If high confidence trades win more than low confidence, positive correlation
  const correlation = (highConfWinRate - lowConfWinRate) / 2 + 0.5 // Normalize to 0-1

  // Find optimal threshold by testing different values
  let optimalThreshold = 70
  let bestProfitFactor = 0

  for (let threshold = 50; threshold <= 90; threshold += 5) {
    const filteredTrades = completedTrades.filter(t => t.confidence >= threshold)
    if (filteredTrades.length < 3) continue

    const wins = filteredTrades.filter(t => t.outcome === 'win')
    const losses = filteredTrades.filter(t => t.outcome === 'loss')

    const grossProfit = wins.reduce((sum, t) => sum + t.profitLossPercent, 0)
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.profitLossPercent, 0))

    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0

    if (profitFactor > bestProfitFactor && filteredTrades.length >= 5) {
      bestProfitFactor = profitFactor
      optimalThreshold = threshold
    }
  }

  return { correlation, optimalThreshold }
}

/**
 * Generate optimization suggestions based on backtest results
 */
function generateOptimizationSuggestions(result: BacktestResult): string[] {
  const { metrics, trades, config } = result
  const suggestions: string[] = []

  // Low win rate
  if (metrics.winRate < 45) {
    suggestions.push('Win rate is below 45%. Consider increasing the confidence threshold to filter out weak signals.')
  } else if (metrics.winRate < 55) {
    suggestions.push('Win rate is moderate. Fine-tuning the confidence threshold may improve results.')
  }

  // Poor profit factor
  if (metrics.profitFactor < 1.0) {
    suggestions.push('Profit factor is below 1.0 (losing money overall). Review price target and stop loss levels.')
  } else if (metrics.profitFactor < 1.5) {
    suggestions.push('Profit factor is weak. Consider widening price targets or tightening stop losses.')
  }

  // High drawdown
  if (metrics.maxDrawdownPercent > 25) {
    suggestions.push('Maximum drawdown exceeds 25%. Consider reducing position size to limit risk.')
  } else if (metrics.maxDrawdownPercent > 15) {
    suggestions.push('Drawdown is elevated. Consider adding position sizing rules based on market volatility.')
  }

  // Low number of trades
  if (trades.length < 10) {
    suggestions.push('Very few trades generated. Consider lowering the confidence threshold or extending the backtest period.')
  }

  // Average win vs loss analysis
  if (metrics.avgLoss > metrics.avgWin) {
    suggestions.push('Average loss exceeds average win. Tighten stop losses or widen price targets.')
  }

  // Sharpe ratio
  if (metrics.sharpeRatio < 0.5) {
    suggestions.push('Risk-adjusted returns are poor (Sharpe < 0.5). The strategy may not be suitable for this market.')
  } else if (metrics.sharpeRatio >= 1.5) {
    suggestions.push('Strong risk-adjusted returns (Sharpe > 1.5). Consider increasing position size gradually.')
  }

  // Holding period
  if (metrics.avgHoldingDays > 10) {
    suggestions.push('Long average holding period. Consider using tighter targets for faster exits.')
  } else if (metrics.avgHoldingDays < 1) {
    suggestions.push('Very short holding period. Ensure this aligns with your trading style and costs.')
  }

  // Streak analysis
  if (metrics.longestLoseStreak >= 5) {
    suggestions.push(`Experienced ${metrics.longestLoseStreak}-trade losing streak. Consider adding circuit breakers or pause rules.`)
  }

  // Position size
  if (config.positionSizePercent > 20) {
    suggestions.push('Large position size (>20%). Consider reducing to limit per-trade risk.')
  }

  // No suggestions = good performance
  if (suggestions.length === 0) {
    if (metrics.winRate >= 60 && metrics.profitFactor >= 2.0) {
      suggestions.push('Excellent performance! Consider live trading with small position sizes to validate.')
    } else {
      suggestions.push('Solid results. Continue monitoring and consider extending the backtest period for more data.')
    }
  }

  return suggestions
}

/**
 * Calculate additional statistics for a trade set
 */
export function calculateDetailedStats(trades: BacktestTrade[]) {
  const completed = trades.filter(t => t.outcome === 'win' || t.outcome === 'loss')
  const buys = completed.filter(t => t.action === 'BUY')
  const sells = completed.filter(t => t.action === 'SELL')

  return {
    buyStats: {
      count: buys.length,
      winRate: buys.length > 0
        ? (buys.filter(t => t.outcome === 'win').length / buys.length) * 100
        : 0,
      avgReturn: buys.length > 0
        ? buys.reduce((sum, t) => sum + t.profitLossPercent, 0) / buys.length
        : 0
    },
    sellStats: {
      count: sells.length,
      winRate: sells.length > 0
        ? (sells.filter(t => t.outcome === 'win').length / sells.length) * 100
        : 0,
      avgReturn: sells.length > 0
        ? sells.reduce((sum, t) => sum + t.profitLossPercent, 0) / sells.length
        : 0
    },
    confidenceDistribution: {
      high: completed.filter(t => t.confidence >= 80).length,
      medium: completed.filter(t => t.confidence >= 70 && t.confidence < 80).length,
      low: completed.filter(t => t.confidence < 70).length
    }
  }
}

/**
 * Export backtest results to CSV format
 */
export function exportToCSV(result: BacktestResult): string {
  const headers = [
    'Entry Date',
    'Exit Date',
    'Symbol',
    'Action',
    'Entry Price',
    'Exit Price',
    'Price Target',
    'Stop Loss',
    'Confidence',
    'Outcome',
    'P&L %',
    'P&L $',
    'Days Held',
    'Rationale'
  ]

  const rows = result.trades.map(trade => [
    new Date(trade.entryDate * 1000).toISOString().split('T')[0],
    trade.exitDate ? new Date(trade.exitDate * 1000).toISOString().split('T')[0] : 'Open',
    trade.symbol,
    trade.action,
    trade.entryPrice.toFixed(2),
    trade.exitPrice?.toFixed(2) || 'N/A',
    trade.priceTarget.toFixed(2),
    trade.stopLoss.toFixed(2),
    trade.confidence.toString(),
    trade.outcome,
    trade.profitLossPercent.toFixed(2),
    trade.profitLossDollar.toFixed(2),
    trade.daysHeld.toFixed(1),
    `"${trade.rationale.replace(/"/g, '""')}"` // Escape quotes in rationale
  ])

  return [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n')
}

/**
 * Generate a text summary of backtest results
 */
export function generateSummaryText(result: BacktestResult): string {
  const { config, metrics } = result

  return `
BACKTEST SUMMARY
================
Symbol: ${config.symbol}
Period: ${new Date(config.startDate).toLocaleDateString()} - ${new Date(config.endDate).toLocaleDateString()}
Timeframe: ${config.timeframe}
Initial Capital: $${config.initialCapital.toLocaleString()}

PERFORMANCE METRICS
-------------------
Total Trades: ${metrics.totalTrades}
Win Rate: ${metrics.winRate.toFixed(1)}%
Profit Factor: ${metrics.profitFactor.toFixed(2)}
Total Return: ${metrics.totalReturnPercent >= 0 ? '+' : ''}${metrics.totalReturnPercent.toFixed(2)}%
Max Drawdown: ${metrics.maxDrawdownPercent.toFixed(1)}%
Sharpe Ratio: ${metrics.sharpeRatio.toFixed(2)}

TRADE BREAKDOWN
---------------
Winning Trades: ${metrics.winningTrades}
Losing Trades: ${metrics.losingTrades}
Average Win: +${metrics.avgWin.toFixed(2)}%
Average Loss: -${metrics.avgLoss.toFixed(2)}%
Avg Holding Days: ${metrics.avgHoldingDays.toFixed(1)}

STREAKS
-------
Longest Win Streak: ${metrics.longestWinStreak}
Longest Lose Streak: ${metrics.longestLoseStreak}
Expectancy: ${metrics.expectancy >= 0 ? '+' : ''}${metrics.expectancy.toFixed(2)}%
`.trim()
}
