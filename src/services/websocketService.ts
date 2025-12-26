/**
 * WebSocket Service for Real-time Market Data Streaming
 *
 * Provides real-time quote updates via Tiingo IEX WebSocket API
 * with automatic reconnection and fallback to polling.
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Subscription management per symbol
 * - Event-based quote updates
 * - Graceful fallback notification when WebSocket unavailable
 */

import type { Quote } from '../renderer/types'

// Connection states
export type WebSocketState = 'disconnected' | 'connecting' | 'authenticating' | 'connected' | 'reconnecting' | 'failed'

// Quote callback type
export type QuoteCallback = (quote: Quote) => void

// Status change callback
export type StatusCallback = (state: WebSocketState, message?: string) => void

// Tiingo IEX WebSocket message types
interface TiingoMessage {
  messageType: string  // 'A' = data, 'H' = heartbeat, 'I' = info, 'E' = error
  service?: string     // 'iex'
  data?: (string | number)[]  // Array: [type, ticker, timestamp, unix_ts, price, size, ...]
  response?: {
    code: number
    message: string
  }
}

class WebSocketService {
  private ws: WebSocket | null = null
  private apiKey: string | null = null
  private subscriptions: Map<string, Set<QuoteCallback>> = new Map()
  private statusCallbacks: Set<StatusCallback> = new Set()
  private state: WebSocketState = 'disconnected'
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private baseReconnectDelay = 1000 // 1 second
  private reconnectTimer: NodeJS.Timeout | null = null
  private heartbeatTimer: NodeJS.Timeout | null = null
  private lastPrices: Map<string, number> = new Map() // For calculating change

  // Tiingo IEX WebSocket endpoint
  private readonly WS_URL = 'wss://api.tiingo.com/iex'

  /**
   * Initialize the WebSocket service with API key
   */
  async initialize(apiKey: string): Promise<void> {
    if (!apiKey) {
      console.warn('[WebSocket] No API key provided')
      return
    }

    this.apiKey = apiKey
    console.log('[WebSocket] Service initialized with Tiingo IEX')
  }

