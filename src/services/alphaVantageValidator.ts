/**
 * Alpha Vantage API Key Validator
 * Tests if a given API key is valid by making a lightweight test request
 */

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query'

export interface ValidationResult {
  valid: boolean
  message: string
  remainingCalls?: number
}

/**
 * Test if an Alpha Vantage API key is valid
 * Makes a lightweight GLOBAL_QUOTE request for IBM stock
 *
 * @param apiKey - The Alpha Vantage API key to test
 * @returns Promise<ValidationResult> - Validation result with status and message
 */
export async function testAlphaVantageKey(apiKey: string): Promise<ValidationResult> {
  if (!apiKey || apiKey.trim().length === 0) {
    return {
      valid: false,
      message: 'API key is empty'
    }
  }

  try {
    // Use GLOBAL_QUOTE endpoint (lightweight, counts as 1 API call)
    const url = `${ALPHA_VANTAGE_BASE_URL}?function=GLOBAL_QUOTE&symbol=IBM&apikey=${apiKey}`

    const response = await fetch(url)

    if (!response.ok) {
      return {
        valid: false,
        message: `HTTP error: ${response.status}`
      }
    }

    const data = await response.json()

    // Check for API error messages
    if (data['Error Message']) {
      return {
        valid: false,
        message: 'Invalid API key or malformed request'
      }
    }

    // Check for rate limit message (Note field)
    if (data['Note']) {
      // Rate limit hit, but key is valid
      return {
        valid: true,
        message: 'API key valid (rate limit reached)',
        remainingCalls: 0
      }
    }

    // Check for Information message (premium feature on free tier)
    if (data['Information']) {
      return {
        valid: false,
        message: 'API key may be invalid or require premium tier'
      }
    }

    // Check if we got valid data
    if (data['Global Quote'] && data['Global Quote']['01. symbol']) {
      return {
        valid: true,
        message: 'Connection successful'
      }
    }

    // Unknown response structure
    return {
      valid: false,
      message: 'Unexpected API response format'
    }

  } catch (error) {
    console.error('[Alpha Vantage Validator] Test failed:', error)
    return {
      valid: false,
      message: error instanceof Error ? error.message : 'Network error'
    }
  }
}

/**
 * Estimate remaining API calls for the day (approximate)
 * Alpha Vantage free tier: 25 calls/day, 5 calls/minute
 *
 * Note: This is an estimate based on cache behavior, not actual API data
 */
export function estimateRemainingCalls(callsToday: number): number {
  const MAX_CALLS_PER_DAY = 25
  const remaining = Math.max(0, MAX_CALLS_PER_DAY - callsToday)
  return remaining
}
