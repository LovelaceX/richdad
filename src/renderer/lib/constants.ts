/**
 * RichDad Constants
 * Static configuration values that don't change at runtime
 */

import type { Ticker } from '../types'

/**
 * Default Top 10 - Used as fallback
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
 * Index-specific Top 10 constituents
 * Fallback data when API is unavailable
 * Weights are approximate and may change over time
 */
export const INDEX_CONSTITUENTS: Record<string, Ticker[]> = {
  // S&P 500 Top 10 by weight (as of Dec 2024)
  SPY: [
    { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology' },
    { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer' },
    { symbol: 'GOOGL', name: 'Alphabet Inc. (Class A)', sector: 'Technology' },
    { symbol: 'META', name: 'Meta Platforms', sector: 'Technology' },
    { symbol: 'AVGO', name: 'Broadcom Inc.', sector: 'Technology' },
    { symbol: 'GOOG', name: 'Alphabet Inc. (Class C)', sector: 'Technology' },
    { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive' },
    { symbol: 'BRK.B', name: 'Berkshire Hathaway', sector: 'Financials' },
  ],

  // NASDAQ-100 Top 10 by weight
  QQQ: [
    { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology' },
    { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer' },
    { symbol: 'META', name: 'Meta Platforms', sector: 'Technology' },
    { symbol: 'AVGO', name: 'Broadcom Inc.', sector: 'Technology' },
    { symbol: 'GOOGL', name: 'Alphabet Inc. (Class A)', sector: 'Technology' },
    { symbol: 'GOOG', name: 'Alphabet Inc. (Class C)', sector: 'Technology' },
    { symbol: 'COST', name: 'Costco Wholesale', sector: 'Consumer' },
    { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive' },
  ],

  // Dow Jones Industrial Average Top 10 by weight
  DIA: [
    { symbol: 'UNH', name: 'UnitedHealth Group', sector: 'Healthcare' },
    { symbol: 'GS', name: 'Goldman Sachs', sector: 'Financials' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology' },
    { symbol: 'HD', name: 'Home Depot', sector: 'Consumer' },
    { symbol: 'CAT', name: 'Caterpillar Inc.', sector: 'Industrials' },
    { symbol: 'AMGN', name: 'Amgen Inc.', sector: 'Healthcare' },
    { symbol: 'MCD', name: "McDonald's Corp.", sector: 'Consumer' },
    { symbol: 'V', name: 'Visa Inc.', sector: 'Financials' },
    { symbol: 'CRM', name: 'Salesforce Inc.', sector: 'Technology' },
    { symbol: 'TRV', name: 'Travelers Companies', sector: 'Financials' },
  ],

  // Russell 2000 Top 10 (smaller caps, higher volatility)
  IWM: [
    { symbol: 'SMCI', name: 'Super Micro Computer', sector: 'Technology' },
    { symbol: 'CELH', name: 'Celsius Holdings', sector: 'Consumer' },
    { symbol: 'INSM', name: 'Insmed Inc.', sector: 'Healthcare' },
    { symbol: 'FN', name: 'Fabrinet', sector: 'Technology' },
    { symbol: 'DUOL', name: 'Duolingo Inc.', sector: 'Technology' },
    { symbol: 'CVNA', name: 'Carvana Co.', sector: 'Consumer' },
    { symbol: 'RVMD', name: 'Revolution Medicines', sector: 'Healthcare' },
    { symbol: 'DOCS', name: 'Doximity Inc.', sector: 'Healthcare' },
    { symbol: 'MTDR', name: 'Matador Resources', sector: 'Energy' },
    { symbol: 'ALKT', name: 'Alkami Technology', sector: 'Technology' },
  ],

  // Vanguard Total Stock Market - same mega-caps dominate total market
  VTI: [
    { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology' },
    { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer' },
    { symbol: 'GOOGL', name: 'Alphabet Inc. (Class A)', sector: 'Technology' },
    { symbol: 'META', name: 'Meta Platforms', sector: 'Technology' },
    { symbol: 'AVGO', name: 'Broadcom Inc.', sector: 'Technology' },
    { symbol: 'GOOG', name: 'Alphabet Inc. (Class C)', sector: 'Technology' },
    { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive' },
    { symbol: 'BRK.B', name: 'Berkshire Hathaway', sector: 'Financials' },
  ],

  // VanEck Semiconductor ETF Top 10 by weight
  SMH: [
    { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Semiconductors' },
    { symbol: 'TSM', name: 'Taiwan Semiconductor', sector: 'Semiconductors' },
    { symbol: 'AVGO', name: 'Broadcom Inc.', sector: 'Semiconductors' },
    { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Semiconductors' },
    { symbol: 'ASML', name: 'ASML Holding', sector: 'Semiconductors' },
    { symbol: 'QCOM', name: 'Qualcomm Inc.', sector: 'Semiconductors' },
    { symbol: 'TXN', name: 'Texas Instruments', sector: 'Semiconductors' },
    { symbol: 'AMAT', name: 'Applied Materials', sector: 'Semiconductors' },
    { symbol: 'LRCX', name: 'Lam Research', sector: 'Semiconductors' },
    { symbol: 'MU', name: 'Micron Technology', sector: 'Semiconductors' },
  ],

  // VXX tracks VIX futures - show related volatility products instead
  VXX: [
    { symbol: 'VXX', name: 'iPath VIX Short-Term', sector: 'Volatility' },
    { symbol: 'UVXY', name: 'ProShares Ultra VIX', sector: 'Volatility' },
    { symbol: 'SVXY', name: 'ProShares Short VIX', sector: 'Volatility' },
    { symbol: 'VIXY', name: 'ProShares VIX Short-Term', sector: 'Volatility' },
    { symbol: 'VIXM', name: 'ProShares VIX Mid-Term', sector: 'Volatility' },
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF', sector: 'Index' },
    { symbol: 'QQQ', name: 'Invesco QQQ Trust', sector: 'Index' },
    { symbol: 'IWM', name: 'iShares Russell 2000', sector: 'Index' },
    { symbol: 'GLD', name: 'SPDR Gold Shares', sector: 'Commodities' },
    { symbol: 'TLT', name: 'iShares 20+ Year Treasury', sector: 'Bonds' },
  ],
}

/**
 * Get Top 10 constituents for a given index ETF
 */
export function getIndexConstituents(indexEtf: string): Ticker[] {
  return INDEX_CONSTITUENTS[indexEtf] || TOP_10_TICKERS
}

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
