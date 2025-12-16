/**
 * RSS Feed Parser
 * Uses native browser DOMParser to parse RSS 2.0 and Atom 1.0 feeds
 * Zero dependencies, privacy-first approach
 */

import type { NewsItem } from '../renderer/types'

/**
 * Parse RSS/Atom feed from XML string
 */
export function parseRSSFeed(xmlString: string, sourceName: string): NewsItem[] {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlString, 'text/xml')

    // Check for XML parse errors
    const parserError = doc.querySelector('parsererror')
    if (parserError) {
      throw new Error('Invalid XML: ' + parserError.textContent)
    }

    const feedType = detectFeedType(doc)

    if (feedType === 'rss') {
      return parseRSS20(doc, sourceName)
    } else if (feedType === 'atom') {
      return parseAtom10(doc, sourceName)
    } else {
      throw new Error('Unknown feed format (not RSS 2.0 or Atom 1.0)')
    }
  } catch (error) {
    console.error(`[RSS Parser] Failed to parse feed from ${sourceName}:`, error)
    return []
  }
}

/**
 * Detect feed type
 */
function detectFeedType(doc: Document): 'rss' | 'atom' | 'unknown' {
  const rssRoot = doc.querySelector('rss')
  if (rssRoot) return 'rss'

  const atomRoot = doc.querySelector('feed[xmlns*="Atom"]')
  if (atomRoot) return 'atom'

  return 'unknown'
}

/**
 * Parse RSS 2.0 feed
 */
function parseRSS20(doc: Document, sourceName: string): NewsItem[] {
  const items = doc.querySelectorAll('item')
  const newsItems: NewsItem[] = []

  items.forEach(item => {
    try {
      const title = getTextContent(item, 'title')
      const link = getTextContent(item, 'link')
      const pubDate = getTextContent(item, 'pubDate')
      const description = getTextContent(item, 'description')
      const guid = getTextContent(item, 'guid') || link || `rss-${Date.now()}-${Math.random()}`

      if (!title) return // Skip items without title

      // Extract tickers from title + description
      const tickers = extractTickersFromText(title + ' ' + description)

      newsItems.push({
        id: guid,
        headline: title,
        summary: stripHTMLTags(description),
        source: sourceName,
        url: link || '#',
        timestamp: parseDateString(pubDate),
        sentiment: 'neutral', // Will be analyzed by FinBERT later
        tickers
      })
    } catch (error) {
      console.warn('[RSS Parser] Failed to parse RSS item:', error)
    }
  })

  return newsItems
}

/**
 * Parse Atom 1.0 feed
 */
function parseAtom10(doc: Document, sourceName: string): NewsItem[] {
  const entries = doc.querySelectorAll('entry')
  const newsItems: NewsItem[] = []

  entries.forEach(entry => {
    try {
      const title = getTextContent(entry, 'title')
      const linkElement = entry.querySelector('link')
      const link = linkElement?.getAttribute('href') || ''
      const updated = getTextContent(entry, 'updated')
      const summary = getTextContent(entry, 'summary')
      const id = getTextContent(entry, 'id') || link || `atom-${Date.now()}-${Math.random()}`

      if (!title) return // Skip entries without title

      // Extract tickers from title + summary
      const tickers = extractTickersFromText(title + ' ' + summary)

      newsItems.push({
        id,
        headline: title,
        summary: stripHTMLTags(summary),
        source: sourceName,
        url: link || '#',
        timestamp: parseDateString(updated),
        sentiment: 'neutral', // Will be analyzed by FinBERT later
        tickers
      })
    } catch (error) {
      console.warn('[RSS Parser] Failed to parse Atom entry:', error)
    }
  })

  return newsItems
}

/**
 * Get text content from element selector
 */
function getTextContent(parent: Element, selector: string): string {
  const element = parent.querySelector(selector)
  return element?.textContent?.trim() || ''
}

/**
 * Strip HTML tags from text
 */
function stripHTMLTags(html: string): string {
  if (!html) return ''

  // Use DOMParser to safely strip HTML
  const tempDoc = new DOMParser().parseFromString(html, 'text/html')
  return tempDoc.body.textContent?.trim() || ''
}

/**
 * Parse date string to timestamp (milliseconds)
 */
function parseDateString(dateStr: string): number {
  if (!dateStr) return Date.now()

  try {
    const timestamp = new Date(dateStr).getTime()
    return isNaN(timestamp) ? Date.now() : timestamp
  } catch {
    return Date.now()
  }
}

/**
 * Extract ticker symbols from text
 * Looks for patterns like $AAPL, TSLA, etc.
 */
function extractTickersFromText(text: string): string[] {
  if (!text) return []

  const tickerPattern = /\$?[A-Z]{1,5}\b/g
  const matches = text.match(tickerPattern) || []

  // Remove $ prefix and deduplicate
  const tickers = [...new Set(matches.map(t => t.replace('$', '')))]

  // Filter out common words that look like tickers
  const blacklist = ['CEO', 'CFO', 'IPO', 'ETF', 'USA', 'NYSE', 'NASDAQ', 'SEC', 'FDA', 'EPA', 'FBI', 'DOJ']

  return tickers.filter(t => !blacklist.includes(t))
}
