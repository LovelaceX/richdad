import { fetchLivePrices, getCacheStatus } from './marketData'
import { fetchNews } from './newsService'
import { analyzeSentiment, initializeSentimentAnalysis } from './sentimentService'
import { generateRecommendation, isMarketOpen } from './aiRecommendationEngine'
import { outcomeTracker } from './outcomeTracker'
import { generateNewsIntelReport } from './agents/newsIntelAgent'
import { generatePatternScanReport } from './agents/patternScanAgent'
import { websocketService, type WebSocketState } from './websocketService'
import { db, getSettings, type PriceAlert } from '../renderer/lib/db'
import { reportServiceHealth } from '../renderer/stores/serviceHealthStore'
import type { Quote, NewsItem, AnalysisPhase, AIRecommendation } from '../renderer/types'
import type { NewsIntelReport, PatternScanReport } from './agents/types'
import type { CacheStatus } from './marketData'

// Discriminated union for all data update events
// Each event type has a specific payload structure for type safety
export type DataUpdateEvent =
  | { type: 'market'; payload: { quotes: Quote[]; cacheStatus: CacheStatus; isRealtime?: boolean } }
  | { type: 'news'; payload: NewsItem[] }
  | { type: 'sentiment'; payload: NewsItem[] }
  | { type: 'ai_recommendation'; payload: AIRecommendation }
  | { type: 'alert_triggered'; payload: PriceAlert & { currentPrice: number } }
  | { type: 'ai_analysis_start'; payload: { ticker: string } }
  | { type: 'ai_phase_update'; payload: { phaseId: string; status: AnalysisPhase['status']; result?: string } }
  | { type: 'ai_analysis_end'; payload: { ticker: string; success: boolean; error?: string } }
  | { type: 'news_intel'; payload: NewsIntelReport }
  | { type: 'pattern_scan'; payload: PatternScanReport }
  | { type: 'websocket_status'; payload: { state: WebSocketState; message?: string } }
  | { type: 'realtime_quote'; payload: Quote }

// Extract just the type strings for convenience
export type DataUpdateType = DataUpdateEvent['type']

// Callback type using the discriminated union
export type DataUpdateCallback = (data: DataUpdateEvent) => void

// Memory limits to prevent unbounded growth
const MAX_CACHED_NEWS = 500
const MAX_TRACKED_PRICES = 200

// Jitter configuration to prevent thundering herd
// Adds randomness to polling intervals so multiple clients don't hit API at same time
const JITTER_PERCENT = 0.15 // ±15% jitter

/**
 * Add random jitter to an interval to prevent thundering herd
 * @param baseMs - Base interval in milliseconds
 * @returns Jittered interval (baseMs ± JITTER_PERCENT)
 */
function addJitter(baseMs: number): number {
  const jitterRange = baseMs * JITTER_PERCENT
  const jitter = (Math.random() * 2 - 1) * jitterRange // Random between -jitterRange and +jitterRange
  return Math.round(baseMs + jitter)
}

class DataHeartbeatService {
  private marketInterval: NodeJS.Timeout | null = null
  private newsInterval: NodeJS.Timeout | null = null
  private sentimentInterval: NodeJS.Timeout | null = null
  private aiAnalysisInterval: NodeJS.Timeout | null = null
  private patternScanInterval: NodeJS.Timeout | null = null
  private cleanupInterval: NodeJS.Timeout | null = null
  private callbacks: Set<DataUpdateCallback> = new Set()
  private isRunning = false
  private cachedNews: NewsItem[] = []
  private lastPrices: Map<string, { price: number; timestamp: number }> = new Map() // For percentage-based alerts
  private lastPricesLRU: string[] = [] // Track access order for cleanup
  private websocketEnabled = false
  private websocketUnsubscribe: (() => void) | null = null

  // Track in-flight AI analysis requests to prevent duplicates
  private pendingAIAnalysis: Map<string, Promise<void>> = new Map()

  // Last update timestamps for service health monitoring
  private lastMarketUpdate: number = 0
  private lastNewsUpdate: number = 0
  private lastSentimentUpdate: number = 0

  // Bound event handlers (stored as class properties to allow proper cleanup)
  // IMPORTANT: .bind() creates new references, so we store them for removeEventListener
  private boundHandleWebSocketFallback = this.handleWebSocketFallback.bind(this)

