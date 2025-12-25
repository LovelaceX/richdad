import { create } from 'zustand'
import {
  checkOllamaRunning,
  startOllama,
  getOllamaStatus,
  type OllamaStatus
} from '../lib/ollamaService'

interface OllamaStore {
  status: OllamaStatus
  models: string[]
  hasRequiredModel: boolean
  error?: string
  isInitialized: boolean

  // Actions
  initialize: () => Promise<void>
  refresh: () => Promise<void>
  attemptAutoStart: () => Promise<boolean>
}

export const useOllamaStore = create<OllamaStore>((set, get) => ({
  status: 'checking',
  models: [],
  hasRequiredModel: false,
  error: undefined,
  isInitialized: false,

  initialize: async () => {
    set({ status: 'checking' })

    // First check if already running
    const state = await getOllamaStatus()

    if (state.status === 'running') {
      set({
        status: 'running',
        models: state.models,
        hasRequiredModel: state.hasRequiredModel,
        isInitialized: true
      })
      return
    }

    // Not running - attempt auto-start
    set({ status: 'starting' })
    const result = await startOllama()

    if (result.success) {
      // Re-check status after starting
      const newState = await getOllamaStatus()
      set({
        status: newState.status,
        models: newState.models,
        hasRequiredModel: newState.hasRequiredModel,
        isInitialized: true
      })
    } else {
      set({
        status: 'start_failed',
        error: result.error,
        isInitialized: true
      })
    }
  },

  refresh: async () => {
    const state = await getOllamaStatus()
    set({
      status: state.status,
      models: state.models,
      hasRequiredModel: state.hasRequiredModel
    })
  },

  attemptAutoStart: async () => {
    set({ status: 'starting', error: undefined })
    const result = await startOllama()

    if (result.success) {
      const state = await getOllamaStatus()
      set({
        status: state.status,
        models: state.models,
        hasRequiredModel: state.hasRequiredModel
      })
      return true
    } else {
      set({ status: 'start_failed', error: result.error })
      return false
    }
  }
}))