  /**
   * Connect to the WebSocket server
   */
  async connect(): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('[WebSocket] Cannot connect without API key')
      this.updateState('failed', 'No API key configured')
      return false
    }

    if (this.state === 'connected' || this.state === 'connecting') {
      console.log('[WebSocket] Already connected or connecting')
      return this.state === 'connected'
    }

    return new Promise((resolve) => {
      this.updateState('connecting')

      // Track timers for proper cleanup in all exit paths
      let connectionTimeout: NodeJS.Timeout | null = null
      let checkAuth: NodeJS.Timeout | null = null

      const cleanupTimers = () => {
        if (connectionTimeout) {
          clearTimeout(connectionTimeout)
          connectionTimeout = null
        }
        if (checkAuth) {
          clearInterval(checkAuth)
          checkAuth = null
        }
      }

      try {
        this.ws = new WebSocket(this.WS_URL)

        this.ws.onopen = () => {
          console.log('[WebSocket] Connection opened to Tiingo IEX, subscribing...')
          this.updateState('authenticating')
          this.sendSubscription()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        this.ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error)
          cleanupTimers() // Clear timers on error
          this.updateState('failed', 'Connection error')
          resolve(false)
        }

        this.ws.onclose = (event) => {
          console.log(`[WebSocket] Connection closed: ${event.code} ${event.reason}`)
          cleanupTimers() // Clear timers on close
          this.stopHeartbeat()

          if (this.state !== 'disconnected') {
            // Unexpected close - attempt reconnect
            this.attemptReconnect()
          }
        }

        // Set up a timeout for connection
        connectionTimeout = setTimeout(() => {
          if (this.state === 'connecting' || this.state === 'authenticating') {
            console.warn('[WebSocket] Connection timeout')
            cleanupTimers()
            this.ws?.close()
            this.updateState('failed', 'Connection timeout')
            resolve(false)
          }
        }, 10000) // 10 second timeout

        // Resolve true when authenticated
        checkAuth = setInterval(() => {
          if (this.state === 'connected') {
            cleanupTimers()
            resolve(true)
          } else if (this.state === 'failed' || this.state === 'disconnected') {
            cleanupTimers()
            resolve(false)
          }
        }, 100)

      } catch (error) {
        console.error('[WebSocket] Failed to create connection:', error)
        cleanupTimers() // Clear timers on exception
        this.updateState('failed', String(error))
        resolve(false)
      }
    })
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    console.log('[WebSocket] Disconnecting...')
    this.updateState('disconnected')

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    this.stopHeartbeat()

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }

    this.reconnectAttempts = 0
    this.subscriptions.clear()
    this.lastPrices.clear()
  }

  /**
   * Subscribe to real-time updates for a symbol
   * Returns unsubscribe function
   */
  subscribe(symbol: string, callback: QuoteCallback): () => void {
    const upperSymbol = symbol.toUpperCase()

    if (!this.subscriptions.has(upperSymbol)) {
      this.subscriptions.set(upperSymbol, new Set())

      // Send subscribe message if connected
      if (this.state === 'connected') {
        this.sendSubscription()
      }
    }

    this.subscriptions.get(upperSymbol)!.add(callback)

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscriptions.get(upperSymbol)
      if (callbacks) {
        callbacks.delete(callback)

        // If no more subscribers, remove from subscriptions
        if (callbacks.size === 0) {
          this.subscriptions.delete(upperSymbol)
          // Note: Tiingo doesn't require explicit unsubscribe - just don't include in next subscription
        }
      }
    }
  }

  /**
   * Subscribe to multiple symbols at once
   */
  subscribeMultiple(symbols: string[], callback: QuoteCallback): () => void {
    const unsubscribers = symbols.map(s => this.subscribe(s, callback))

    return () => {
      unsubscribers.forEach(unsub => unsub())
    }
  }

  /**
   * Register a status change callback
   */
  onStatusChange(callback: StatusCallback): () => void {
    this.statusCallbacks.add(callback)

    // Immediately notify of current state
    callback(this.state)

    return () => {
      this.statusCallbacks.delete(callback)
    }
  }

  /**
   * Get current connection state
   */
  getState(): WebSocketState {
    return this.state
  }

  /**
   * Check if connected and ready
   */
  get isConnected(): boolean {
    return this.state === 'connected'
  }

  /**
   * Get list of subscribed symbols
   */
  getSubscribedSymbols(): string[] {
    return Array.from(this.subscriptions.keys())
  }

  /**
   * Get connection stats
   */
  getStats(): {
    state: WebSocketState
    subscribedSymbols: number
    reconnectAttempts: number
    lastPricesTracked: number
  } {
    return {
      state: this.state,
      subscribedSymbols: this.subscriptions.size,
      reconnectAttempts: this.reconnectAttempts,
      lastPricesTracked: this.lastPrices.size
    }
  }

  /**
   * Get current reconnect attempt count
   */
  getReconnectAttempts(): number {
    return this.reconnectAttempts
  }

  // Private methods

  /**
   * Send subscription message to Tiingo
   * Tiingo uses a single subscription message with auth + tickers
   */
  private sendSubscription(): void {
    if (!this.ws || !this.apiKey) return

    // Get all subscribed tickers (lowercase for Tiingo)
    const tickers = Array.from(this.subscriptions.keys()).map(s => s.toLowerCase())

    // If no tickers, subscribe to SPY as default for connection test
    const tickersToSubscribe = tickers.length > 0 ? tickers : ['spy']

    const subscriptionMessage = {
      eventName: 'subscribe',
      authorization: this.apiKey,
      eventData: {
        thresholdLevel: 5, // Get all updates (most granular)
        tickers: tickersToSubscribe
      }
    }

    this.ws.send(JSON.stringify(subscriptionMessage))
    console.log(`[WebSocket] Sent subscription for ${tickersToSubscribe.length} tickers`)
  }

  private handleMessage(data: string): void {
    try {
      const msg: TiingoMessage = JSON.parse(data)

      switch (msg.messageType) {
        case 'I': // Info/status message
          this.handleInfo(msg)
          break
        case 'H': // Heartbeat
          // Just log occasionally, don't spam
          break
        case 'A': // Data message (trade/quote)
          if (msg.data && msg.service === 'iex') {
            this.handleData(msg.data)
          }
          break
        case 'E': // Error
          console.error('[WebSocket] Tiingo error:', msg.response?.message)
          if (msg.response?.code === 401) {
            this.updateState('failed', 'Authentication failed - check API key')
            this.ws?.close()
          }
          break
      }
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error)
    }
  }

  private handleInfo(msg: TiingoMessage): void {
    if (msg.response) {
      console.log(`[WebSocket] Info: ${msg.response.code} - ${msg.response.message}`)

      if (msg.response.code === 200) {
        // Successfully subscribed
        this.updateState('connected')
        this.reconnectAttempts = 0
        this.startHeartbeat()
      }
    }
  }

  /**
   * Handle Tiingo IEX data message
   * Format: [type, ticker, timestamp, unix_ts, last_price, last_size, ...]
   * Type: 'T' = trade, 'Q' = quote, 'B' = break
   */
  private handleData(data: (string | number)[]): void {
    if (data.length < 6) return

    const type = data[0] as string
    const ticker = (data[1] as string).toUpperCase()
    // data[2] = ISO timestamp string
    const timestamp = data[3] as number // Unix timestamp in milliseconds
    const price = data[4] as number
    const size = data[5] as number

    // Only process trade messages
    if (type !== 'T') return

    // Calculate change from last price
    const lastPrice = this.lastPrices.get(ticker) || price
    const change = price - lastPrice
    const changePercent = lastPrice > 0 ? (change / lastPrice) * 100 : 0

    // Update last price
    this.lastPrices.set(ticker, price)

    // Create quote object
    const quote: Quote = {
      symbol: ticker,
      price,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volume: size,
      high: price, // Would need to track intraday high/low
      low: price,
      open: lastPrice, // Approximation
      previousClose: lastPrice,
      timestamp: timestamp || Date.now(),
      cacheAge: 0,
      dataSource: 'api',
      isFresh: true
    }

    // Notify subscribers
    const callbacks = this.subscriptions.get(ticker)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(quote)
        } catch (error) {
          console.error(`[WebSocket] Callback error for ${ticker}:`, error)
        }
      })
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[WebSocket] Max reconnect attempts reached, falling back to polling')
      this.updateState('failed', 'Max reconnect attempts reached')

      // Clear subscriptions and cached data to prevent memory leak
      // (subscriptions are useless if we can't reconnect)
      this.subscriptions.clear()
      this.lastPrices.clear()

      // Emit fallback event for other services to handle
      window.dispatchEvent(new CustomEvent('websocket-fallback', {
        detail: { reason: 'max_reconnect_attempts' }
      }))
      return
    }

    this.reconnectAttempts++
    // Exponential backoff with jitter (±25% randomization to prevent thundering herd)
    const baseDelay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    const jitter = baseDelay * 0.25 * (Math.random() * 2 - 1) // Random value between -25% and +25%
    const delay = Math.max(this.baseReconnectDelay, Math.round(baseDelay + jitter))

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    this.updateState('reconnecting', `Reconnecting in ${Math.round(delay / 1000)}s...`)

    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }

  private startHeartbeat(): void {
    // Tiingo sends heartbeats automatically, but we can send pings too
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.state === 'connected') {
        try {
          // Tiingo doesn't require explicit pings, but we can check readyState
          if (this.ws.readyState !== WebSocket.OPEN) {
            console.warn('[WebSocket] Connection not open, attempting reconnect')
            this.attemptReconnect()
          }
        } catch {
          // Connection might be dead
        }
      }
    }, 30000) // 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private updateState(newState: WebSocketState, message?: string): void {
    const prevState = this.state
    this.state = newState

    if (prevState !== newState) {
      console.log(`[WebSocket] State changed: ${prevState} -> ${newState}${message ? ` (${message})` : ''}`)

      // Notify all status callbacks
      this.statusCallbacks.forEach(callback => {
        try {
          callback(newState, message)
        } catch (error) {
          console.error('[WebSocket] Status callback error:', error)
        }
      })
    }
  }
}

// Export singleton instance
export const websocketService = new WebSocketService()
