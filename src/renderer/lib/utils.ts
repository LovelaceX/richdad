// Format price with 2 decimal places
export function formatPrice(price: number): string {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// Format percentage with sign
export function formatPercent(percent: number): string {
  const sign = percent >= 0 ? '+' : ''
  return `${sign}${percent.toFixed(2)}%`
}

// Format change with sign
export function formatChange(change: number): string {
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(2)}`
}

// Format large numbers (volume)
export function formatVolume(volume: number): string {
  if (volume >= 1_000_000_000) {
    return `${(volume / 1_000_000_000).toFixed(2)}B`
  }
  if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(2)}M`
  }
  if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(2)}K`
  }
  return volume.toString()
}

// Format timestamp to time string
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Format timestamp to relative time
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

// Get color class based on value
export function getColorClass(value: number): string {
  if (value > 0) return 'ticker-up'
  if (value < 0) return 'ticker-down'
  return 'text-gray-400'
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Clamp number between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// Debounce function
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

/**
 * Retry with exponential backoff
 * Useful for API calls that may fail due to rate limits or transient errors
 *
 * @param fn - Async function to retry
 * @param options - Retry configuration
 * @returns Result of the function or throws after max retries
 */
export interface RetryOptions {
  maxRetries?: number       // Maximum retry attempts (default: 3)
  baseDelayMs?: number      // Initial delay in ms (default: 1000)
  maxDelayMs?: number       // Maximum delay cap (default: 30000)
  backoffFactor?: number    // Exponential factor (default: 2)
  retryOn?: (error: Error) => boolean  // Predicate to decide if error is retryable
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30000,
    backoffFactor = 2,
    retryOn = () => true  // Retry all errors by default
  } = options

  let lastError: Error = new Error('Unknown error')

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Check if this error should be retried
      if (!retryOn(lastError)) {
        throw lastError
      }

      // Don't wait after last attempt
      if (attempt < maxRetries) {
        // Exponential backoff with jitter
        const delay = Math.min(
          baseDelayMs * Math.pow(backoffFactor, attempt),
          maxDelayMs
        )
        // Add ±20% jitter to prevent thundering herd
        const jitter = delay * 0.2 * (Math.random() * 2 - 1)
        const actualDelay = Math.round(delay + jitter)

        console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${actualDelay}ms...`)
        await new Promise(resolve => setTimeout(resolve, actualDelay))
      }
    }
  }

  throw lastError
}

/**
 * Common retry predicates
 */
export const retryPredicates = {
  // Retry on network errors
  onNetworkError: (error: Error) =>
    error.message.includes('fetch') ||
    error.message.includes('network') ||
    error.message.includes('ECONNREFUSED'),

  // Retry on rate limit (HTTP 429)
  onRateLimit: (error: Error) =>
    error.message.includes('429') ||
    error.message.toLowerCase().includes('rate limit'),

  // Retry on server errors (5xx)
  onServerError: (error: Error) =>
    /5\d{2}/.test(error.message),

  // Retry on common transient errors
  onTransientError: (error: Error) =>
    retryPredicates.onNetworkError(error) ||
    retryPredicates.onRateLimit(error) ||
    retryPredicates.onServerError(error)
}

/**
 * Circuit Breaker Pattern
 * Prevents hammering failing services by tracking failures and opening circuit
 *
 * States:
 * - CLOSED: Normal operation, requests go through
 * - OPEN: Too many failures, requests fail immediately
 * - HALF_OPEN: After cooldown, allow one test request
 */
export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface CircuitBreakerOptions {
  failureThreshold?: number    // Failures before opening (default: 5)
  resetTimeoutMs?: number      // Time before trying again (default: 30000)
  onStateChange?: (state: CircuitState, name: string) => void
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED'
  private failures = 0
  private lastFailureTime = 0
  private readonly name: string
  private readonly failureThreshold: number
  private readonly resetTimeoutMs: number
  private readonly onStateChange?: (state: CircuitState, name: string) => void

  constructor(name: string, options: CircuitBreakerOptions = {}) {
    this.name = name
    this.failureThreshold = options.failureThreshold ?? 5
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30000
    this.onStateChange = options.onStateChange
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === 'OPEN') {
      const timeSinceFailure = Date.now() - this.lastFailureTime
      if (timeSinceFailure >= this.resetTimeoutMs) {
        this.setState('HALF_OPEN')
      } else {
        throw new Error(`Circuit breaker [${this.name}] is OPEN. Try again in ${Math.ceil((this.resetTimeoutMs - timeSinceFailure) / 1000)}s`)
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.failures = 0
    if (this.state !== 'CLOSED') {
      this.setState('CLOSED')
    }
  }

  private onFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.failures >= this.failureThreshold) {
      this.setState('OPEN')
    }
  }

  private setState(newState: CircuitState): void {
    if (this.state !== newState) {
      console.log(`[CircuitBreaker] ${this.name}: ${this.state} → ${newState}`)
      this.state = newState
      this.onStateChange?.(newState, this.name)
    }
  }

  getState(): CircuitState {
    return this.state
  }

  getFailures(): number {
    return this.failures
  }

  reset(): void {
    this.failures = 0
    this.setState('CLOSED')
  }
}

// Global circuit breakers for API providers
export const circuitBreakers = {
  polygon: new CircuitBreaker('Polygon'),
  twelveData: new CircuitBreaker('TwelveData'),
  finnhub: new CircuitBreaker('Finnhub'),
  ai: new CircuitBreaker('AI', { failureThreshold: 3, resetTimeoutMs: 60000 })
}

/**
 * Network Status Detection
 * Monitors online/offline status and notifies listeners
 */
type NetworkStatusListener = (isOnline: boolean) => void

class NetworkMonitor {
  private listeners: Set<NetworkStatusListener> = new Set()
  private _isOnline: boolean

  constructor() {
    this._isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.setOnline(true))
      window.addEventListener('offline', () => this.setOnline(false))
    }
  }

  private setOnline(status: boolean): void {
    if (this._isOnline !== status) {
      this._isOnline = status
      console.log(`[Network] Status changed: ${status ? 'ONLINE' : 'OFFLINE'}`)
      this.listeners.forEach(listener => listener(status))
    }
  }

  get isOnline(): boolean {
    return this._isOnline
  }

  subscribe(listener: NetworkStatusListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Check if we should attempt network requests
   * Returns false if offline, allowing fallback to cached data
   */
  canMakeRequests(): boolean {
    return this._isOnline
  }
}

export const networkMonitor = new NetworkMonitor()

/**
 * Check if device is online before making API calls
 * Use this at the start of fetch functions to fail fast when offline
 */
export function assertOnline(): void {
  if (!networkMonitor.isOnline) {
    throw new Error('Device is offline. Please check your internet connection.')
  }
}
