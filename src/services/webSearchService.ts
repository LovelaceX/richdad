/**
 * Web Search Service
 *
 * Provides free web search using DuckDuckGo HTML scraping.
 * No API key required - works out of the box!
 */

// Types
export interface WebSearchResult {
  title: string
  url: string
  description: string
}

export interface WebSearchResponse {
  results: WebSearchResult[]
  query: string
  source: 'duckduckgo'
  error?: string
}

// DuckDuckGo HTML endpoint (no API key needed)
const DUCKDUCKGO_HTML = 'https://html.duckduckgo.com/html/'

// Cache for search results (5 minute TTL)
const searchCache = new Map<string, { results: WebSearchResponse; timestamp: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Parse DuckDuckGo HTML search results
 */
function parseSearchResults(html: string): WebSearchResult[] {
  const results: WebSearchResult[] = []

  // DuckDuckGo HTML results are in <div class="result"> elements
  // Each has: <a class="result__a"> for title/url, <a class="result__snippet"> for description

  // Extract result blocks - they're between "result__" class markers
  const resultPattern = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/a>/gi

  let match
  while ((match = resultPattern.exec(html)) !== null && results.length < 5) {
    const [, rawUrl, title, rawDescription] = match

    // DuckDuckGo wraps URLs in a redirect, extract actual URL
    let url = rawUrl
    const uddgMatch = rawUrl.match(/uddg=([^&]+)/)
    if (uddgMatch) {
      url = decodeURIComponent(uddgMatch[1])
    }

    // Clean up description (remove HTML tags)
    const description = rawDescription
      .replace(/<[^>]*>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim()

    if (title && url && description) {
      results.push({
        title: title.trim(),
        url,
        description
      })
    }
  }

  // Fallback: try simpler pattern if regex didn't work
  if (results.length === 0) {
    // Look for result__url and result__title patterns
    const simplePattern = /<a[^>]*class="[^"]*result__url[^"]*"[^>]*>([^<]+)<\/a>[\s\S]*?<a[^>]*class="[^"]*result__a[^"]*"[^>]*>([^<]+)<\/a>/gi

    while ((match = simplePattern.exec(html)) !== null && results.length < 5) {
      const [, urlText, title] = match
      if (title && urlText) {
        results.push({
          title: title.trim(),
          url: urlText.includes('://') ? urlText.trim() : `https://${urlText.trim()}`,
          description: ''
        })
      }
    }
  }

  return results
}

/**
 * Search the web using DuckDuckGo (free, no API key needed!)
 */
export async function searchWeb(query: string): Promise<WebSearchResponse> {
  // Check cache first
  const cacheKey = query.toLowerCase().trim()
  const cached = searchCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log('[WebSearch] Returning cached results for:', query)
    return cached.results
  }

  try {
    console.log('[WebSearch] Searching DuckDuckGo for:', query)

    // POST to DuckDuckGo HTML search
    const formData = new URLSearchParams({ q: query })

    const response = await fetch(DUCKDUCKGO_HTML, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      body: formData
    })

    if (!response.ok) {
      throw new Error(`DuckDuckGo error: ${response.status}`)
    }

    const html = await response.text()
    const results = parseSearchResults(html)

    const result: WebSearchResponse = {
      results,
      query,
      source: 'duckduckgo'
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
      source: 'duckduckgo',
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
   Source: ${r.url}`).join('\n\n')}

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