  // Intervals (configurable)
  private MARKET_UPDATE_INTERVAL = 60000 // 1 minute (but respects 1-hour cache)
  private NEWS_UPDATE_INTERVAL = 300000 // 5 minutes
  private SENTIMENT_UPDATE_INTERVAL = 600000 // 10 minutes
  private AI_ANALYSIS_INTERVAL = 900000 // Default 15 minutes (overridden in start() from AISettings)
  private PATTERN_SCAN_INTERVAL = 900000 // 15 minutes - only used when autoPatternScan is enabled in settings
  private CLEANUP_INTERVAL = 600000 // 10 minutes - run memory cleanup
  private PRICE_MAX_AGE = 24 * 60 * 60 * 1000 // 24 hours - evict prices older than this

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

    // Load settings
    const settings = await getSettings()
    const { getAISettings } = await import('../renderer/lib/db')
    const aiSettings = await getAISettings()
    this.AI_ANALYSIS_INTERVAL = (aiSettings.recommendationInterval ?? 15) * 60000

    // Initialize sentiment analysis worker
    initializeSentimentAnalysis()

    // Start outcome tracker (for AI performance monitoring)
    outcomeTracker.start().catch(console.error)

    // Try to connect WebSocket if enabled and API key is available
    if (settings.enableWebsocket && settings.polygonApiKey) {
      await this.initializeWebSocket(settings.polygonApiKey)
    }

    // Start periodic updates
    this.startMarketUpdates()
    this.startNewsUpdates()
    this.startSentimentUpdates()
    this.startAIAnalysis()
    this.startPatternScanning()
    this.startCleanupRoutine()

    // Listen for WebSocket fallback event (using stored bound reference for proper cleanup)
    window.addEventListener('websocket-fallback', this.boundHandleWebSocketFallback)

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
    if (this.patternScanInterval) clearInterval(this.patternScanInterval)
    if (this.cleanupInterval) clearInterval(this.cleanupInterval)

    this.marketInterval = null
    this.newsInterval = null
    this.sentimentInterval = null
    this.aiAnalysisInterval = null
    this.patternScanInterval = null
    this.cleanupInterval = null

    // Disconnect WebSocket
    if (this.websocketUnsubscribe) {
      this.websocketUnsubscribe()
      this.websocketUnsubscribe = null
    }
    websocketService.disconnect()
    this.websocketEnabled = false

    // Remove event listener (using stored bound reference for proper cleanup)
    window.removeEventListener('websocket-fallback', this.boundHandleWebSocketFallback)

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
   * Refresh data immediately after API key is added/changed
   * Called when user saves new API keys in Settings
   */
  async refreshOnApiKeyChange(): Promise<void> {
    const settings = await getSettings()

    console.log('[Heartbeat] API key changed, triggering immediate data refresh...')

    // Re-initialize WebSocket if Polygon key is now available
    if (settings.enableWebsocket && settings.polygonApiKey && !this.websocketEnabled) {
      await this.initializeWebSocket(settings.polygonApiKey)
    }

    // Trigger immediate market data refresh
    await this.updateMarketData([])

    // Trigger immediate news refresh
    await this.updateNews()

    console.log('[Heartbeat] API key change refresh complete')
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

      // Track success
      this.lastMarketUpdate = Date.now()
      reportServiceHealth.success('market')

      return quotes

    } catch (error) {
      console.error('[Heartbeat] Market update failed:', error)
      reportServiceHealth.error('market', error instanceof Error ? error.message : 'Unknown error')
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
            const priceData = this.lastPrices.get(alert.symbol)
            // Guard against division by zero
            if (priceData && priceData.price > 0) {
              const percentChange = ((currentPrice - priceData.price) / priceData.price) * 100
              shouldTrigger = percentChange >= alert.value
            }
            break
          }
          case 'percent_down': {
            const priceData = this.lastPrices.get(alert.symbol)
            // Guard against division by zero
            if (priceData && priceData.price > 0) {
              const percentChange = ((priceData.price - currentPrice) / priceData.price) * 100
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

      // Update last prices for percentage calculations (with LRU cleanup)
      const now = Date.now()
      quotes.forEach(q => {
        if (q.price) {
          this.lastPrices.set(q.symbol, { price: q.price, timestamp: now })
          this.trackPriceAccess(q.symbol)
        }
      })

    } catch (error) {
      console.error('[Heartbeat] Price alert check failed:', error)
    }
  }

