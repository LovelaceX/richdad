import Dexie, { type EntityTable } from 'dexie'

// Database interfaces
export interface TradeDecision {
  id?: number
  timestamp: number
  symbol: string
  action: 'BUY' | 'SELL' | 'HOLD'
  decision: 'execute' | 'skip'
  confidence: number
  rationale: string
  priceAtDecision?: number
  source?: 'local_llm' | 'cloud_ai' | 'manual'  // Track verdict origin

  // Manual trade fields (for human-triggered trades)
  shares?: number        // Number of shares traded
  dollarAmount?: number  // Dollar amount invested/sold

  // Outcome Tracking (for AI accuracy metrics)
  priceTarget?: number
  stopLoss?: number
  outcomeCheckedAt?: number  // Last time we checked for outcome
  outcome?: 'win' | 'loss' | 'pending' | 'neutral'  // neutral for HOLD or expired
  priceAtOutcome?: number  // Price when outcome was determined
  profitLoss?: number  // Percentage gain/loss
  daysHeld?: number  // Days between decision and outcome
}

export interface UserSettings {
  id?: number
  tone: 'conservative' | 'aggressive' | 'humorous' | 'professional'
  dailyBudget: number
  dailyLossLimit: number
  positionSizeLimit: number
  lookbackDays: number
  soundEnabled: boolean
  soundVolume: number
  sounds: {
    buy: string
    sell: string
    hold: string
    alert: string
    analysis: string
    tradeExecuted: string
    breakingNews: string
  }
  screenReadingEnabled: boolean
  cvdMode: boolean

  // Sound Triggers
  soundMinConfidence: number       // 0-100, default 0 (all alerts)
  soundOnBuy: boolean              // Enable BUY sounds
  soundOnSell: boolean             // Enable SELL sounds
  soundOnHold: boolean             // Enable HOLD sounds
  soundOnAnalysis: boolean         // Enable analysis alerts
  soundCooldown: number            // Milliseconds between sounds (0 = no cooldown)
  lastSoundPlayed: number          // Timestamp of last sound

  // Data Sources
  marketDataProvider: 'alphavantage' | 'polygon' | 'finnhub'
  alphaVantageApiKey?: string
  polygonApiKey?: string
  useAlphaVantageForNews?: boolean
  finnhubApiKey?: string

  // Onboarding
  hasCompletedOnboarding?: boolean

  // Performance
  performanceMode: boolean

  // News Ticker
  tickerSpeed: 'slow' | 'normal' | 'fast'
}

export interface NewsSource {
  id?: number
  name: string
  url: string
  type: 'rss' | 'api'
  enabled: boolean
  category: string
}

export interface ProTrader {
  id?: number
  name: string
  handle: string
  source: 'rss' | 'stocktwits'
  feedUrl?: string
  enabled: boolean
  addedAt: number
}

export interface PriceAlert {
  id?: number
  symbol: string
  condition: 'above' | 'below' | 'percent_up' | 'percent_down'
  value: number
  triggered: boolean
  triggeredAt?: number
  createdAt: number
}

export interface PnLEntry {
  id?: number
  date: number
  realized: number
  unrealized?: number
  notes?: string
}

// Watchlist entry for user-added symbols (persisted to IndexedDB)
export interface WatchlistEntry {
  id?: number
  symbol: string
  name?: string
  sector?: string
  addedAt: number
}

export interface UserProfile {
  id?: number
  username: string
  displayName: string
  avatarUrl?: string
  xHandle?: string
  portfolioSize?: number
  tradingPlatforms: string[]
}

export type AIProvider = 'openai' | 'claude' | 'gemini' | 'grok' | 'deepseek' | 'llama'

export type RecommendationFormat = 'standard' | 'concise' | 'detailed'

// Individual provider configuration for multi-provider support
export interface AIProviderConfig {
  provider: AIProvider
  apiKey: string
  model?: string
  enabled: boolean
  priority: number  // 1 = primary, 2 = first fallback, etc.
}

export interface AISettings {
  id?: number
  // Legacy single-provider fields (kept for backward compatibility)
  provider: AIProvider
  apiKey: string
  model?: string
  // Multi-provider support
  providers?: AIProviderConfig[]  // Array of configured providers with priority
  // Other settings
  recommendationFormat?: RecommendationFormat
  recommendationInterval?: 5 | 10 | 15  // minutes, default: 15
  confidenceThreshold?: number  // 0-100, default: 70
  aiDailyCallLimit?: number  // 5-100, default: 15 (free tier protection)
}

