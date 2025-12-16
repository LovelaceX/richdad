import { pipeline } from '@xenova/transformers'

let classifier: any = null

// Initialize FinBERT model
async function initializeModel() {
  if (!classifier) {
    console.log('Loading FinBERT sentiment model...')
    classifier = await pipeline(
      'sentiment-analysis',
      'Xenova/finbert',
      { quantized: true } // Use quantized ONNX model
    )
    console.log('FinBERT model loaded')
  }
}

// Handle messages from main thread
self.onmessage = async (e) => {
  const { headlines } = e.data

  try {
    await initializeModel()

    const sentiments = new Map<string, 'positive' | 'negative' | 'neutral'>()

    for (const headline of headlines) {
      const result = await classifier(headline.text)

      // FinBERT returns: { label: 'positive' | 'negative' | 'neutral', score: 0.95 }
      const sentiment = result[0].label.toLowerCase() as 'positive' | 'negative' | 'neutral'
      sentiments.set(headline.id, sentiment)
    }

    self.postMessage({ sentiments: Array.from(sentiments.entries()) })

  } catch (error: any) {
    console.error('Sentiment analysis failed:', error)
    self.postMessage({ error: error.message })
  }
}
