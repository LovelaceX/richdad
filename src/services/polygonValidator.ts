/**
 * Polygon.io API Key Validator
 * Tests if a given API key is valid by making a lightweight test request
 */

const POLYGON_BASE_URL = 'https://api.polygon.io'

export interface ValidationResult {
  valid: boolean
  message: string
  tier?: 'basic' | 'starter' | 'developer' | 'advanced'
}

/**
 * Test if a Polygon API key is valid
 * Makes a lightweight market status request
 *
 * @param apiKey - The Polygon API key to test
 * @returns Promise<ValidationResult> - Validation result with status and message
 */
export async function testPolygonKey(apiKey: string): Promise<ValidationResult> {
  if (!apiKey || apiKey.trim().length === 0) {
    return {
      valid: false,
      message: 'API key is empty'
    }
  }

  try {
    // Use market status endpoint (lightweight, doesn't count against rate limits)
    const url = `${POLYGON_BASE_URL}/v1/marketstatus/now?apiKey=${apiKey}`

    const response = await fetch(url)

    if (response.status === 401) {
      return {
        valid: false,
        message: 'Invalid API key'
      }
    }

    if (response.status === 403) {
      return {
        valid: false,
        message: 'API key does not have required permissions'
      }
    }

    if (!response.ok) {
      return {
        valid: false,
        message: `HTTP error: ${response.status}`
      }
    }

    const data = await response.json()

    // Check for valid market status response
    if (data.market !== undefined || data.afterHours !== undefined || data.earlyHours !== undefined) {
      return {
        valid: true,
        message: 'Connection successful',
        tier: 'basic'  // Free tier
      }
    }

    // Check for error response
    if (data.status === 'ERROR' || data.error) {
      return {
        valid: false,
        message: data.message || data.error || 'API returned an error'
      }
    }

    // Unknown response structure, but no error
    return {
      valid: true,
      message: 'API key appears valid'
    }

  } catch (error) {
    console.error('[Polygon Validator] Test failed:', error)
    return {
      valid: false,
      message: error instanceof Error ? error.message : 'Network error'
    }
  }
}

/**
 * Check if market is currently open via Polygon
 *
 * @param apiKey - Polygon API key
 * @returns Promise<boolean>
 */
export async function isMarketOpen(apiKey: string): Promise<boolean> {
  try {
    const url = `${POLYGON_BASE_URL}/v1/marketstatus/now?apiKey=${apiKey}`
    const response = await fetch(url)

    if (!response.ok) return false

    const data = await response.json()
    return data.market === 'open'
  } catch {
    return false
  }
}
