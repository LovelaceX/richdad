/**
 * Intelligence Agent Types
 * Shared interfaces for all intel agents
 */

// Breaking news alert
export interface NewsAlert {
  id: string
  headline: string
  source: string
  timestamp: number
  symbol?: string
  sentiment: 'positive' | 'negative' | 'neutral'
  impactKeywords: string[]
  url?: string
}

// News Intelligence Report
export interface NewsIntelReport {
  timestamp: number
  // Sentiment counts
  bullishCount: number
  bearishCount: number
  neutralCount: number
  totalAnalyzed: number
  // Breaking alerts (< 1 hour old + high impact)
  breakingAlerts: NewsAlert[]
  // Symbol-specific sentiment
  symbolSentiment: Record<string, {
    sentiment: 'bullish' | 'bearish' | 'neutral' | 'mixed'
    bullishCount: number
    bearishCount: number
    neutralCount: number
    headlines: string[]
  }>
  // Velocity spikes (symbols with unusual news volume)
  velocitySpikes: {
    symbol: string
    articleCount: number
    normalAverage: number
    percentAboveNormal: number
  }[]
  // Top movers by sentiment
  topBullish: string[]
  topBearish: string[]
}

// Pattern Setup (detected pattern with context)
export interface PatternSetup {
  symbol: string
  pattern: string
  type: 'bullish' | 'bearish' | 'neutral'
  reliability: 'Low' | 'Medium' | 'High'
  reliabilityScore: number
  volumeConfirmed: boolean
  regimeAligned: boolean
  trendContext: 'with_trend' | 'against_trend' | 'neutral'
  priceAtDetection: number
  detectedAt: number
  notes: string
}

// Pattern Scanner Report
export interface PatternScanReport {
  timestamp: number
  scannedSymbols: number
  failedSymbols: string[]
  setupsFound: PatternSetup[]
  topBullishSetups: PatternSetup[]
  topBearishSetups: PatternSetup[]
  summary: {
    bullishCount: number
    bearishCount: number
    neutralCount: number
    highReliabilityCount: number
  }
}

// Earnings Watch Report (for future use)
export interface EarningsWatchReport {
  timestamp: number
  upcomingEarnings: {
    symbol: string
    date: string
    daysUntil: number
    estimatedEPS?: number
    actualEPS?: number
    surprise?: number
  }[]
  warnings: string[]
}

// Combined Intel Report
export interface IntelReport {
  timestamp: number
  news?: NewsIntelReport
  patterns?: PatternScanReport
  earnings?: EarningsWatchReport
}

// High-impact keywords for breaking news detection
export const HIGH_IMPACT_KEYWORDS = [
  // Fed/Policy
  'fed', 'federal reserve', 'rate hike', 'rate cut', 'interest rate',
  'fomc', 'powell', 'inflation', 'cpi', 'pce',
  // Market events
  'crash', 'surge', 'plunge', 'soar', 'tank', 'rally',
  'record high', 'record low', 'all-time', 'halt', 'suspended',
  // Corporate
  'earnings', 'beat', 'miss', 'guidance', 'outlook',
  'acquisition', 'merger', 'takeover', 'buyout',
  'layoff', 'restructur', 'bankrupt', 'default',
  'sec', 'investigation', 'fraud', 'lawsuit',
  // Geopolitical
  'war', 'tariff', 'sanction', 'china', 'russia',
  // Tech specific
  'ai ', 'artificial intelligence', 'chatgpt', 'nvidia', 'chip'
]

// Default velocity threshold (articles per hour to be considered a spike)
export const VELOCITY_SPIKE_THRESHOLD = 3