export const AI_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    models: ['gpt-4.0-turbo', 'gpt-4.0', 'gpt-4-turbo-preview', 'gpt-3.5-turbo'],
    keyPlaceholder: 'sk-...',
    instructions: 'Get your API key from platform.openai.com/api-keys',
    endpoint: 'https://api.openai.com/v1/chat/completions'
  },
  claude: {
    name: 'Claude (Anthropic)',
    models: ['claude-opus-4-5-20251101', 'claude-sonnet-4-5-20250929', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
    keyPlaceholder: 'sk-ant-...',
    instructions: 'Get your API key from console.anthropic.com',
    endpoint: 'https://api.anthropic.com/v1/messages'
  },
  gemini: {
    name: 'Gemini (Google)',
    models: ['gemini-2.0-flash-exp', 'gemini-1.5-pro-002', 'gemini-1.5-flash-002'],
    keyPlaceholder: 'AI...',
    instructions: 'Get your API key from aistudio.google.com/app/apikey',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models'
  },
  grok: {
    name: 'Grok (xAI)',
    models: ['grok-2-1212', 'grok-2-vision-1212', 'grok-beta'],
    keyPlaceholder: 'xai-...',
    instructions: 'Get your API key from console.x.ai',
    endpoint: 'https://api.x.ai/v1/chat/completions'
  },
  deepseek: {
    name: 'DeepSeek',
    models: ['deepseek-chat', 'deepseek-coder'],
    keyPlaceholder: 'sk-...',
    instructions: 'Get your API key from platform.deepseek.com',
    endpoint: 'https://api.deepseek.com/v1/chat/completions'
  },
  llama: {
    name: 'Meta Llama',
    models: ['llama-3.3-70b-versatile', 'llama-3.2-90b-text-preview', 'llama-3.1-70b-versatile', 'llama-3.1-8b-instant'],
    keyPlaceholder: 'gsk_...',
    instructions: 'Get your API key from console.groq.com (Llama via Groq)',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions'
  }
} as const

export const DEFAULT_PROFILE: UserProfile = {
  username: '',
  displayName: 'Trader',
  tradingPlatforms: []
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4.0-turbo',
  recommendationInterval: 15,
  confidenceThreshold: 70,
  aiDailyCallLimit: 15  // Conservative default for free tier protection
}

// Database class
class DadAppDatabase extends Dexie {
  tradeDecisions!: EntityTable<TradeDecision, 'id'>
  userSettings!: EntityTable<UserSettings, 'id'>
  newsSources!: EntityTable<NewsSource, 'id'>
  proTraders!: EntityTable<ProTrader, 'id'>
  priceAlerts!: EntityTable<PriceAlert, 'id'>
  pnlEntries!: EntityTable<PnLEntry, 'id'>
  userProfile!: EntityTable<UserProfile, 'id'>
  aiSettings!: EntityTable<AISettings, 'id'>
  watchlist!: EntityTable<WatchlistEntry, 'id'>

