import type { NewsItem } from '../renderer/types'

let worker: Worker | null = null
let workerErrorListeners: Set<(error: ErrorEvent) => void> = new Set()

/**
 * Initialize sentiment analysis worker
 * Model loads automatically at worker startup for faster first analysis
 */
export function initializeSentimentAnalysis(): void {
  if (typeof Worker !== 'undefined' && !worker) {
    worker = new Worker(new URL('./sentimentWorker.ts', import.meta.url), {
      type: 'module'
    })

    // Set up global error handler that notifies all pending requests
    worker.onerror = (error) => {
      console.error('[Sentiment] Worker error:', error)
      workerErrorListeners.forEach(listener => listener(error))
    }

    console.log('[Sentiment] Worker initialized, model will pre-load')
  }
}

/**
 * Check if sentiment model is ready
 */
export async function isSentimentModelReady(): Promise<boolean> {
  if (!worker) return false

  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 5000)

    const handler = (e: MessageEvent) => {
      if (e.data.type === 'ready_status') {
        clearTimeout(timeout)
        worker!.removeEventListener('message', handler)
        resolve(e.data.ready)
      }
    }

    worker!.addEventListener('message', handler)
    worker!.postMessage({ type: 'check_ready' })
  })
}

/**
 * Analyze sentiment for news headlines
 * Only analyzes new headlines (not previously scored)
 */
export async function analyzeSentiment(
  headlines: NewsItem[]
): Promise<Map<string, 'positive' | 'negative' | 'neutral'>> {
  if (!worker) {
    console.warn('[Sentiment] Worker not initialized, returning empty')
    return new Map()
  }

  if (headlines.length === 0) {
    return new Map()
  }

  return new Promise((resolve, reject) => {
    // 10s timeout (model should already be loaded at startup)
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error('Sentiment analysis timeout'))
    }, 10000)

    // Cleanup function to remove all listeners
    const cleanup = () => {
      clearTimeout(timeout)
      worker!.removeEventListener('message', handler)
      workerErrorListeners.delete(errorHandler)
    }

    const handler = (e: MessageEvent) => {
      if (e.data.type === 'result') {
        cleanup()
        resolve(new Map(e.data.sentiments))
      } else if (e.data.type === 'error') {
        cleanup()
        reject(new Error(e.data.error))
      }
    }

    // Register error listener for this request (notified by global onerror)
    const errorHandler = (error: ErrorEvent) => {
      cleanup()
      reject(error)
    }

    worker!.addEventListener('message', handler)
    workerErrorListeners.add(errorHandler)

    worker!.postMessage({
      headlines: headlines.map(h => ({
        id: h.id,
        text: h.headline
      }))
    })
  })
}

/**
 * Terminate worker (cleanup)
 */
export function terminateSentimentAnalysis(): void {
  if (worker) {
    worker.terminate()
    worker = null
    workerErrorListeners.clear()
    console.log('[Sentiment] Worker terminated')
  }
}
