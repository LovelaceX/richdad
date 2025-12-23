/**
 * Service Health Store
 *
 * Tracks the health status of all background services (market data, news, AI, WebSocket).
 * Provides real-time visibility into service status for the UI.
 * Also persists errors to the error log for self-service troubleshooting.
 */

import { create } from 'zustand'
import { persistError } from '../lib/errorLogHelpers'

export type ServiceStatus = 'ok' | 'error' | 'degraded' | 'idle'
export type WebSocketStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'failed'

export interface ServiceState {
  status: ServiceStatus
  lastError?: string
  lastSuccess: number
  errorCount: number
}

interface ServiceHealthState {
  market: ServiceState
  news: ServiceState
  sentiment: ServiceState
  ai: ServiceState
  websocket: {
    status: WebSocketStatus
    lastError?: string
    reconnectAttempts: number
  }

  // Actions
  reportSuccess: (service: 'market' | 'news' | 'sentiment' | 'ai') => void
  reportError: (service: 'market' | 'news' | 'sentiment' | 'ai', error: string) => void
  updateWebSocketStatus: (status: WebSocketStatus, error?: string, reconnectAttempts?: number) => void
  resetService: (service: 'market' | 'news' | 'sentiment' | 'ai') => void
  getOverallStatus: () => 'healthy' | 'degraded' | 'unhealthy'
}

const initialServiceState: ServiceState = {
  status: 'idle',
  lastError: undefined,
  lastSuccess: 0,
  errorCount: 0
}

export const useServiceHealthStore = create<ServiceHealthState>((set, get) => ({
  market: { ...initialServiceState },
  news: { ...initialServiceState },
  sentiment: { ...initialServiceState },
  ai: { ...initialServiceState },
  websocket: {
    status: 'disconnected',
    lastError: undefined,
    reconnectAttempts: 0
  },

  reportSuccess: (service) => {
    set({
      [service]: {
        status: 'ok' as ServiceStatus,
        lastError: undefined,
        lastSuccess: Date.now(),
        errorCount: 0
      }
    })
  },

  reportError: (service, error) => {
    set((state) => {
      const currentState = state[service]
      const newErrorCount = currentState.errorCount + 1

      // After 3 consecutive errors, mark as error; otherwise degraded
      const newStatus: ServiceStatus = newErrorCount >= 3 ? 'error' : 'degraded'

      return {
        [service]: {
          ...currentState,
          status: newStatus,
          lastError: error,
          errorCount: newErrorCount
        }
      }
    })

    // Persist error to error log for self-service troubleshooting
    persistError(service, error, { severity: 'error' })

    // Dispatch event for toast notification (only on first error or status change to error)
    const currentState = get()[service]
    if (currentState.errorCount === 0 || currentState.errorCount === 2) {
      window.dispatchEvent(new CustomEvent('service-error', {
        detail: { service, error }
      }))
    }
  },

  updateWebSocketStatus: (status, error, reconnectAttempts) => {
    set((state) => ({
      websocket: {
        status,
        lastError: error ?? state.websocket.lastError,
        reconnectAttempts: reconnectAttempts ?? state.websocket.reconnectAttempts
      }
    }))

    // Persist and dispatch event for failed status
    if (status === 'failed' && error) {
      persistError('websocket', error, { severity: 'error' })
      window.dispatchEvent(new CustomEvent('service-error', {
        detail: { service: 'websocket', error }
      }))
    }
  },

  resetService: (service) => {
    set({ [service]: { ...initialServiceState } })
  },

  getOverallStatus: () => {
    const state = get()
    const services = [state.market, state.news, state.sentiment, state.ai]

    const hasError = services.some(s => s.status === 'error') || state.websocket.status === 'failed'
    const hasDegraded = services.some(s => s.status === 'degraded') || state.websocket.status === 'reconnecting'

    if (hasError) return 'unhealthy'
    if (hasDegraded) return 'degraded'
    return 'healthy'
  }
}))

// Convenience function for use outside React components
export const reportServiceHealth = {
  success: (service: 'market' | 'news' | 'sentiment' | 'ai') => {
    useServiceHealthStore.getState().reportSuccess(service)
  },
  error: (service: 'market' | 'news' | 'sentiment' | 'ai', error: string) => {
    useServiceHealthStore.getState().reportError(service, error)
  },
  websocket: (status: WebSocketStatus, error?: string, reconnectAttempts?: number) => {
    useServiceHealthStore.getState().updateWebSocketStatus(status, error, reconnectAttempts)
  }
}