  constructor() {
    super('dadapp')

    this.version(1).stores({
      tradeDecisions: '++id, timestamp, symbol, action, decision',
      userSettings: '++id',
      newsSources: '++id, name, type, enabled, category',
      proTraders: '++id, handle, source, enabled',
      priceAlerts: '++id, symbol, triggered, createdAt',
      pnlEntries: '++id, date'
    })

    this.version(2).stores({
      tradeDecisions: '++id, timestamp, symbol, action, decision',
      userSettings: '++id',
      newsSources: '++id, name, type, enabled, category',
      proTraders: '++id, handle, source, enabled',
      priceAlerts: '++id, symbol, triggered, createdAt',
      pnlEntries: '++id, date',
      userProfile: '++id',
      aiSettings: '++id, provider'
    })

    this.version(3).stores({
      tradeDecisions: '++id, timestamp, symbol, action, decision, source',
      userSettings: '++id',
      newsSources: '++id, name, type, enabled, category',
      proTraders: '++id, handle, source, enabled',
      priceAlerts: '++id, symbol, triggered, createdAt',
      pnlEntries: '++id, date',
      userProfile: '++id',
      aiSettings: '++id, provider'
    })

    this.version(4).stores({
      tradeDecisions: '++id, timestamp, symbol, action, decision, source, outcome',
      userSettings: '++id',
      newsSources: '++id, name, type, enabled, category',
      proTraders: '++id, handle, source, enabled',
      priceAlerts: '++id, symbol, triggered, createdAt',
      pnlEntries: '++id, date',
      userProfile: '++id',
      aiSettings: '++id, provider'
    }).upgrade(async tx => {
      const aiSettings = await tx.table('aiSettings').toArray()

      for (const setting of aiSettings) {
        await tx.table('aiSettings').update(setting.id!, {
          recommendationInterval: setting.recommendationInterval ?? 15,
          confidenceThreshold: setting.confidenceThreshold ?? 70
        })
      }

      console.log('[DB Migration v4] Added AI customization settings')
    })

    // v5: Add watchlist table for user-added symbols persistence
    this.version(5).stores({
      tradeDecisions: '++id, timestamp, symbol, action, decision, source, outcome',
      userSettings: '++id',
      newsSources: '++id, name, type, enabled, category',
      proTraders: '++id, handle, source, enabled',
      priceAlerts: '++id, symbol, triggered, createdAt',
      pnlEntries: '++id, date',
      userProfile: '++id',
      aiSettings: '++id, provider',
      watchlist: '++id, symbol, addedAt'
    })
  }
}

export const db = new DadAppDatabase()

// Default settings
export const DEFAULT_SETTINGS: UserSettings = {
  tone: 'professional',
  dailyBudget: 1000,
  dailyLossLimit: 2,
  positionSizeLimit: 5,
  lookbackDays: 90,
  soundEnabled: true,
  soundVolume: 70,
  sounds: {
    buy: 'buy-now-male',
    sell: 'sell-it-male',
    hold: 'hold-fort-male',
    alert: 'messenger',
    analysis: 'bongo',
    tradeExecuted: 'kaching',
    breakingNews: 'kim-possible'
  },
  screenReadingEnabled: false,
  cvdMode: false,

  // Sound Triggers
  soundMinConfidence: 0,      // Play all alerts by default
  soundOnBuy: true,
  soundOnSell: true,
  soundOnHold: true,
  soundOnAnalysis: true,
  soundCooldown: 0,           // No cooldown by default
  lastSoundPlayed: 0,

  // Data Sources
  marketDataProvider: 'polygon',  // Polygon recommended: unlimited calls
  alphaVantageApiKey: undefined,
  polygonApiKey: undefined,
  useAlphaVantageForNews: false,
  finnhubApiKey: undefined,

  // Onboarding
  hasCompletedOnboarding: undefined,

  // Performance
  performanceMode: false,

  // News Ticker
  tickerSpeed: 'normal'
}