  /**
   * Track price symbol access for LRU cleanup
   */
  private trackPriceAccess(symbol: string): void {
    const idx = this.lastPricesLRU.indexOf(symbol)
    if (idx !== -1) {
      this.lastPricesLRU.splice(idx, 1)
    }
    this.lastPricesLRU.push(symbol)

    // Evict oldest if over limit
    while (this.lastPricesLRU.length > MAX_TRACKED_PRICES) {
      const evict = this.lastPricesLRU.shift()
      if (evict) {
        this.lastPrices.delete(evict)
      }
    }
  }

  /**
   * Manually trigger news update
   */
  async updateNews(): Promise<NewsItem[]> {
    try {
      const newsResponse = await fetchNews()

      // Limit cached news to prevent unbounded memory growth
      this.cachedNews = newsResponse.articles.slice(0, MAX_CACHED_NEWS)

      console.log(`[Heartbeat] News fetched from ${newsResponse.source} (hasSentiment: ${newsResponse.hasSentiment})`)

      this.notifyCallbacks({
        type: 'news',
        payload: newsResponse.articles
      })

      // Run news intel analysis after news update
      this.updateNewsIntel().catch(err => {
        console.error('[Heartbeat] News intel update failed:', err)
      })

      // Track success
      this.lastNewsUpdate = Date.now()
      reportServiceHealth.success('news')

      return newsResponse.articles

    } catch (error) {
      console.error('[Heartbeat] News update failed:', error)
      reportServiceHealth.error('news', error instanceof Error ? error.message : 'Unknown error')
      return []
    }
  }

  /**
   * Generate news intelligence report
   */
  async updateNewsIntel(): Promise<NewsIntelReport | null> {
    if (this.cachedNews.length === 0) {
      console.log('[Heartbeat] No news to analyze for intel')
      return null
    }

    try {
      // Get watchlist symbols from market store
      const { useMarketStore } = await import('../renderer/stores/marketStore')
      const watchlist = useMarketStore.getState().watchlist
      const symbols = watchlist.map(item => item.symbol)

      console.log(`[Heartbeat] Generating news intel for ${symbols.length} watchlist symbols`)

      const report = await generateNewsIntelReport(this.cachedNews, symbols)

      console.log(`[Heartbeat] News intel generated: ${report.totalAnalyzed} articles, ${report.breakingAlerts.length} breaking alerts, ${report.velocitySpikes.length} velocity spikes`)

      this.notifyCallbacks({
        type: 'news_intel',
        payload: report
      })

      return report

    } catch (error) {
      console.error('[Heartbeat] News intel generation failed:', error)
      return null
    }
  }

  /**
   * Generate pattern scan report for watchlist symbols
   */
  async updatePatternScan(): Promise<PatternScanReport | null> {
    try {
      // Note: Pattern scan now works after hours using cached data
      const marketClosed = !isMarketOpen()
      if (marketClosed) {
        console.log('[Heartbeat] Market closed - pattern scan will use last available data')
      }

      // Get watchlist symbols from market store
      const { useMarketStore } = await import('../renderer/stores/marketStore')
      const watchlist = useMarketStore.getState().watchlist
      const symbols = watchlist.map(item => item.symbol)

      if (symbols.length === 0) {
        console.log('[Heartbeat] No watchlist symbols to scan')
        return null
      }

      console.log(`[Heartbeat] Running pattern scan for ${symbols.length} symbols`)

      const report = await generatePatternScanReport(symbols)

      console.log(`[Heartbeat] Pattern scan complete: ${report.setupsFound.length} setups found (${report.summary.highReliabilityCount} high reliability)`)

      this.notifyCallbacks({
        type: 'pattern_scan',
        payload: report
      })

      return report

    } catch (error) {
      console.error('[Heartbeat] Pattern scan failed:', error)
      return null
    }
  }

