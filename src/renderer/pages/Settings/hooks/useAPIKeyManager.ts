/**
 * useAPIKeyManager Hook
 *
 * Manages API key state, validation testing, and auto-saving for any provider.
 * Supports: Finnhub, Polygon, TwelveData
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { UserSettings } from '../../../lib/db'

export type APIProvider = 'finnhub' | 'polygon' | 'twelvedata'

export type ConnectionStatus = 'idle' | 'valid' | 'invalid'

export interface UseAPIKeyManagerOptions {
  /** The provider this hook manages */
  provider: APIProvider
  /** Current key from settings (undefined if not set) */
  currentKey: string | undefined
  /** Callback to save the key to settings */
  onSave: (key: string) => Promise<void>
  /** Auto-save debounce delay in ms (default: 500) */
  debounceMs?: number
}

export interface UseAPIKeyManagerReturn {
  /** The pending key value (for controlled input) */
  pendingKey: string
  /** Update the pending key value */
  setPendingKey: (key: string) => void
  /** Whether a connection test is in progress */
  isTesting: boolean
  /** Current connection status */
  status: ConnectionStatus
  /** Status message (success or error text) */
  message: string
  /** Test the connection with the current pending key */
  handleTest: () => Promise<void>
  /** Reset status to idle */
  resetStatus: () => void
}

/**
 * Provider-specific validation functions
 * Each returns { valid: boolean; message: string }
 */
async function validateFinnhub(apiKey: string): Promise<{ valid: boolean; message: string }> {
  const { testFinnhubKey } = await import('../../../../services/finnhubValidator')
  return testFinnhubKey(apiKey)
}

async function validatePolygon(apiKey: string): Promise<{ valid: boolean; message: string }> {
  try {
    const response = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/SPY/prev?adjusted=true&apiKey=${apiKey}`
    )
    const data = await response.json()

    if (response.ok && data.status === 'OK') {
      return { valid: true, message: 'Connection successful - API key verified' }
    }
    return { valid: false, message: data.message || 'Invalid API key' }
  } catch {
    return { valid: false, message: 'Connection test failed' }
  }
}

async function validateTwelveData(apiKey: string): Promise<{ valid: boolean; message: string }> {
  const { testTwelveDataConnection } = await import('../../../../services/twelveDataService')
  const result = await testTwelveDataConnection(apiKey)
  return { valid: result.success, message: result.message }
}

const VALIDATORS: Record<APIProvider, (key: string) => Promise<{ valid: boolean; message: string }>> = {
  finnhub: validateFinnhub,
  polygon: validatePolygon,
  twelvedata: validateTwelveData,
}

/**
 * Settings key mapping for each provider
 */
export const PROVIDER_SETTINGS_KEY: Record<APIProvider, keyof UserSettings> = {
  finnhub: 'finnhubApiKey',
  polygon: 'polygonApiKey',
  twelvedata: 'twelvedataApiKey',
}

/**
 * Hook to manage API key state, validation, and auto-saving
 */
export function useAPIKeyManager({
  provider,
  currentKey,
  onSave,
  debounceMs = 500,
}: UseAPIKeyManagerOptions): UseAPIKeyManagerReturn {
  // State
  const [pendingKey, setPendingKeyState] = useState<string>(currentKey || '')
  const [isTesting, setIsTesting] = useState(false)
  const [status, setStatus] = useState<ConnectionStatus>('idle')
  const [message, setMessage] = useState('')

  // Refs
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Sync pending key when currentKey changes (e.g., settings loaded)
  useEffect(() => {
    if (currentKey !== undefined) {
      setPendingKeyState(currentKey)
    }
  }, [currentKey])

  // Auto-save with debounce
  const setPendingKey = useCallback((newKey: string) => {
    setPendingKeyState(newKey)

    // Clear previous timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    // Debounce save
    autoSaveTimeoutRef.current = setTimeout(() => {
      onSave(newKey)
    }, debounceMs)
  }, [onSave, debounceMs])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])

  // Test connection
  const handleTest = useCallback(async () => {
    if (!pendingKey) {
      setStatus('invalid')
      setMessage('No API key entered')
      return
    }

    setIsTesting(true)
    setStatus('idle')
    setMessage('')

    try {
      const validator = VALIDATORS[provider]
      const result = await validator(pendingKey)

      setStatus(result.valid ? 'valid' : 'invalid')
      setMessage(result.message)
    } catch (error) {
      setStatus('invalid')
      setMessage('Connection test failed')
      console.error(`[useAPIKeyManager] ${provider} connection test error:`, error)
    } finally {
      setIsTesting(false)
    }
  }, [pendingKey, provider])

  // Reset status
  const resetStatus = useCallback(() => {
    setStatus('idle')
    setMessage('')
  }, [])

  return {
    pendingKey,
    setPendingKey,
    isTesting,
    status,
    message,
    handleTest,
    resetStatus,
  }
}
