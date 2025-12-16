import { fetchLivePrices, getCacheStatus } from './marketData'
import { fetchNews } from './newsService'
import { analyzeSentiment, initializeSentimentAnalysis } from './sentimentService'
import { initializeLocalLLM, isLocalLLMReady } from './localLLMService'
import { getSettings } from '../renderer/lib/db'
import type { Quote, NewsItem } from '../renderer/types'

export type DataUpdateCallback = (data: {
  type: 'market' | 'news' | 'sentiment' | 'llm_status'
  payload: any
}) => void

class DataHeartbeatService {
  private marketInterval: NodeJS.Timeout | null = null
  private newsInterval: NodeJS.Timeout | null = null
  private sentimentInterval: NodeJS.Timeout | null = null
  private callbacks: Set<DataUpdateCallback> = new Set()
  private isRunning = false
  private cachedNews: NewsItem[] = []
  private newsSourceMetadata: { source: string; hasSentiment: boolean } | null = null

  // Intervals (configurable)
  private MARKET_UPDATE_INTERVAL = 60000 // 1 minute (but respects 1-hour cache)
  private NEWS_UPDATE_INTERVAL = 300000 // 5 minutes
  private SENTIMENT_UPDATE_INTERVAL = 600000 // 10 minutes

  /**
   * Start the heartbeat service
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[Heartbeat] Already running')
      return
    }

    console.log('[Heartbeat] Starting data heartbeat service...')
    this.isRunning = true

    // Initialize sentiment analysis worker
    initializeSentimentAnalysis()

    // Initialize Local LLM if enabled
    try {
      const settings = await getSettings()
      if (settings.useLocalLLM) {
        await initializeLocalLLM()
        this.notifyCallbacks({
          type: 'llm_status',
          payload: { ready: isLocalLLMReady() }
        })
      }
    } catch (error) {
      console.error('[Heartbeat] Local LLM init failed:', error)
    }

    // Start periodic updates
    this.startMarketUpdates()
    this.startNewsUpdates()
    this.startSentimentUpdates()

    console.log('[Heartbeat] Service started')
  }

  /**
   * Stop the heartbeat service
   */
  stop(): void {
    if (!this.isRunning) return

    console.log('[Heartbeat] Stopping data heartbeat service...')
    this.isRunning = false

    if (this.marketInterval) clearInterval(this.marketInterval)
    if (this.newsInterval) clearInterval(this.newsInterval)
    if (this.sentimentInterval) clearInterval(this.sentimentInterval)

    this.marketInterval = null
    this.newsInterval = null
    this.sentimentInterval = null

    console.log('[Heartbeat] Service stopped')
  }

  /**
   * Subscribe to data updates
   */
  subscribe(callback: DataUpdateCallback): () => void {
    this.callbacks.add(callback)

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback)
    }
  }

  /**
   * Manually trigger market data update
   */
  async updateMarketData(symbols: string[]): Promise<Quote[]> {
    try {
      const quotes = await fetchLivePrices(symbols)

      this.notifyCallbacks({
        type: 'market',
        payload: {
          quotes,
          cacheStatus: getCacheStatus()
        }
      })

      return quotes

    } catch (error) {
      console.error('[Heartbeat] Market update failed:', error)
      return []
    }
  }

  /**
   * Manually trigger news update
   */
  async updateNews(): Promise<NewsItem[]> {
    try {
      const newsResponse = await fetchNews()

      this.cachedNews = newsResponse.articles
      this.newsSourceMetadata = {
        source: newsResponse.source,
        hasSentiment: newsResponse.hasSentiment
      }

      console.log(`[Heartbeat] News fetched from ${newsResponse.source} (hasSentiment: ${newsResponse.hasSentiment})`)

      this.notifyCallbacks({
        type: 'news',
        payload: newsResponse.articles
      })

      return newsResponse.articles

    } catch (error) {
      console.error('[Heartbeat] News update failed:', error)
      return []
    }
  }

  /**
   * Manually trigger sentiment analysis
   */
  async updateSentiment(): Promise<void> {
    if (this.cachedNews.length === 0) return

    try {
      // Skip FinBERT if news already has sentiment from Alpha Vantage
      if (this.newsSourceMetadata?.hasSentiment) {
        console.log('[Heartbeat] Skipping FinBERT - news from Alpha Vantage already has sentiment')
        return
      }

      // Only analyze headlines without sentiment (RSS news)
      const unanalyzed = this.cachedNews.filter(n => !n.sentiment || n.sentiment === 'neutral')

      if (unanalyzed.length === 0) {
        console.log('[Heartbeat] All news already analyzed')
        return
      }

      console.log(`[Heartbeat] Analyzing sentiment for ${unanalyzed.length} RSS headlines with FinBERT`)

      const sentiments = await analyzeSentiment(unanalyzed)

      // Update cached news with sentiments
      this.cachedNews = this.cachedNews.map(item => ({
        ...item,
        sentiment: sentiments.get(item.id) || item.sentiment
      }))

      this.notifyCallbacks({
        type: 'sentiment',
        payload: this.cachedNews
      })

    } catch (error) {
      console.error('[Heartbeat] Sentiment analysis failed:', error)
    }
  }

  /**
   * Get cached news (latest)
   */
  getCachedNews(): NewsItem[] {
    return this.cachedNews
  }

  /**
   * Get service status
   */
  getStatus(): {
    running: boolean
    llmReady: boolean
    lastUpdate: { market: number; news: number; sentiment: number }
  } {
    return {
      running: this.isRunning,
      llmReady: isLocalLLMReady(),
      lastUpdate: {
        market: 0, // TODO: Track last update times
        news: 0,
        sentiment: 0
      }
    }
  }

  // Private methods

  private startMarketUpdates(): void {
    // Initial update
    this.updateMarketData([])

    // Periodic updates
    this.marketInterval = setInterval(() => {
      this.updateMarketData([])
    }, this.MARKET_UPDATE_INTERVAL)
  }

  private startNewsUpdates(): void {
    // Initial update
    this.updateNews()

    // Periodic updates
    this.newsInterval = setInterval(() => {
      this.updateNews()
    }, this.NEWS_UPDATE_INTERVAL)
  }

  private startSentimentUpdates(): void {
    // Initial sentiment analysis (after first news fetch)
    setTimeout(() => {
      this.updateSentiment()
    }, 5000) // Wait 5s for first news fetch

    // Periodic updates
    this.sentimentInterval = setInterval(() => {
      this.updateSentiment()
    }, this.SENTIMENT_UPDATE_INTERVAL)
  }

  private notifyCallbacks(data: Parameters<DataUpdateCallback>[0]): void {
    this.callbacks.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error('[Heartbeat] Callback error:', error)
      }
    })
  }
}

// Export singleton instance
export const dataHeartbeat = new DataHeartbeatService()
