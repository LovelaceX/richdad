/**
 * Web Search Service
 *
 * Provides web search capability for historical market data queries.
 * Uses Brave Search API (2000 free searches/month).
 */

// Types
export interface WebSearchResult {
  title: string
  url: string
  description: string
  date?: string
}

export interface WebSearchResponse {
  results: WebSearchResult[]
  query: string
  source: 'brave' | 'fallback'
  error?: string
}

// Brave Search API endpoint
const BRAVE_SEARCH_ENDPOINT = 'https://api.search.brave.com/res/v1/web/search'

// Cache for search results (5 minute TTL)
const searchCache = new Map<string, { results: WebSearchResponse; timestamp: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Search the web using Brave Search API
 */
export async function searchWeb(
  query: string,
  apiKey?: string
): Promise<WebSearchResponse> {
  // Return empty results if no API key
  if (!apiKey) {
    return {
      results: [],
      query,
      source: 'fallback',
      error: 'No Brave Search API key configured'
    }
  }

  // Check cache first
  const cacheKey = query.toLowerCase().trim()
  const cached = searchCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log('[WebSearch] Returning cached results for:', query)
    return cached.results
  }

  try {
    console.log('[WebSearch] Searching for:', query)

    const response = await fetch(
      `${BRAVE_SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}&count=5`,
      {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': apiKey
        }
      }
    )

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid Brave Search API key')
      }
      if (response.status === 429) {
        throw new Error('Brave Search rate limit exceeded')
      }
      throw new Error(`Brave Search error: ${response.status}`)
    }

    const data = await response.json()

    const result: WebSearchResponse = {
      results: data.web?.results?.map((r: {
        title?: string
        url?: string
        description?: string
        age?: string
      }) => ({
        title: r.title || 'Untitled',
        url: r.url || '',
        description: r.description || '',
        date: r.age
      })) || [],
      query,
      source: 'brave'
    }

    // Cache the results
    searchCache.set(cacheKey, { results: result, timestamp: Date.now() })

    console.log('[WebSearch] Found', result.results.length, 'results')
    return result

  } catch (error) {
    console.warn('[WebSearch] Error:', error)
    return {
      results: [],
      query,
      source: 'fallback',
      error: error instanceof Error ? error.message : 'Search failed'
    }
  }
}

/**
 * Format search results for inclusion in AI prompt
 */
export function formatSearchResultsForPrompt(results: WebSearchResult[]): string {
  if (results.length === 0) return ''

  return `
**WEB SEARCH RESULTS:**
${results.map((r, i) => `${i + 1}. ${r.title}
   ${r.description}
   Source: ${r.url}${r.date ? ` (${r.date})` : ''}`).join('\n\n')}

Use these sources to answer the user's question about historical events. Cite the sources in your response.
`
}

/**
 * Clear the search cache
 */
export function clearSearchCache(): void {
  searchCache.clear()
  console.log('[WebSearch] Cache cleared')
}

/**
 * Test if a Brave Search API key is valid
 */
export async function testBraveSearchKey(apiKey: string): Promise<{ valid: boolean; message: string }> {
  if (!apiKey) {
    return { valid: false, message: 'No API key provided' }
  }

  try {
    const response = await fetch(
      `${BRAVE_SEARCH_ENDPOINT}?q=test&count=1`,
      {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': apiKey
        }
      }
    )

    if (response.ok) {
      return { valid: true, message: 'API key verified' }
    }

    if (response.status === 401) {
      return { valid: false, message: 'Invalid API key' }
    }

    if (response.status === 429) {
      return { valid: true, message: 'API key valid (rate limited)' }
    }

    return { valid: false, message: `API error: ${response.status}` }

  } catch (error) {
    return { valid: false, message: 'Connection failed' }
  }
}
