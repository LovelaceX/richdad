/**
 * RichDad Constants
 * Static configuration values that don't change at runtime
 */

import type { Ticker } from '../types'

/**
 * Top 10 Most Traded US Stocks
 * Static list shown at top of Market Watch panel for all users
 * These cannot be removed by users (no delete button)
 */
export const TOP_10_TICKERS: Ticker[] = [
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', sector: 'Index' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', sector: 'Index' },
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology' },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer' },
  { symbol: 'META', name: 'Meta Platforms', sector: 'Technology' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology' },
]

/**
 * Symbol set for quick lookup (O(1) check)
 */
export const TOP_10_SYMBOLS = new Set(TOP_10_TICKERS.map(t => t.symbol))

/**
 * Check if a symbol is in the Top 10 list
 */
export function isTop10Symbol(symbol: string): boolean {
  return TOP_10_SYMBOLS.has(symbol.toUpperCase())
}
