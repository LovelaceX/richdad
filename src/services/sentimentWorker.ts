import { pipeline } from '@xenova/transformers'

let classifier: any = null
let modelLoading: Promise<void> | null = null
let modelReady = false

// Initialize FinBERT model (called once at worker startup)
async function initializeModel(): Promise<void> {
  if (classifier) return
  if (modelLoading) return modelLoading

  modelLoading = (async () => {
    console.log('[Sentiment Worker] Loading FinBERT model at startup...')
    const startTime = Date.now()
    classifier = await pipeline(
      'sentiment-analysis',
      'Xenova/finbert',
      { quantized: true } // Use quantized ONNX model for faster loading
    )
    modelReady = true
    console.log(`[Sentiment Worker] FinBERT model loaded in ${Date.now() - startTime}ms`)
  })()

  return modelLoading
}

// Load model immediately when worker starts (not on first message)
initializeModel().catch(err => {
  console.error('[Sentiment Worker] Failed to pre-load model:', err)
})

// Handle messages from main thread
self.onmessage = async (e) => {
  const { type, headlines } = e.data

  // Handle ready check
  if (type === 'check_ready') {
    self.postMessage({ type: 'ready_status', ready: modelReady })
    return
  }

  try {
    // Wait for model if not yet ready (should be rare after startup)
    if (!modelReady) {
      await initializeModel()
    }

    const sentiments = new Map<string, 'positive' | 'negative' | 'neutral'>()

    for (const headline of headlines) {
      const result = await classifier(headline.text)

      // FinBERT returns: { label: 'positive' | 'negative' | 'neutral', score: 0.95 }
      const sentiment = result[0].label.toLowerCase() as 'positive' | 'negative' | 'neutral'
      sentiments.set(headline.id, sentiment)
    }

    self.postMessage({ type: 'result', sentiments: Array.from(sentiments.entries()) })

  } catch (error: any) {
    console.error('[Sentiment Worker] Analysis failed:', error)
    self.postMessage({ type: 'error', error: error.message })
  }
}
