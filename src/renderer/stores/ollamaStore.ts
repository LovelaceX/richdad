import { create } from 'zustand'
import {
  startOllama,
  getOllamaStatus,
  type OllamaStatus
} from '../lib/ollamaService'
import { useAIStore } from './aiStore'
import { getSettings } from '../lib/db'
import type { PersonaType } from '../types'

// Welcome messages per persona (in their unique style)
const WELCOME_MESSAGES: Record<PersonaType, string> = {
  sterling: "Good morning. I'm Sterling, your AI analyst. Systems are online and ready for market analysis. How may I assist you today?",
  jax: "Hey there. Jax here, ready to rock. What are we looking at today?",
  cipher: "Hey! Cipher online and all systems green! Ready to hunt some patterns. What's our first target?"
}

interface OllamaStore {
  status: OllamaStatus
  models: string[]
  hasRequiredModel: boolean
  error?: string
  isInitialized: boolean
  hasWelcomed: boolean

  // Actions
  initialize: () => Promise<void>
  refresh: () => Promise<void>
  attemptAutoStart: () => Promise<boolean>
}

// Send welcome message in persona's style
async function sendWelcomeMessage() {
  const settings = await getSettings()
  const persona = (settings.persona || 'sterling') as PersonaType
  const welcomeMsg = WELCOME_MESSAGES[persona]

  useAIStore.getState().addMessage({
    type: 'info',
    role: 'assistant',
    content: welcomeMsg
  })
}

export const useOllamaStore = create<OllamaStore>((set, get) => ({
  status: 'checking',
  models: [],
  hasRequiredModel: false,
  error: undefined,
  isInitialized: false,
  hasWelcomed: false,

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

      // Send welcome message if ready and not already welcomed
      if (state.hasRequiredModel && !get().hasWelcomed) {
        sendWelcomeMessage()
        set({ hasWelcomed: true })
      }
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

      // Send welcome message if ready and not already welcomed
      if (newState.hasRequiredModel && !get().hasWelcomed) {
        sendWelcomeMessage()
        set({ hasWelcomed: true })
      }
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

      // Send welcome message if ready and not already welcomed
      if (state.hasRequiredModel && !get().hasWelcomed) {
        sendWelcomeMessage()
        set({ hasWelcomed: true })
      }
      return true
    } else {
      set({ status: 'start_failed', error: result.error })
      return false
    }
  }
}))
