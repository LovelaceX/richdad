/**
 * FRED API Key Validator
 * Tests if a given API key is valid by making a lightweight test request
 *
 * API Docs: https://fred.stlouisfed.org/docs/api/fred/
 */

const FRED_BASE_URL = 'https://api.stlouisfed.org/fred'

export interface ValidationResult {
  valid: boolean
  message: string
}

/**
 * Test if a FRED API key is valid
 * Makes a lightweight sources request
 *
 * @param apiKey - The FRED API key to test
 * @returns Promise<ValidationResult> - Validation result with status and message
 */
export async function testFredKey(apiKey: string): Promise<ValidationResult> {
  if (!apiKey || apiKey.trim().length === 0) {
    return {
      valid: false,
      message: 'API key is empty'
    }
  }

  // FRED keys are 32 character alphanumeric strings
  if (apiKey.trim().length !== 32) {
    return {
      valid: false,
      message: 'FRED API keys are 32 characters'
    }
  }

  try {
    // Use sources endpoint (lightweight, returns list of data sources)
    const url = `${FRED_BASE_URL}/sources?api_key=${apiKey}&file_type=json&limit=1`

    const response = await fetch(url)

    // Handle specific HTTP status codes with helpful messages
    if (response.status === 400) {
      const data = await response.json().catch(() => ({}))
      if (data.error_message?.toLowerCase().includes('api_key')) {
        return {
          valid: false,
          message: 'Invalid API key format - check your key at fred.stlouisfed.org'
        }
      }
      return {
        valid: false,
        message: data.error_message || 'Invalid request format'
      }
    }

    if (response.status === 401 || response.status === 403) {
      return {
        valid: false,
        message: 'API key not authorized - verify your key at fred.stlouisfed.org'
      }
    }

    if (response.status === 429) {
      return {
        valid: false,
        message: 'Rate limit exceeded - wait a minute and try again'
      }
    }

    if (response.status >= 500) {
      return {
        valid: false,
        message: 'FRED server error - try again later'
      }
    }

    if (!response.ok) {
      return {
        valid: false,
        message: `Connection failed (HTTP ${response.status})`
      }
    }

    const data = await response.json()

    // Check for error in response
    if (data.error_code) {
      return {
        valid: false,
        message: data.error_message || 'API returned an error'
      }
    }

    // Check for valid sources response
    if (data.sources !== undefined) {
      return {
        valid: true,
        message: 'Connected successfully'
      }
    }

    // Unknown response structure, but no error
    return {
      valid: true,
      message: 'API key verified'
    }

  } catch (error) {
    console.error('[FRED Validator] Test failed:', error)

    // Provide helpful messages for common network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        valid: false,
        message: 'Network error - check your internet connection'
      }
    }

    return {
      valid: false,
      message: 'Connection failed - check your internet connection'
    }
  }
}
