import type { Ticker, Quote, CandleData, NewsItem, AIRecommendation, AIMessage } from '../types'

export const TICKERS: Ticker[] = [
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', sector: 'Index' },
  { symbol: 'VIX', name: 'CBOE Volatility Index', sector: 'Index' },
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology' },
  { symbol: 'META', name: 'Meta Platforms', sector: 'Technology' },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Automotive' },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway', sector: 'Finance' },
  { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Finance' },
]

// Base prices for mock data
const BASE_PRICES: Record<string, number> = {
  'SPY': 475.50,
  'VIX': 18.50,
  'AAPL': 178.52,
  'MSFT': 378.91,
  'NVDA': 495.22,
  'AMZN': 178.25,
  'GOOGL': 141.80,
  'META': 505.75,
  'TSLA': 248.48,
  'BRK.B': 362.89,
  'JPM': 172.35,
}

// Generate random price movement
function randomChange(base: number, maxPercent: number = 3): number {
  const change = (Math.random() - 0.5) * 2 * maxPercent / 100
  return base * (1 + change)
}

// Generate mock quote
export function generateQuote(symbol: string): Quote {
  const base = BASE_PRICES[symbol] || 100
  const price = randomChange(base, 2)
  const previousClose = BASE_PRICES[symbol]
  const change = price - previousClose
  const changePercent = (change / previousClose) * 100

  return {
    symbol,
    price: Number(price.toFixed(2)),
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    volume: Math.floor(Math.random() * 50000000) + 1000000,
    high: Number((price * 1.02).toFixed(2)),
    low: Number((price * 0.98).toFixed(2)),
    open: Number(randomChange(base, 1).toFixed(2)),
    previousClose,
    timestamp: Date.now(),
  }
}

// Generate candle data for charts
export function generateCandleData(symbol: string, days: number = 90): CandleData[] {
  const data: CandleData[] = []
  let price = BASE_PRICES[symbol] || 100
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000

  for (let i = days; i >= 0; i--) {
    const time = Math.floor((now - i * dayMs) / 1000)
    const volatility = 0.02

    const open = price
    const change = (Math.random() - 0.48) * volatility * price
    const close = price + change
    const high = Math.max(open, close) * (1 + Math.random() * 0.01)
    const low = Math.min(open, close) * (1 - Math.random() * 0.01)

    data.push({
      time,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Math.floor(Math.random() * 50000000) + 5000000,
    })

    price = close
  }

  return data
}

// Mock news headlines
export const MOCK_NEWS: NewsItem[] = [
  {
    id: '1',
    headline: 'Fed signals potential rate pause amid cooling inflation data',
    source: 'Reuters',
    timestamp: Date.now() - 300000,
    sentiment: 'positive',
  },
  {
    id: '2',
    headline: 'NVDA announces next-gen AI chips, shares surge in pre-market',
    source: 'Bloomberg',
    timestamp: Date.now() - 600000,
    ticker: 'NVDA',
    sentiment: 'positive',
  },
  {
    id: '3',
    headline: 'Tech sector faces headwinds as bond yields climb',
    source: 'CNBC',
    timestamp: Date.now() - 900000,
    sentiment: 'negative',
  },
  {
    id: '4',
    headline: 'AAPL iPhone 16 sales exceed Wall Street estimates',
    source: 'WSJ',
    timestamp: Date.now() - 1200000,
    ticker: 'AAPL',
    sentiment: 'positive',
  },
  {
    id: '5',
    headline: 'Banking sector rally continues on strong earnings',
    source: 'Financial Times',
    timestamp: Date.now() - 1500000,
    ticker: 'JPM',
    sentiment: 'positive',
  },
  {
    id: '6',
    headline: 'TSLA Cybertruck deliveries ramp up, production targets met',
    source: 'Electrek',
    timestamp: Date.now() - 1800000,
    ticker: 'TSLA',
    sentiment: 'positive',
  },
  {
    id: '7',
    headline: 'META AI assistant crosses 500M monthly active users',
    source: 'TechCrunch',
    timestamp: Date.now() - 2100000,
    ticker: 'META',
    sentiment: 'positive',
  },
  {
    id: '8',
    headline: 'Oil prices drop 3% on rising inventory data',
    source: 'Reuters',
    timestamp: Date.now() - 2400000,
    sentiment: 'neutral',
  },
  {
    id: '9',
    headline: 'AMZN AWS expands data center footprint in Asia',
    source: 'Bloomberg',
    timestamp: Date.now() - 2700000,
    ticker: 'AMZN',
    sentiment: 'positive',
  },
  {
    id: '10',
    headline: 'MSFT Azure market share gains accelerate in Q4',
    source: 'Gartner',
    timestamp: Date.now() - 3000000,
    ticker: 'MSFT',
    sentiment: 'positive',
  },
]

// Mock AI recommendation
export const MOCK_RECOMMENDATION: AIRecommendation = {
  id: 'rec-1',
  ticker: 'NVDA',
  action: 'BUY',
  confidence: 87,
  rationale: 'Strong momentum in AI chip demand with NVDA leading the market. Recent earnings beat and raised guidance indicate sustained growth trajectory.',
  sources: [
    { title: 'NVDA Q3 Earnings Report', url: '#' },
    { title: 'AI Chip Market Analysis - Morgan Stanley', url: '#' },
    { title: 'Semiconductor Sector Outlook', url: '#' },
  ],
  timestamp: Date.now(),
  priceTarget: 550,
  stopLoss: 470,
}

// Mock AI activity log
export const MOCK_AI_MESSAGES: AIMessage[] = [
  {
    id: 'msg-1',
    type: 'analysis',
    content: 'Scanning market conditions... Volatility index elevated.',
    timestamp: Date.now() - 60000,
  },
  {
    id: 'msg-2',
    type: 'alert',
    content: 'NVDA breaking above 50-day moving average with volume confirmation.',
    timestamp: Date.now() - 120000,
    ticker: 'NVDA',
  },
  {
    id: 'msg-3',
    type: 'info',
    content: 'Fed minutes released. Market digesting policy implications.',
    timestamp: Date.now() - 180000,
  },
  {
    id: 'msg-4',
    type: 'recommendation',
    content: 'Generated BUY signal for NVDA. Confidence: 87%. See alert banner.',
    timestamp: Date.now() - 240000,
    ticker: 'NVDA',
  },
  {
    id: 'msg-5',
    type: 'analysis',
    content: 'Tech sector showing relative strength vs. S&P 500.',
    timestamp: Date.now() - 300000,
  },
  {
    id: 'msg-6',
    type: 'alert',
    content: 'AAPL approaching resistance at $180. Watching for breakout.',
    timestamp: Date.now() - 360000,
    ticker: 'AAPL',
  },
]

// Generate all quotes for watchlist
export function generateAllQuotes(): Map<string, Quote> {
  const quotes = new Map<string, Quote>()
  TICKERS.forEach(ticker => {
    quotes.set(ticker.symbol, generateQuote(ticker.symbol))
  })
  return quotes
}
