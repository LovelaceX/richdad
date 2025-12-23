/**
 * Error Log Helpers
 *
 * Functions for persisting errors to IndexedDB, classifying them,
 * and providing resolution suggestions.
 */

import { db, type ErrorLogEntry, type ErrorService, type ErrorSeverity, type ErrorResolutionType } from './db'

// Resolution metadata for error classification
interface ResolutionMetadata {
  resolutionType: ErrorResolutionType
  resolutionHint: string
  resolutionTarget?: string
}

// Debounce cleanup to avoid excessive DB operations
let cleanupTimeout: ReturnType<typeof setTimeout> | null = null

// Track recent errors for deduplication (service+message -> timestamp)
const recentErrors = new Map<string, number>()
const DEDUP_WINDOW_MS = 60000 // 60 seconds

/**
 * Classify an error and get resolution suggestions
 */
export function getResolutionForError(
  service: ErrorService,
  message: string,
  errorCode?: string
): ResolutionMetadata {
  const lowerMessage = message.toLowerCase()

  // API Rate Limit errors
  if (
    lowerMessage.includes('rate limit') ||
    lowerMessage.includes('429') ||
    lowerMessage.includes('too many requests') ||
    errorCode === 'RATE_LIMIT'
  ) {
    return {
      resolutionType: 'clear_cache',
      resolutionHint: 'API daily limit reached. Clear cache to reset counters or wait until tomorrow.',
      resolutionTarget: 'danger'
    }
  }

  // Authentication errors
  if (
    lowerMessage.includes('401') ||
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('invalid key') ||
    lowerMessage.includes('invalid api') ||
    lowerMessage.includes('authentication') ||
    errorCode === 'AUTH_FAILED'
  ) {
    return {
      resolutionType: 'open_settings',
      resolutionHint: 'API key is invalid or expired. Check your API key in Settings.',
      resolutionTarget: 'data-sources'
    }
  }

  // Network/connection errors
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('fetch') ||
    lowerMessage.includes('timeout') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('failed to fetch') ||
    lowerMessage.includes('econnrefused')
  ) {
    return {
      resolutionType: 'retry',
      resolutionHint: 'Network connection issue. Check your internet and try again.',
      resolutionTarget: undefined
    }
  }

  // AI-specific errors
  if (service === 'ai') {
    if (lowerMessage.includes('quota') || lowerMessage.includes('budget') || lowerMessage.includes('limit')) {
      return {
        resolutionType: 'help_article',
        resolutionHint: 'AI daily call limit reached. View AI usage limits.',
        resolutionTarget: 'api-limits'
      }
    }
    return {
      resolutionType: 'open_settings',
      resolutionHint: 'Check your AI provider configuration.',
      resolutionTarget: 'ai-copilot'
    }
  }

  // WebSocket-specific errors
  if (service === 'websocket') {
    if (lowerMessage.includes('reconnect')) {
      return {
        resolutionType: 'retry',
        resolutionHint: 'Real-time connection is reconnecting. This usually resolves automatically.',
        resolutionTarget: undefined
      }
    }
    return {
      resolutionType: 'help_article',
      resolutionHint: 'WebSocket connection issue. View troubleshooting guide.',
      resolutionTarget: 'troubleshooting'
    }
  }

  // Market data specific
  if (service === 'market') {
    return {
      resolutionType: 'open_settings',
      resolutionHint: 'Market data error. Check your data provider settings.',
      resolutionTarget: 'data-sources'
    }
  }

  // Default fallback
  return {
    resolutionType: 'help_article',
    resolutionHint: 'View troubleshooting guide for more information.',
    resolutionTarget: 'troubleshooting'
  }
}

/**
 * Persist an error to the error log
 * Includes deduplication and auto-classification
 */