// Default news sources
export const DEFAULT_NEWS_SOURCES: Omit<NewsSource, 'id'>[] = [
  // NASDAQ
  { name: 'NASDAQ Stocks', url: 'https://www.nasdaq.com/feed/rssoutbound?category=Stocks', type: 'rss', enabled: true, category: 'Stock Market' },

  // TradingView
  { name: 'TradingView', url: 'https://www.tradingview.com/feed/', type: 'rss', enabled: true, category: 'Stock Market' },

  // Barchart
  { name: 'Barchart', url: 'https://www.barchart.com/news/authors/rss', type: 'rss', enabled: true, category: 'Stock Market' },

  // Federal Reserve
  { name: 'Federal Reserve Press Releases', url: 'https://www.federalreserve.gov/feeds/press_all.xml', type: 'rss', enabled: true, category: 'Economic Policy' },

  // MarketWatch
  { name: 'MarketWatch Top Stories', url: 'https://feeds.content.dowjones.io/public/rss/mw_topstories', type: 'rss', enabled: true, category: 'Financial News' },
  { name: 'MarketWatch Real-time Headlines', url: 'https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines', type: 'rss', enabled: true, category: 'Financial News' },
  { name: 'MarketWatch Breaking Bulletins', url: 'https://feeds.content.dowjones.io/public/rss/mw_bulletins', type: 'rss', enabled: true, category: 'Financial News' },

  // Investing.com
  { name: 'Investing.com Analysis & Opinion', url: 'https://www.investing.com/rss/stock.rss', type: 'rss', enabled: true, category: 'Analysis' },
  { name: 'Investing.com Stock News', url: 'https://www.investing.com/rss/news_25.rss', type: 'rss', enabled: true, category: 'Stock Market' },
  { name: 'Investing.com Investment Ideas', url: 'https://www.investing.com/rss/news_1065.rss', type: 'rss', enabled: false, category: 'Analysis' },

  // Wall Street Journal
  { name: 'WSJ Markets News', url: 'https://feeds.content.dowjones.io/public/rss/RSSMarketsMain', type: 'rss', enabled: true, category: 'Financial News' },
  { name: 'WSJ US Business', url: 'https://feeds.content.dowjones.io/public/rss/WSJcomUSBusiness', type: 'rss', enabled: true, category: 'Business' },

  // CNBC
  { name: 'CNBC News', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114', type: 'rss', enabled: true, category: 'Financial News' },

  // Seeking Alpha
  { name: 'Seeking Alpha', url: 'https://seekingalpha.com/feed.xml', type: 'rss', enabled: true, category: 'Analysis' },

  // Alpha Street
  { name: 'Alpha Street', url: 'https://news.alphastreet.com/feed/', type: 'rss', enabled: true, category: 'Financial News' },

  // Raging Bull
  { name: 'Raging Bull', url: 'https://ragingbull.com/feed/', type: 'rss', enabled: false, category: 'Trading' },

  // Ino
  { name: 'Ino Blog', url: 'https://www.ino.com/blog/feed/', type: 'rss', enabled: false, category: 'Trading' },

  // S&P Research
  { name: 'S&P Global Research', url: 'https://www.spglobal.com/spdji/en/rss/rss-details/?rssFeedName=research', type: 'rss', enabled: false, category: 'Research' },

  // Yahoo Finance
  { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/news/rss', type: 'rss', enabled: true, category: 'Financial News' },

  // Investopedia
  { name: 'Investopedia Stocks', url: 'https://feeds-api.dotdashmeredith.com/v1/rss/google/39f57320-dfdb-42e5-863b-acd9bc1893bb', type: 'rss', enabled: true, category: 'Education' },
  { name: 'Investopedia Trading', url: 'https://feeds-api.dotdashmeredith.com/v1/rss/google/7ab0ed74-4970-4a33-886c-4fbfe6ed84d2', type: 'rss', enabled: true, category: 'Education' },
  { name: 'Investopedia Markets News', url: 'https://feeds-api.dotdashmeredith.com/v1/rss/google/f6a0e92b-be8d-4abb-9106-703b04059e19', type: 'rss', enabled: true, category: 'Education' },

  // The Motley Fool
  { name: 'The Motley Fool', url: 'https://www.fool.com/a/feeds/partner/googlechromefollow?apikey=5e092c1f-c5f9-4428-9219-908a47d2e2de', type: 'rss', enabled: true, category: 'Analysis' },

  // Benzinga
  { name: 'Benzinga', url: 'https://www.benzinga.com/feed', type: 'rss', enabled: true, category: 'Financial News' },

  // Bloomberg (via OpenRSS proxy)
  { name: 'Bloomberg', url: 'https://openrss.org/www.bloomberg.com', type: 'rss', enabled: true, category: 'Financial News' },

  // Reuters (via OpenRSS proxy)
  { name: 'Reuters', url: 'https://openrss.org/www.reuters.com', type: 'rss', enabled: true, category: 'Financial News' },
]

// Initialize database with defaults
export async function initializeDatabase() {
  const settingsCount = await db.userSettings.count()
  if (settingsCount === 0) {
    await db.userSettings.add(DEFAULT_SETTINGS)
  }

  const sourcesCount = await db.newsSources.count()
  if (sourcesCount === 0) {
    await db.newsSources.bulkAdd(DEFAULT_NEWS_SOURCES)
  }
}

// Helper functions
export async function getSettings(): Promise<UserSettings> {
  const settings = await db.userSettings.toCollection().first()
  return settings || DEFAULT_SETTINGS
}

export async function updateSettings(updates: Partial<UserSettings>): Promise<void> {
  const settings = await db.userSettings.toCollection().first()
  if (settings?.id) {
    await db.userSettings.update(settings.id, updates)
  } else {
    await db.userSettings.add({ ...DEFAULT_SETTINGS, ...updates })
  }
}

export async function logTradeDecision(decision: Omit<TradeDecision, 'id'>): Promise<number> {
  const id = await db.tradeDecisions.add(decision as TradeDecision)
  return id as number
}

export async function getTradeDecisions(limit = 100): Promise<TradeDecision[]> {
  return await db.tradeDecisions
    .orderBy('timestamp')
    .reverse()
    .limit(limit)
    .toArray()
}

export async function getDecisionStats() {
  const decisions = await db.tradeDecisions.toArray()
  const total = decisions.length
  const executed = decisions.filter(d => d.decision === 'execute').length
  const skipped = decisions.filter(d => d.decision === 'skip').length

  const byAction = {
    BUY: decisions.filter(d => d.action === 'BUY'),
    SELL: decisions.filter(d => d.action === 'SELL'),
    HOLD: decisions.filter(d => d.action === 'HOLD')
  }

  return {
    total,
    executed,
    skipped,
    executeRate: total > 0 ? (executed / total) * 100 : 0,
    byAction: {
      BUY: { total: byAction.BUY.length, executed: byAction.BUY.filter(d => d.decision === 'execute').length },
      SELL: { total: byAction.SELL.length, executed: byAction.SELL.filter(d => d.decision === 'execute').length },
      HOLD: { total: byAction.HOLD.length, executed: byAction.HOLD.filter(d => d.decision === 'execute').length }
    }
  }
}

/**
 * Get AI Performance Statistics (Batting Average)
 * Only includes executed trades with determined outcomes
 */
export async function getAIPerformanceStats(daysBack: number = 30) {
  const cutoffDate = Date.now() - (daysBack * 24 * 60 * 60 * 1000)

  // Get all executed decisions from the last N days
  const decisions = await db.tradeDecisions
    .where('timestamp')
    .above(cutoffDate)
    .and(d => d.decision === 'execute')
    .toArray()

  const total = decisions.length

  // Filter by outcome status
  const wins = decisions.filter(d => d.outcome === 'win').length
  const losses = decisions.filter(d => d.outcome === 'loss').length
  const pending = decisions.filter(d => d.outcome === 'pending' || !d.outcome).length
  const neutral = decisions.filter(d => d.outcome === 'neutral').length

  // Calculate win rate (batting average) - excludes pending and neutral
  const completed = wins + losses
  const winRate = completed > 0 ? (wins / completed) * 100 : 0

  // Calculate average profit/loss
  const completedTrades = decisions.filter(d => d.outcome === 'win' || d.outcome === 'loss')
  const avgProfitLoss = completedTrades.length > 0
    ? completedTrades.reduce((sum, d) => sum + (d.profitLoss || 0), 0) / completedTrades.length
    : 0

  // Find best and worst trades
  const profitLosses = completedTrades.map(d => d.profitLoss || 0)
  const bestTrade = profitLosses.length > 0 ? Math.max(...profitLosses) : 0
  const worstTrade = profitLosses.length > 0 ? Math.min(...profitLosses) : 0

  // Calculate average hold time
  const tradesWithDuration = decisions.filter(d => d.daysHeld !== undefined)
  const avgDaysHeld = tradesWithDuration.length > 0
    ? tradesWithDuration.reduce((sum, d) => sum + (d.daysHeld || 0), 0) / tradesWithDuration.length
    : 0

  // Find best performing symbol
  const symbolStats = new Map<string, { wins: number; total: number }>()
  completedTrades.forEach(d => {
    const stats = symbolStats.get(d.symbol) || { wins: 0, total: 0 }
    stats.total++
    if (d.outcome === 'win') stats.wins++
    symbolStats.set(d.symbol, stats)
  })

  let bestSymbol = ''
  let bestSymbolWinRate = 0
  symbolStats.forEach((stats, symbol) => {
    const winRate = (stats.wins / stats.total) * 100
    if (stats.total >= 3 && winRate > bestSymbolWinRate) {  // Minimum 3 trades
      bestSymbol = symbol
      bestSymbolWinRate = winRate
    }
  })

  return {
    // Overview
    totalRecommendations: total,
    completed,
    pending,

    // Win/Loss Record
    wins,
    losses,
    neutral,
    winRate,  // Batting average

    // Performance Metrics
    avgProfitLoss,
    bestTrade,
    worstTrade,
    avgDaysHeld,

    // Best Performer
    bestSymbol,
    bestSymbolWinRate
  }
}

/**
 * Get Performance Statistics filtered by source (Human vs AI)
 * @param source - 'manual' for human trades, 'ai' for AI recommendations
 * @param daysBack - Number of days to look back (default 30)
 */
export async function getPerformanceStatsBySource(
  source: 'manual' | 'ai',
  daysBack: number = 30
) {
  const cutoffDate = Date.now() - (daysBack * 24 * 60 * 60 * 1000)

  // Get all executed decisions from the last N days
  const allDecisions = await db.tradeDecisions
    .where('timestamp')
    .above(cutoffDate)
    .and(d => d.decision === 'execute')
    .toArray()

  // Filter by source type
  const decisions = allDecisions.filter(d => {
    if (source === 'manual') {
      return d.source === 'manual'
    } else {
      // AI includes cloud_ai and local_llm
      return d.source === 'cloud_ai' || d.source === 'local_llm'
    }
  })

  const total = decisions.length

  // Filter by outcome status
  const wins = decisions.filter(d => d.outcome === 'win').length
  const losses = decisions.filter(d => d.outcome === 'loss').length
  const pending = decisions.filter(d => d.outcome === 'pending' || !d.outcome).length
  const neutral = decisions.filter(d => d.outcome === 'neutral').length

  // Calculate win rate (batting average) - excludes pending and neutral
  const completed = wins + losses
  const winRate = completed > 0 ? (wins / completed) * 100 : 0

  // Calculate average profit/loss
  const completedTrades = decisions.filter(d => d.outcome === 'win' || d.outcome === 'loss')
  const avgProfitLoss = completedTrades.length > 0
    ? completedTrades.reduce((sum, d) => sum + (d.profitLoss || 0), 0) / completedTrades.length
    : 0

  // Calculate total invested (for manual trades with dollarAmount)
  const totalInvested = decisions
    .filter(d => d.dollarAmount)
    .reduce((sum, d) => sum + (d.dollarAmount || 0), 0)

  // Calculate total shares traded
  const totalShares = decisions
    .filter(d => d.shares)
    .reduce((sum, d) => sum + (d.shares || 0), 0)

  return {
    source,
    totalTrades: total,
    completed,
    pending,
    wins,
    losses,
    neutral,
    winRate,
    avgProfitLoss,
    totalInvested,
    totalShares
  }
}

/**
 * Update a trade decision's outcome
 */
export async function updateTradeOutcome(
  decisionId: number,
  outcome: 'win' | 'loss' | 'neutral',
  priceAtOutcome: number
): Promise<void> {
  const decision = await db.tradeDecisions.get(decisionId)
  if (!decision) return

  const daysHeld = decision.timestamp
    ? (Date.now() - decision.timestamp) / (1000 * 60 * 60 * 24)
    : 0

  const profitLoss = decision.priceAtDecision
    ? ((priceAtOutcome - decision.priceAtDecision) / decision.priceAtDecision) * 100
    : 0

  await db.tradeDecisions.update(decisionId, {
    outcome,
    outcomeCheckedAt: Date.now(),
    priceAtOutcome,
    daysHeld: Math.round(daysHeld * 10) / 10,
    profitLoss: Math.round(profitLoss * 100) / 100
  })
}

// User Profile helpers
export async function getProfile(): Promise<UserProfile> {
  const profile = await db.userProfile.toCollection().first()
  return profile || DEFAULT_PROFILE
}

export async function updateProfile(updates: Partial<UserProfile>): Promise<void> {
  const profile = await db.userProfile.toCollection().first()
  if (profile?.id) {
    await db.userProfile.update(profile.id, updates)
  } else {
    await db.userProfile.add({ ...DEFAULT_PROFILE, ...updates })
  }
}

// AI Settings helpers
export async function getAISettings(): Promise<AISettings> {
  const settings = await db.aiSettings.toCollection().first()
  return settings || DEFAULT_AI_SETTINGS
}

export async function updateAISettings(updates: Partial<AISettings>): Promise<void> {
  const settings = await db.aiSettings.toCollection().first()
  if (settings?.id) {
    await db.aiSettings.update(settings.id, updates)
  } else {
    await db.aiSettings.add({ ...DEFAULT_AI_SETTINGS, ...updates })
  }
}

/**
 * Get enabled AI providers sorted by priority (primary first)
 * Falls back to legacy single-provider config if no multi-provider setup
 */
export async function getEnabledProviders(): Promise<AIProviderConfig[]> {
  const settings = await getAISettings()

  // If we have multi-provider config, use it
  if (settings.providers && settings.providers.length > 0) {
    return settings.providers
      .filter(p => p.enabled && p.apiKey)
      .sort((a, b) => a.priority - b.priority)
  }

  // Fall back to legacy single-provider config
  if (settings.apiKey) {
    return [{
      provider: settings.provider,
      apiKey: settings.apiKey,
      model: settings.model,
      enabled: true,
      priority: 1
    }]
  }

  return []
}

// ==========================================
// DATA MANAGEMENT / RESET FUNCTIONS
// ==========================================

/**
 * Clear API budget caches (localStorage)
 * Resets Alpha Vantage and AI budget counters
 */
export function clearAPICache(): void {
  localStorage.removeItem('richdad_api_budget')
  localStorage.removeItem('richdad_ai_budget')
  console.log('[DB] API cache cleared (budget counters reset)')
}

/**
 * Clear AI history (chat messages, trade decisions)
 * Keeps settings and profile intact
 */
export async function clearAIHistory(): Promise<void> {
  await db.tradeDecisions.clear()
  console.log('[DB] AI history cleared (trade decisions)')
}

/**
 * Clear all PnL data
 */
export async function clearPnLHistory(): Promise<void> {
  await db.pnlEntries.clear()
  console.log('[DB] PnL history cleared')
}

/**
 * Clear all price alerts
 */
export async function clearPriceAlerts(): Promise<void> {
  await db.priceAlerts.clear()
  console.log('[DB] Price alerts cleared')
}

/**
 * Factory reset - deletes all data and reloads
 * WARNING: This deletes everything!
 */
export async function factoryReset(): Promise<void> {
  console.log('[DB] Starting factory reset...')

  // Clear IndexedDB
  await db.delete()

  // Clear all localStorage
  localStorage.clear()

  // Clear sessionStorage
  sessionStorage.clear()

  console.log('[DB] Factory reset complete. Reloading...')

  // Reload the app to start fresh
  window.location.reload()
}

// ==========================================
// USER WATCHLIST PERSISTENCE
// ==========================================

/**
 * Get all user-added watchlist symbols from IndexedDB
 */
export async function getUserWatchlist(): Promise<WatchlistEntry[]> {
  return await db.watchlist.orderBy('addedAt').toArray()
}

/**
 * Add a symbol to user's watchlist (persisted)
 */
export async function addToUserWatchlist(
  symbol: string,
  name?: string,
  sector?: string
): Promise<number> {
  // Check if already exists
  const existing = await db.watchlist.where('symbol').equals(symbol.toUpperCase()).first()
  if (existing) {
    console.log(`[DB] ${symbol} already in user watchlist`)
    return existing.id!
  }

  const id = await db.watchlist.add({
    symbol: symbol.toUpperCase(),
    name,
    sector,
    addedAt: Date.now()
  })
  console.log(`[DB] Added ${symbol} to user watchlist`)
  return id as number
}

/**
 * Remove a symbol from user's watchlist
 */
export async function removeFromUserWatchlist(symbol: string): Promise<void> {
  await db.watchlist.where('symbol').equals(symbol.toUpperCase()).delete()
  console.log(`[DB] Removed ${symbol} from user watchlist`)
}

/**
 * Check if a symbol is in user's watchlist
 */
export async function isInUserWatchlist(symbol: string): Promise<boolean> {
  const entry = await db.watchlist.where('symbol').equals(symbol.toUpperCase()).first()
  return !!entry
}

/**
 * Clear all user watchlist entries
 */
export async function clearUserWatchlist(): Promise<void> {
  await db.watchlist.clear()
  console.log('[DB] User watchlist cleared')
}
