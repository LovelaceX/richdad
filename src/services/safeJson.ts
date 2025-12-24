/**
 * Safe JSON parsing utilities for API responses
 *
 * Handles common error scenarios:
 * - HTML error pages (rate limits, 500 errors)
 * - Invalid JSON responses
 * - Empty responses
 * - Network errors
 */

export type SafeJsonResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; isRateLimit: boolean; isHtml: boolean; statusCode?: number }

/**
 * Safely parse JSON from a fetch Response
 * Returns a structured result with error details instead of throwing
 */
export async function safeJsonParse<T = unknown>(
  response: Response,
  providerName?: string
): Promise<SafeJsonResult<T>> {
  const prefix = providerName ? `[${providerName}] ` : ''

  // Check HTTP status first
  if (!response.ok) {
    // Try to get error message from body
    const text = await response.text().catch(() => '')

    // Check for common rate limit status codes
    if (response.status === 429) {
      return {
        success: false,
        error: `${prefix}Rate limit exceeded (429). Please wait before retrying.`,
        isRateLimit: true,
        isHtml: false,
        statusCode: response.status
      }
    }

    // Check for HTML response (error page)
    if (text.trim().startsWith('<') || text.includes('<!DOCTYPE')) {
      return {
        success: false,
        error: `${prefix}Server returned error page (${response.status}). API may be unavailable.`,
        isRateLimit: response.status === 429,
        isHtml: true,
        statusCode: response.status
      }
    }

    // Try to parse as JSON error
    try {
      const errorJson = JSON.parse(text)
      const errorMsg = errorJson.error || errorJson.message || errorJson.Error || text
      return {
        success: false,
        error: `${prefix}API error (${response.status}): ${errorMsg}`,
        isRateLimit: false,
        isHtml: false,
        statusCode: response.status
      }
    } catch {
      return {
        success: false,
        error: `${prefix}API error (${response.status}): ${text.slice(0, 200) || 'Unknown error'}`,
        isRateLimit: false,
        isHtml: false,
        statusCode: response.status
      }
    }
  }

  // Response is OK, try to parse JSON
  const contentType = response.headers.get('content-type') || ''
  const text = await response.text().catch(() => '')

  // Empty response
  if (!text.trim()) {
    return {
      success: false,
      error: `${prefix}Empty response received`,
      isRateLimit: false,
      isHtml: false,
      statusCode: response.status
    }
  }

  // HTML response even on 200 (some APIs do this for rate limits)
  if (text.trim().startsWith('<') || text.includes('<!DOCTYPE')) {
    // Check if it contains rate limit keywords
    const isRateLimit = /rate.?limit|too.?many.?requests|throttl/i.test(text)
    return {
      success: false,
      error: `${prefix}${isRateLimit ? 'Rate limit exceeded. ' : ''}Received HTML instead of JSON.`,
      isRateLimit,
      isHtml: true,
      statusCode: response.status
    }
  }

  // Warn if content-type doesn't match (but still try to parse)
  if (!contentType.includes('application/json') && !contentType.includes('text/json')) {
    console.warn(`${prefix}Unexpected content-type: ${contentType}, attempting JSON parse anyway`)
  }

  // Try to parse JSON
  try {
    const data = JSON.parse(text) as T
    return {
      success: true,
      data
    }
  } catch (parseError) {
    // Get first 100 chars for debugging
    const preview = text.slice(0, 100).replace(/\n/g, ' ')
    return {
      success: false,
      error: `${prefix}Invalid JSON response: "${preview}..."`,
      isRateLimit: false,
      isHtml: false,
      statusCode: response.status
    }
  }
}

/**
 * Helper to extract a user-friendly error message from safeJsonParse result
 */
export function getErrorMessage(result: SafeJsonResult<unknown>): string {
  if (result.success) return ''
  return result.error
}

/**
 * Wrapper that throws on error (for use with existing try/catch code)
 * More descriptive errors than raw response.json()
 */
export async function parseJsonOrThrow<T = unknown>(
  response: Response,
  providerName?: string
): Promise<T> {
  const result = await safeJsonParse<T>(response, providerName)

  if (!result.success) {
    const error = new Error(result.error) as Error & { isRateLimit?: boolean; statusCode?: number }
    error.isRateLimit = result.isRateLimit
    error.statusCode = result.statusCode
    throw error
  }

  return result.data
}
