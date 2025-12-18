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

    if (response.status === 400) {
      const data = await response.json()
      if (data.error_code === 400 && data.error_message?.includes('api_key')) {
        return {
          valid: false,
          message: 'Invalid API key'
        }
      }
      return {
        valid: false,
        message: data.error_message || 'Bad request'
      }
    }

    if (response.status === 401) {
      return {
        valid: false,
        message: 'Invalid API key'
      }
    }

    if (!response.ok) {
      return {
        valid: false,
        message: `HTTP error: ${response.status}`
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
        message: 'Connection successful'
      }
    }

    // Unknown response structure, but no error
    return {
      valid: true,
      message: 'API key appears valid'
    }

  } catch (error) {
    console.error('[FRED Validator] Test failed:', error)
    return {
      valid: false,
      message: error instanceof Error ? error.message : 'Network error'
    }
  }
}