export async function persistError(
  service: ErrorService,
  message: string,
  options?: {
    errorCode?: string
    severity?: ErrorSeverity
    context?: ErrorLogEntry['context']
  }
): Promise<void> {
  try {
    // Deduplication: check if same error was logged recently
    const dedupKey = `${service}:${message}`
    const lastLogged = recentErrors.get(dedupKey)
    const now = Date.now()

    if (lastLogged && now - lastLogged < DEDUP_WINDOW_MS) {
      // Skip duplicate error
      console.log('[ErrorLog] Skipping duplicate error:', service, message.slice(0, 50))
      return
    }

    // Mark as recently logged
    recentErrors.set(dedupKey, now)

    // Clean up old entries from dedup map
    if (recentErrors.size > 100) {
      for (const [key, timestamp] of recentErrors.entries()) {
        if (now - timestamp > DEDUP_WINDOW_MS) {
          recentErrors.delete(key)
        }
      }
    }

    // Get resolution metadata
    const resolution = getResolutionForError(service, message, options?.errorCode)

    // Create error entry
    const entry: ErrorLogEntry = {
      timestamp: now,
      service,
      message,
      severity: options?.severity || 'error',
      errorCode: options?.errorCode,
      resolved: false,
      ...resolution,
      context: options?.context
    }

    // Save to database
    await db.errorLogs.add(entry)
    console.log('[ErrorLog] Persisted error:', service, message.slice(0, 50))

    // Schedule cleanup
    scheduleCleanup()
  } catch (error) {
    console.error('[ErrorLog] Failed to persist error:', error)
  }
}

/**
 * Schedule cleanup of old errors (debounced)
 */
function scheduleCleanup(): void {
  if (cleanupTimeout) return

  cleanupTimeout = setTimeout(async () => {
    cleanupTimeout = null
    await cleanupOldErrors()
  }, 5000)
}

/**
 * Clean up old errors from the database
 * - Resolved errors older than 7 days
 * - Unresolved errors older than 30 days
 * - Keep max 200 entries
 */
export async function cleanupOldErrors(): Promise<void> {
  try {
    const now = Date.now()
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

    // Delete old resolved errors (7 days)
    // IndexedDB stores booleans as 0/1 in indexes
    const oldResolved = await db.errorLogs
      .where('resolved')
      .equals(1)
      .and((e) => e.timestamp < sevenDaysAgo)
      .toArray()

    if (oldResolved.length > 0) {
      await db.errorLogs.bulkDelete(oldResolved.map((e) => e.id!))
      console.log(`[ErrorLog] Cleaned up ${oldResolved.length} old resolved errors`)
    }

    // Delete old unresolved errors (30 days)
    // IndexedDB stores booleans as 0/1 in indexes
    const oldUnresolved = await db.errorLogs
      .where('resolved')
      .equals(0)
      .and((e) => e.timestamp < thirtyDaysAgo)
      .toArray()

    if (oldUnresolved.length > 0) {
      await db.errorLogs.bulkDelete(oldUnresolved.map((e) => e.id!))
      console.log(`[ErrorLog] Cleaned up ${oldUnresolved.length} old unresolved errors`)
    }

    // Trim to max 200 entries
    const count = await db.errorLogs.count()
    if (count > 200) {
      const toDelete = await db.errorLogs
        .orderBy('timestamp')
        .limit(count - 200)
        .toArray()

      if (toDelete.length > 0) {
        await db.errorLogs.bulkDelete(toDelete.map((e) => e.id!))
        console.log(`[ErrorLog] Trimmed ${toDelete.length} oldest errors to stay under 200 limit`)
      }
    }
  } catch (error) {
    console.error('[ErrorLog] Cleanup failed:', error)
  }
}

/**
 * Get unresolved error count (for badge)
 */
export async function getUnresolvedErrorCount(): Promise<number> {
  try {
    // IndexedDB stores booleans as 0/1 in indexes
    return await db.errorLogs.where('resolved').equals(0).count()
  } catch (error) {
    console.error('[ErrorLog] Failed to get count:', error)
    return 0
  }
}

/**
 * Get human-readable label for resolution type
 */
export function getResolutionLabel(type?: ErrorResolutionType): string {
  switch (type) {
    case 'help_article':
      return 'View Help'
    case 'clear_cache':
      return 'Clear Cache'
    case 'open_settings':
      return 'Open Settings'
    case 'contact_support':
      return 'Contact Support'
    case 'retry':
      return 'Retry'
    default:
      return 'More Info'
  }
}
