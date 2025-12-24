export interface Ticker {
  symbol: string
  name: string
  sector: string
}

export interface Quote {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  high: number
  low: number
  open: number
  previousClose: number
  timestamp: number
  // Cache metadata - helps UI show data freshness
  cacheAge?: number        // How old is this data in ms (0 = fresh from API)
  dataSource?: 'api' | 'cache' | 'stale' | 'mock'  // Where the data came from
  isFresh?: boolean        // Quick check: is this recent enough for trading?
}

export interface CandleData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface NewsItem {
  id: string
  headline: string
  source: string
  url?: string
  timestamp: number
  ticker?: string
  tickers?: string[]
  sentiment?: 'positive' | 'negative' | 'neutral'
  summary?: string
  imageUrl?: string
}

export interface AIRecommendation {
  id: string
  ticker: string
  action: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
  rationale: string
  sources: { title: string; url: string }[]
  timestamp: number
  priceTarget?: number
  stopLoss?: number
  // Position sizing (based on user risk settings)
  suggestedShares?: number
  suggestedDollarAmount?: number
}

export interface AIMessage {
  id: string
  type: 'recommendation' | 'analysis' | 'alert' | 'info' | 'chat'
  role?: 'user' | 'assistant'
  content: string
  timestamp: number
  ticker?: string
}

export interface WatchlistItem extends Ticker {
  quote?: Quote  // Optional - undefined until real data is fetched
  inAlert?: boolean
}

// Market Index
export interface MarketIndex {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
}

// Page types
export type PageId = 'dashboard' | 'news' | 'backtest' | 'settings'

// Tone types (deprecated - kept for migration)
export type ToneType = 'conservative' | 'aggressive' | 'humorous' | 'professional'

// Persona types for AI Copilot character
export type PersonaType = 'sterling' | 'jax' | 'cipher' | 'kai'

// Sound types
export type SoundType = 'buy' | 'sell' | 'hold' | 'alert'

// Extended NewsItem with summary for hover preview
export interface NewsItemExtended extends NewsItem {
  summary?: string
  url?: string
  imageUrl?: string
}

// AI Analysis Phase tracking
export interface AnalysisPhase {
  id: string
  label: string
  status: 'pending' | 'active' | 'complete' | 'error'
  result?: string // Brief result text (e.g., "ELEVATED_VOL_BULLISH", "$595.42")
}

export interface AnalysisProgress {
  ticker: string
  phases: AnalysisPhase[]
  startedAt: number
}

// Morning Briefing types
export interface BriefingResult {
  ticker: string
  recommendation: AIRecommendation | null
  error?: string
}

export interface MorningBriefing {
  generatedAt: number
  results: BriefingResult[]
  summary: {
    total: number
    buy: number
    sell: number
    hold: number
    failed: number
  }
}

// Backtest types
export interface BacktestConfig {
  id: string
  symbol: string
  startDate: number  // Unix timestamp
  endDate: number    // Unix timestamp
  timeframe: '1d' | '1h' | '15m'
  initialCapital: number
  positionSizePercent: number
  confidenceThreshold: number
  maxConcurrentTrades: number
  includeNews: boolean
}

export interface BacktestTrade {
  id: string
  entryDate: number
  exitDate: number | null
  symbol: string
  action: 'BUY' | 'SELL'
  entryPrice: number
  exitPrice: number | null
  priceTarget: number
  stopLoss: number
  confidence: number
  rationale: string
  outcome: 'win' | 'loss' | 'pending' | 'expired'
  profitLossPercent: number
  profitLossDollar: number
  daysHeld: number
  patterns?: string[]  // Candlestick patterns detected at entry
  regime?: string      // Market regime at entry
}

export interface BacktestMetrics {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  avgWin: number
  avgLoss: number
  profitFactor: number
  maxDrawdown: number
  maxDrawdownPercent: number
  sharpeRatio: number
  avgHoldingDays: number
  totalReturn: number
  totalReturnPercent: number
  annualizedReturn: number
  longestWinStreak: number
  longestLoseStreak: number
  expectancy: number  // (winRate * avgWin) - (lossRate * avgLoss)
}

export interface BacktestEquityPoint {
  date: number
  equity: number
  drawdown: number
}

export interface BacktestResult {
  id: string
  config: BacktestConfig
  trades: BacktestTrade[]
  metrics: BacktestMetrics
  equityCurve: BacktestEquityPoint[]
  errors: string[]
  completedAt: number
  duration: number  // Time taken to run backtest in ms
}

export interface BacktestInsights {
  bestPatterns: { pattern: string; winRate: number; count: number }[]
  worstPatterns: { pattern: string; winRate: number; count: number }[]
  bestDayOfWeek: { day: string; winRate: number; count: number }
  performanceByRegime: { regime: string; winRate: number; count: number; avgReturn: number }[]
  confidenceCorrelation: number
  optimalConfidenceThreshold: number
  suggestions: string[]
}

export type BacktestPhase = 'idle' | 'fetching_data' | 'running_simulation' | 'analyzing' | 'complete' | 'error' | 'cancelled'

// Electron API types
declare global {
  interface Window {
    electronAPI: {
      minimize: () => void
      maximize: () => void
      close: () => void
      isMaximized: () => Promise<boolean>
      onMaximizeChange: (callback: (isMaximized: boolean) => void) => void
    }
  }
}
