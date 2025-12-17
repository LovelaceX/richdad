import { fetchLivePrices, getCacheStatus } from './marketData'
import { fetchNews } from './newsService'
import { analyzeSentiment, initializeSentimentAnalysis } from './sentimentService'
import { generateRecommendation, isMarketOpen } from './aiRecommendationEngine'
import { outcomeTracker } from './outcomeTracker'
import { db } from '../renderer/lib/db'
import type { Quote, NewsItem } from '../renderer/types'

export type DataUpdateCallback = (data: {
  type: 'market' | 'news' | 'sentiment' | 'ai_recommendation' | 'alert_triggered'
  payload: any
}) => void

class DataHeartbeatService {
  private marketInterval: NodeJS.Timeout | null = null
  private newsInterval: NodeJS.Timeout | null = null
  private sentimentInterval: NodeJS.Timeout | null = null
  private aiAnalysisInterval: NodeJS.Timeout | null = null
  private callbacks: Set<DataUpdateCallback> = new Set()
  private isRunning = false
  private cachedNews: NewsItem[] = []
  private newsSourceMetadata: { source: string; hasSentiment: boolean } | null = null
  private lastPrices: Map<string, number> = new Map() // For percentage-based alerts

  // Intervals (configurable)
  private MARKET_UPDATE_INTERVAL = 60000 // 1 minute (but respects 1-hour cache)
  private NEWS_UPDATE_INTERVAL = 300000 // 5 minutes
  private SENTIMENT_UPDATE_INTERVAL = 600000 // 10 minutes
  private AI_ANALYSIS_INTERVAL = 900000 // Default 15 minutes (overridden in start() from AISettings)

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

    // Load AI settings and set interval
    const { getAISettings } = await import('../renderer/lib/db')
    const aiSettings = await getAISettings()
    this.AI_ANALYSIS_INTERVAL = (aiSettings.recommendationInterval ?? 15) * 60000

    // Initialize sentiment analysis worker
    initializeSentimentAnalysis()

    // Start outcome tracker (for AI performance monitoring)
    outcomeTracker.start().catch(console.error)

    // Start periodic updates
    this.startMarketUpdates()
    this.startNewsUpdates()
    this.startSentimentUpdates()
    this.startAIAnalysis()

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
    if (this.aiAnalysisInterval) clearInterval(this.aiAnalysisInterval)

    this.marketInterval = null
    this.newsInterval = null
    this.sentimentInterval = null
    this.aiAnalysisInterval = null

    // Stop outcome tracker
    outcomeTracker.stop()

    console.log('[Heartbeat] Service stopped')
  }

  /**
   * Update AI analysis interval from settings and restart
   */
  async updateAIInterval(): Promise<void> {
    const { getAISettings } = await import('../renderer/lib/db')
    const aiSettings = await getAISettings()
    this.AI_ANALYSIS_INTERVAL = (aiSettings.recommendationInterval ?? 15) * 60000

    // Restart AI analysis with new interval
    if (this.aiAnalysisInterval) {
      clearInterval(this.aiAnalysisInterval)
    }
    this.startAIAnalysis()

    console.log(`[Heartbeat] AI analysis interval updated to ${aiSettings.recommendationInterval} minutes`)
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

      // Check price alerts after market update
      await this.checkPriceAlerts(quotes)

      return quotes

    } catch (error) {
      console.error('[Heartbeat] Market update failed:', error)
      return []
    }
  }

  /**
   * Check price alerts against current quotes
   */
  private async checkPriceAlerts(quotes: Quote[]): Promise<void> {
    try {
      // Get all active (non-triggered) alerts
      const alerts = await db.priceAlerts.filter(a => !a.triggered).toArray()

      if (alerts.length === 0) return

      // Create price map from quotes
      const priceMap = new Map<string, number>()
      quotes.forEach(q => {
        if (q.price) {
          priceMap.set(q.symbol, q.price)
        }
      })

      // Check each alert
      for (const alert of alerts) {
        const currentPrice = priceMap.get(alert.symbol)
        if (!currentPrice) continue

        let shouldTrigger = false

        switch (alert.condition) {
          case 'above':
            shouldTrigger = currentPrice > alert.value
            break
          case 'below':
            shouldTrigger = currentPrice < alert.value
            break
          case 'percent_up': {
            const lastPrice = this.lastPrices.get(alert.symbol)
            if (lastPrice) {
              const percentChange = ((currentPrice - lastPrice) / lastPrice) * 100
              shouldTrigger = percentChange >= alert.value
            }
            break
          }
          case 'percent_down': {
            const lastPrice = this.lastPrices.get(alert.symbol)
            if (lastPrice) {
              const percentChange = ((lastPrice - currentPrice) / lastPrice) * 100
              shouldTrigger = percentChange >= alert.value
            }
            break
          }
        }

        if (shouldTrigger && alert.id) {
          // Mark as triggered in database
          await db.priceAlerts.update(alert.id, {
            triggered: true,
            triggeredAt: Date.now()
          })

          console.log(`[Heartbeat] Price alert triggered: ${alert.symbol} ${alert.condition} ${alert.value}`)

          // Notify UI
          this.notifyCallbacks({
            type: 'alert_triggered',
            payload: {
              ...alert,
              triggered: true,
              triggeredAt: Date.now(),
              currentPrice
            }
          })
        }
      }

      // Update last prices for percentage calculations
      quotes.forEach(q => {
        if (q.price) {
          this.lastPrices.set(q.symbol, q.price)
        }
      })

    } catch (error) {
      console.error('[Heartbeat] Price alert check failed:', error)
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
   * Manually trigger AI analysis for a symbol
   */
  async updateAIAnalysis(symbol: string = 'SPY'): Promise<void> {
    try {
      // Only run during market hours
      if (!isMarketOpen()) {
        console.log('[Heartbeat] Market closed, skipping AI analysis')
        return
      }

      console.log(`[Heartbeat] Running AI analysis for ${symbol}`)

      // Load AI settings to get confidence threshold
      const { getAISettings } = await import('../renderer/lib/db')
      const aiSettings = await getAISettings()

      const recommendation = await generateRecommendation(
        symbol,
        aiSettings.confidenceThreshold
      )

      if (recommendation) {
        console.log(`[Heartbeat] Generated ${recommendation.action} recommendation (${recommendation.confidence}% confidence)`)

        this.notifyCallbacks({
          type: 'ai_recommendation',
          payload: recommendation
        })
      } else {
        console.log('[Heartbeat] No recommendation generated (AI not configured or low confidence)')
      }

    } catch (error) {
      console.error('[Heartbeat] AI analysis failed:', error)
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
    lastUpdate: { market: number; news: number; sentiment: number }
  } {
    return {
      running: this.isRunning,
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

  private startAIAnalysis(): void {
    // Initial AI analysis (after first market data fetch)
    setTimeout(() => {
      this.updateAIAnalysis('SPY')
    }, 10000) // Wait 10s for market data to load

    // Periodic updates (every 15 minutes)
    this.aiAnalysisInterval = setInterval(() => {
      this.updateAIAnalysis('SPY')
    }, this.AI_ANALYSIS_INTERVAL)
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
