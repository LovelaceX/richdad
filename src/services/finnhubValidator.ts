export interface ValidationResult {
  valid: boolean
  message: string
}

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1'

/**
 * Test Finnhub API key validity
 * Uses lightweight /quote endpoint to verify authentication
 */
export async function testFinnhubKey(apiKey: string): Promise<ValidationResult> {
  if (!apiKey || apiKey.trim().length === 0) {
    return { valid: false, message: 'API key is required' }
  }

  try {
    const url = `${FINNHUB_BASE_URL}/quote?symbol=AAPL&token=${apiKey}`
    const response = await fetch(url)

    // Check for authentication errors
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { valid: false, message: 'Invalid API key' }
      }
      if (response.status === 429) {
        // Rate limit hit, but key is valid
        return { valid: true, message: 'Valid (rate limit reached)' }
      }
      return { valid: false, message: `HTTP error: ${response.status}` }
    }

    const data = await response.json()

    // Validate response structure
    // Valid Finnhub quote response has: c (current price), t (timestamp), etc.
    if (typeof data.c === 'number' && data.t > 0) {
      return { valid: true, message: 'Connection successful' }
    }

    // Check for API error responses
    if (data.error) {
      return { valid: false, message: data.error }
    }

    return { valid: false, message: 'Unexpected response format' }
  } catch (error) {
    console.error('[Finnhub Validator] Test failed:', error)
    return {
      valid: false,
      message: 'Network error. Please check your connection.'
    }
  }
}

/**
 * Fetch live quote from Finnhub
 * Returns quote data or null on failure
 */
export async function fetchFinnhubQuote(symbol: string, apiKey: string) {
  try {
    const url = `${FINNHUB_BASE_URL}/quote?symbol=${symbol}&token=${apiKey}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()

    return {
      symbol,
      price: data.c,        // Current price
      change: data.d,       // Change
      changePercent: data.dp, // Change percent
      high: data.h,         // High price of the day
      low: data.l,          // Low price of the day
      open: data.o,         // Open price of the day
      previousClose: data.pc, // Previous close price
      timestamp: data.t,    // Unix timestamp
    }
  } catch (error) {
    console.error(`[Finnhub] Failed to fetch quote for ${symbol}:`, error)
    return null
  }
}