  /**
   * Manually trigger sentiment analysis
   */
  async updateSentiment(): Promise<void> {
    if (this.cachedNews.length === 0) return

    try {
      // Always analyze sentiment, even if source claims to have it
      // This ensures consistent sentiment detection across all sources
      // Note: If Alpha Vantage already provided sentiment, we could skip, but
      // let's re-analyze to ensure our keyword fallback works consistently

      // Only analyze headlines without sentiment or with "neutral" (which might be default)
      const unanalyzed = this.cachedNews.filter(n => !n.sentiment)

      if (unanalyzed.length === 0) {
        console.log('[Heartbeat] All news already analyzed')
        this.lastSentimentUpdate = Date.now()
        reportServiceHealth.success('sentiment')
        return
      }

      console.log(`[Heartbeat] Analyzing sentiment for ${unanalyzed.length} headlines`)

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

      // Track success
      this.lastSentimentUpdate = Date.now()
      reportServiceHealth.success('sentiment')

    } catch (error) {
      console.error('[Heartbeat] Sentiment analysis failed:', error)
      reportServiceHealth.error('sentiment', error instanceof Error ? error.message : 'Unknown error')
    }
  }

  /**
   * Manually trigger AI analysis for a symbol
   * @param symbol - Stock ticker to analyze
   * @param showProgress - Whether to emit phase update callbacks for UI animation
   */
  async updateAIAnalysis(symbol: string = 'SPY', showProgress: boolean = true): Promise<void> {
    // Check if analysis is already in progress for this symbol
    const existingAnalysis = this.pendingAIAnalysis.get(symbol)
    if (existingAnalysis) {
      console.log(`[Heartbeat] AI analysis for ${symbol} already in progress, skipping duplicate`)
      return existingAnalysis
    }

    // Create and track the analysis promise
    const analysisPromise = this.doAIAnalysis(symbol, showProgress)
    this.pendingAIAnalysis.set(symbol, analysisPromise)

    try {
      await analysisPromise
    } finally {
      // Always clean up the tracking when done
      this.pendingAIAnalysis.delete(symbol)
    }
  }

