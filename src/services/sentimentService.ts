import type { NewsItem } from '../renderer/types'

let worker: Worker | null = null

/**
 * Initialize sentiment analysis worker
 */
export function initializeSentimentAnalysis(): void {
  if (typeof Worker !== 'undefined' && !worker) {
    worker = new Worker(new URL('./sentimentWorker.ts', import.meta.url), {
      type: 'module'
    })
  }
}

/**
 * Analyze sentiment for news headlines
 * Only analyzes new headlines (not previously scored)
 */
export async function analyzeSentiment(
  headlines: NewsItem[]
): Promise<Map<string, 'positive' | 'negative' | 'neutral'>> {
  if (!worker) {
    console.warn('Sentiment worker not initialized, returning neutral')
    return new Map()
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Sentiment analysis timeout'))
    }, 30000) // 30s timeout

    worker!.onmessage = (e) => {
      clearTimeout(timeout)
      resolve(new Map(e.data.sentiments))
    }

    worker!.onerror = (error) => {
      clearTimeout(timeout)
      console.error('Sentiment worker error:', error)
      reject(error)
    }

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
  }
}
