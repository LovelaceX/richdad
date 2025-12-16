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
  }
  screenReadingEnabled: boolean
  cvdMode: boolean

  // Data Sources
  alphaVantageApiKey?: string
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

export interface AISettings {
  id?: number
  provider: AIProvider
  apiKey: string
  model?: string
  recommendationFormat?: RecommendationFormat
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
  model: 'gpt-4.0-turbo'
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
    buy: 'chime-up',
    sell: 'chime-down',
    hold: 'subtle-ping',
    alert: 'alert-tone'
  },
  screenReadingEnabled: false,
  cvdMode: false,

  // Data Sources
  alphaVantageApiKey: undefined,
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