  /**
   * Internal method to perform the actual AI analysis
   */
  private async doAIAnalysis(symbol: string, showProgress: boolean): Promise<void> {
    try {
      // Note: We no longer skip analysis during market closed hours
      // Users installing after hours should still see the AI working with cached/last-known data
      const marketClosed = !isMarketOpen()
      if (marketClosed) {
        console.log('[Heartbeat] Market closed - AI analysis will use last available data')
      }

      console.log(`[Heartbeat] Running AI analysis for ${symbol}${marketClosed ? ' (market closed)' : ''}`)

      // Notify UI that analysis is starting (for animation)
      if (showProgress) {
        this.notifyCallbacks({
          type: 'ai_analysis_start',
          payload: { ticker: symbol }
        })
      }

      // Load AI settings to get confidence threshold
      const { getAISettings } = await import('../renderer/lib/db')
      const aiSettings = await getAISettings()

      // Create phase update callback to forward to UI
      const onPhaseUpdate = showProgress
        ? (phaseId: string, status: AnalysisPhase['status'], result?: string) => {
            this.notifyCallbacks({
              type: 'ai_phase_update',
              payload: { phaseId, status, result }
            })
          }
        : undefined

      const recommendation = await generateRecommendation(
        symbol,
        aiSettings.confidenceThreshold,
        onPhaseUpdate
      )

      // Notify UI that analysis is complete
      if (showProgress) {
        this.notifyCallbacks({
          type: 'ai_analysis_end',
          payload: { ticker: symbol, success: !!recommendation }
        })
      }

      if (recommendation) {
        console.log(`[Heartbeat] Generated ${recommendation.action} recommendation (${recommendation.confidence}% confidence)`)

        this.notifyCallbacks({
          type: 'ai_recommendation',
          payload: recommendation
        })
        reportServiceHealth.success('ai')
      } else {
        console.log('[Heartbeat] No recommendation generated (AI not configured or low confidence)')
        // Still mark as success - AI ran but confidence was low or no action needed
        reportServiceHealth.success('ai')
      }

    } catch (error) {
      console.error('[Heartbeat] AI analysis failed:', error)
      reportServiceHealth.error('ai', String(error))

      // Notify UI of failure
      this.notifyCallbacks({
        type: 'ai_analysis_end',
        payload: { ticker: symbol, success: false, error: String(error) }
      })
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
        market: this.lastMarketUpdate,
        news: this.lastNewsUpdate,
        sentiment: this.lastSentimentUpdate
      }
    }
  }

  // Private methods

  private startMarketUpdates(): void {
    // Skip initial update - loadSelectedMarket() already fetches quotes at t=0
    // This saves 1 API call on startup (was previously a duplicate fetch)

    // Periodic updates with jitter (starts at 60s)
    this.marketInterval = setInterval(() => {
      this.updateMarketData([])
    }, addJitter(this.MARKET_UPDATE_INTERVAL))
  }

  private startNewsUpdates(): void {
    // Initial update with jitter
    setTimeout(() => {
      this.updateNews()
    }, addJitter(2000))

    // Periodic updates with jitter
    this.newsInterval = setInterval(() => {
      this.updateNews()
    }, addJitter(this.NEWS_UPDATE_INTERVAL))
  }

  private startSentimentUpdates(): void {
    // Initial sentiment analysis (after first news fetch) with jitter
    setTimeout(() => {
      this.updateSentiment()
    }, addJitter(5000))

    // Periodic updates with jitter
    this.sentimentInterval = setInterval(() => {
      this.updateSentiment()
    }, addJitter(this.SENTIMENT_UPDATE_INTERVAL))
  }

  private startAIAnalysis(): void {
    // Initial AI analysis (after first market data fetch) with jitter
    setTimeout(() => {
      this.updateAIAnalysis('SPY')
    }, addJitter(10000))

    // Periodic updates with jitter
    this.aiAnalysisInterval = setInterval(() => {
      this.updateAIAnalysis('SPY')
    }, addJitter(this.AI_ANALYSIS_INTERVAL))
  }

  private async startPatternScanning(): Promise<void> {
    // Always listen for manual scan trigger from UI
    window.addEventListener('trigger-pattern-scan', () => {
      console.log('[Heartbeat] Manual pattern scan triggered')
      this.updatePatternScan()
    })

    // Check if automatic pattern scanning is enabled in settings
    // Disabled by default - too expensive for free tier (1 API call per symbol)
    const settings = await getSettings()
    if (!settings.autoPatternScan) {
      console.log('[Heartbeat] Automatic pattern scanning disabled - use manual scan button (enable in Settings → AI Copilot)')
      return
    }

    // Automatic scanning enabled (paid tier users)
    console.log('[Heartbeat] Automatic pattern scanning ENABLED - scanning every 15 minutes')

    // Initial scan after 2 minutes (give time for other services to stabilize)
    setTimeout(() => {
      this.updatePatternScan()
    }, addJitter(120000))

    // Periodic scans
    this.patternScanInterval = setInterval(() => {
      this.updatePatternScan()
    }, addJitter(this.PATTERN_SCAN_INTERVAL))
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

  /**
   * Start periodic memory cleanup routine
   */
  private startCleanupRoutine(): void {
    // Initial cleanup after 1 minute
    setTimeout(() => {
      this.runCleanup()
    }, 60000)

    // Periodic cleanup with jitter
    this.cleanupInterval = setInterval(() => {
      this.runCleanup()
    }, addJitter(this.CLEANUP_INTERVAL))
  }

  /**
   * Run memory cleanup routine
   * - Evicts stale price data (older than 24 hours)
   * - Trims news cache to limit
   * - Clears any other stale data
   */
  private runCleanup(): void {
    const now = Date.now()
    let evictedPrices = 0
    let evictedNews = 0

    // Clean old prices (older than 24 hours)
    for (const [symbol, data] of this.lastPrices) {
      if (now - data.timestamp > this.PRICE_MAX_AGE) {
        this.lastPrices.delete(symbol)
        // Also remove from LRU list
        const lruIdx = this.lastPricesLRU.indexOf(symbol)
        if (lruIdx !== -1) {
          this.lastPricesLRU.splice(lruIdx, 1)
        }
        evictedPrices++
      }
    }

    // Trim news to limit (keep most recent)
    if (this.cachedNews.length > MAX_CACHED_NEWS) {
      evictedNews = this.cachedNews.length - MAX_CACHED_NEWS
      // Sort by timestamp (newest first) and keep only the limit
      this.cachedNews = this.cachedNews
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, MAX_CACHED_NEWS)
    }

    // Log cleanup stats (only if something was evicted)
    if (evictedPrices > 0 || evictedNews > 0) {
      console.log('[Heartbeat] Cleanup complete:', {
        pricesEvicted: evictedPrices,
        newsEvicted: evictedNews,
        pricesTracked: this.lastPrices.size,
        newsArticles: this.cachedNews.length
      })
    }
  }

  /**
   * Get memory stats for debugging/monitoring
   */
  getMemoryStats(): {
    pricesTracked: number
    newsArticles: number
    callbacks: number
  } {
    return {
      pricesTracked: this.lastPrices.size,
      newsArticles: this.cachedNews.length,
      callbacks: this.callbacks.size
    }
  }

  // ==========================================
  // WEBSOCKET METHODS
  // ==========================================

  /**
   * Initialize WebSocket connection for real-time streaming
   */
  private async initializeWebSocket(apiKey: string): Promise<void> {
    console.log('[Heartbeat] Initializing WebSocket connection...')

    try {
      // Initialize the service with API key
      await websocketService.initialize(apiKey)

      // Subscribe to status changes
      this.websocketUnsubscribe = websocketService.onStatusChange((state, message) => {
        this.notifyCallbacks({
          type: 'websocket_status',
          payload: { state, message }
        })

        // If connected, subscribe to watchlist symbols
        if (state === 'connected') {
          this.subscribeWatchlistToWebSocket()
        }
      })

      // Attempt connection
      const connected = await websocketService.connect()

      if (connected) {
        this.websocketEnabled = true
        console.log('[Heartbeat] WebSocket connected successfully')
      } else {
        console.warn('[Heartbeat] WebSocket connection failed, using polling')
        this.websocketEnabled = false
      }

    } catch (error) {
      console.error('[Heartbeat] WebSocket initialization failed:', error)
      this.websocketEnabled = false
    }
  }

  /**
   * Subscribe watchlist symbols to WebSocket for real-time updates
   */
  private async subscribeWatchlistToWebSocket(): Promise<void> {
    try {
      const { useMarketStore } = await import('../renderer/stores/marketStore')
      const watchlist = useMarketStore.getState().watchlist
      const symbols = watchlist.map(item => item.symbol)

      if (symbols.length === 0) {
        console.log('[Heartbeat] No watchlist symbols to subscribe')
        return
      }

      console.log(`[Heartbeat] Subscribing ${symbols.length} symbols to WebSocket`)

      // Subscribe to all watchlist symbols
      websocketService.subscribeMultiple(symbols, (quote) => {
        this.handleRealtimeQuote(quote)
      })

    } catch (error) {
      console.error('[Heartbeat] Failed to subscribe watchlist:', error)
    }
  }

  /**
   * Handle real-time quote from WebSocket
   */
  private handleRealtimeQuote(quote: Quote): void {
    const now = Date.now()

    // Update last prices for alert tracking
    this.lastPrices.set(quote.symbol, { price: quote.price, timestamp: now })
    this.trackPriceAccess(quote.symbol)

    // Notify callbacks of real-time update
    this.notifyCallbacks({
      type: 'realtime_quote',
      payload: quote
    })

    // Also update market data (so UI gets it through normal channels)
    this.notifyCallbacks({
      type: 'market',
      payload: {
        quotes: [quote],
        cacheStatus: getCacheStatus(),
        isRealtime: true
      }
    })
  }

  /**
   * Handle WebSocket fallback event (when connection fails permanently)
   */
  private handleWebSocketFallback(): void {
    console.log('[Heartbeat] WebSocket fallback triggered, relying on polling')
    this.websocketEnabled = false

    // Notify UI that we're now using polling
    this.notifyCallbacks({
      type: 'websocket_status',
      payload: { state: 'failed', message: 'Falling back to polling' }
    })
  }

  /**
   * Get WebSocket status
   */
  getWebSocketStatus(): {
    enabled: boolean
    state: WebSocketState
    subscribedSymbols: number
  } {
    return {
      enabled: this.websocketEnabled,
      state: websocketService.getState(),
      subscribedSymbols: websocketService.getSubscribedSymbols().length
    }
  }

  /**
   * Manually enable/disable WebSocket (for settings toggle)
   */
  async toggleWebSocket(enable: boolean, apiKey?: string): Promise<boolean> {
    if (enable && apiKey) {
      await this.initializeWebSocket(apiKey)
      return this.websocketEnabled
    } else {
      if (this.websocketUnsubscribe) {
        this.websocketUnsubscribe()
        this.websocketUnsubscribe = null
      }
      websocketService.disconnect()
      this.websocketEnabled = false
      return false
    }
  }
}

// Export singleton instance
export const dataHeartbeat = new DataHeartbeatService()
