/**
 * WebSocket Service for Real-time Market Data Streaming
 *
 * Provides real-time quote updates via Polygon WebSocket API
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

// Polygon WebSocket message types
interface PolygonMessage {
  ev: string  // Event type: 'status', 'T' (trade), 'Q' (quote), 'A' (aggregate)
  status?: string
  message?: string
  sym?: string  // Symbol
  p?: number    // Price
  s?: number    // Size/volume
  t?: number    // Timestamp (nanoseconds)
  c?: number[]  // Conditions
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

  // Polygon WebSocket endpoints
  private readonly WS_URL = 'wss://socket.polygon.io/stocks'

  /**
   * Initialize the WebSocket service with API key
   */
  async initialize(apiKey: string): Promise<void> {
    if (!apiKey) {
      console.warn('[WebSocket] No API key provided')
      return
    }

    this.apiKey = apiKey
    console.log('[WebSocket] Service initialized')
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

      try {
        this.ws = new WebSocket(this.WS_URL)

        this.ws.onopen = () => {
          console.log('[WebSocket] Connection opened, authenticating...')
          this.updateState('authenticating')
          this.authenticate()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        this.ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error)
          this.updateState('failed', 'Connection error')
          resolve(false)
        }

        this.ws.onclose = (event) => {
          console.log(`[WebSocket] Connection closed: ${event.code} ${event.reason}`)
          this.stopHeartbeat()

          if (this.state !== 'disconnected') {
            // Unexpected close - attempt reconnect
            this.attemptReconnect()
          }
        }

        // Set up a timeout for connection
        const connectionTimeout = setTimeout(() => {
          if (this.state === 'connecting' || this.state === 'authenticating') {
            console.warn('[WebSocket] Connection timeout')
            this.ws?.close()
            this.updateState('failed', 'Connection timeout')
            resolve(false)
          }
        }, 10000) // 10 second timeout

        // Resolve true when authenticated
        const checkAuth = setInterval(() => {
          if (this.state === 'connected') {
            clearInterval(checkAuth)
            clearTimeout(connectionTimeout)
            resolve(true)
          } else if (this.state === 'failed' || this.state === 'disconnected') {
            clearInterval(checkAuth)
            clearTimeout(connectionTimeout)
            resolve(false)
          }
        }, 100)

      } catch (error) {
        console.error('[WebSocket] Failed to create connection:', error)
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
        this.sendSubscribe(upperSymbol)
      }
    }

    this.subscriptions.get(upperSymbol)!.add(callback)

    // Return unsubscribe function
    return () => {
      const callbacks = this.subscriptions.get(upperSymbol)
      if (callbacks) {
        callbacks.delete(callback)

        // If no more subscribers, unsubscribe from symbol
        if (callbacks.size === 0) {
          this.subscriptions.delete(upperSymbol)
          if (this.state === 'connected') {
            this.sendUnsubscribe(upperSymbol)
          }
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

  private authenticate(): void {
    if (!this.ws || !this.apiKey) return

    this.ws.send(JSON.stringify({
      action: 'auth',
      params: this.apiKey
    }))
  }

  private sendSubscribe(symbol: string): void {
    if (!this.ws || this.state !== 'connected') return

    // Subscribe to trades for the symbol
    this.ws.send(JSON.stringify({
      action: 'subscribe',
      params: `T.${symbol}`
    }))

    console.log(`[WebSocket] Subscribed to ${symbol}`)
  }

  private sendUnsubscribe(symbol: string): void {
    if (!this.ws || this.state !== 'connected') return

    this.ws.send(JSON.stringify({
      action: 'unsubscribe',
      params: `T.${symbol}`
    }))

    console.log(`[WebSocket] Unsubscribed from ${symbol}`)
  }

  private handleMessage(data: string): void {
    try {
      const messages: PolygonMessage[] = JSON.parse(data)

      for (const msg of messages) {
        switch (msg.ev) {
          case 'status':
            this.handleStatus(msg)
            break
          case 'T': // Trade
            this.handleTrade(msg)
            break
          case 'Q': // Quote (bid/ask)
            // Could handle bid/ask quotes here if needed
            break
          case 'A': // Aggregate (per-second/minute)
            this.handleAggregate(msg)
            break
        }
      }
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error)
    }
  }

  private handleStatus(msg: PolygonMessage): void {
    console.log(`[WebSocket] Status: ${msg.status} - ${msg.message}`)

    if (msg.status === 'auth_success') {
      this.updateState('connected')
      this.reconnectAttempts = 0
      this.startHeartbeat()

      // Resubscribe to all symbols
      for (const symbol of this.subscriptions.keys()) {
        this.sendSubscribe(symbol)
      }
    } else if (msg.status === 'auth_failed') {
      this.updateState('failed', 'Authentication failed - check API key')
      this.ws?.close()
    }
  }

  private handleTrade(msg: PolygonMessage): void {
    if (!msg.sym || !msg.p) return

    const symbol = msg.sym
    const price = msg.p
    const volume = msg.s || 0
    const timestamp = msg.t ? Math.floor(msg.t / 1000000) : Date.now() // Convert nanoseconds to ms

    // Calculate change from last price
    const lastPrice = this.lastPrices.get(symbol) || price
    const change = price - lastPrice
    const changePercent = lastPrice > 0 ? (change / lastPrice) * 100 : 0

    // Update last price
    this.lastPrices.set(symbol, price)

    // Create quote object
    const quote: Quote = {
      symbol,
      price,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volume,
      high: price, // Would need to track intraday high/low
      low: price,
      open: lastPrice, // Approximation
      previousClose: lastPrice,
      timestamp,
      cacheAge: 0,
      dataSource: 'api',
      isFresh: true
    }

    // Notify subscribers
    const callbacks = this.subscriptions.get(symbol)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(quote)
        } catch (error) {
          console.error(`[WebSocket] Callback error for ${symbol}:`, error)
        }
      })
    }
  }

  private handleAggregate(msg: PolygonMessage): void {
    // Handle per-second/minute aggregates similar to trades
    if (!msg.sym || !msg.p) return
    // Could use this for more accurate high/low/volume tracking
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[WebSocket] Max reconnect attempts reached, falling back to polling')
      this.updateState('failed', 'Max reconnect attempts reached')

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
    // Send periodic ping to keep connection alive
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.state === 'connected') {
        try {
          this.ws.send(JSON.stringify({ action: 'ping' }))
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
