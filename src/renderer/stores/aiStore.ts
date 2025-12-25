import { create } from 'zustand'
import type { AIRecommendation, AIMessage, AnalysisProgress, AnalysisPhase, MorningBriefing } from '../types'
import { generateId } from '../lib/utils'
import { sendChatMessage } from '../lib/ai'
import { getSettings, getAISettings } from '../lib/db'
import { playSound } from '../lib/sounds'
import { canMakeAICall, recordAICall, getAIBudgetStatus } from '../../services/aiBudgetTracker'

// Memory limits to prevent unbounded growth
const MAX_CHAT_MESSAGES = 100 // Maximum chat/info messages to keep
const MAX_ALERT_MESSAGES = 3 // Maximum alert-type messages to keep

// Track current request to prevent race conditions with rapid messages
let currentRequestId = 0

// Default analysis phases for the AI thinking animation
export const DEFAULT_ANALYSIS_PHASES: Omit<AnalysisPhase, 'status' | 'result'>[] = [
  { id: 'regime', label: 'Checking Market Regime' },
  { id: 'price', label: 'Fetching Price Data' },
  { id: 'technicals', label: 'Calculating Technical Indicators' },
  { id: 'patterns', label: 'Detecting Candlestick Patterns' },
  { id: 'news', label: 'Gathering News Context' },
  { id: 'ai', label: 'Generating Recommendation' },
]

interface AIState {
  currentRecommendation: AIRecommendation | null
  messages: AIMessage[]
  isAnalyzing: boolean

  // Analysis progress tracking (for step-by-step animation)
  analysisProgress: AnalysisProgress | null

  // Morning briefing state
  morningBriefing: MorningBriefing | null
  isBriefingRunning: boolean
  briefingProgress: { current: number; total: number; ticker: string } | null

  // Actions
  setRecommendation: (rec: AIRecommendation | null) => Promise<void>
  dismissRecommendation: () => void
  addMessage: (message: Omit<AIMessage, 'id' | 'timestamp'>) => void
  removeAlert: (alertId: string) => void
  clearMessages: () => void
  setAnalyzing: (analyzing: boolean) => void
  sendMessage: (content: string) => Promise<void>

  // Analysis progress actions
  startAnalysis: (ticker: string) => void
  updatePhase: (phaseId: string, status: AnalysisPhase['status'], result?: string) => void
  clearAnalysisProgress: () => void

  // Morning briefing actions
  setMorningBriefing: (briefing: MorningBriefing | null) => void
  setBriefingRunning: (running: boolean) => void
  setBriefingProgress: (progress: { current: number; total: number; ticker: string } | null) => void
}

export const useAIStore = create<AIState>((set, get) => ({
  currentRecommendation: null, // Will be populated by AI engine
  messages: [],  // Empty until real AI interactions occur
  isAnalyzing: false,

  // Analysis progress state
  analysisProgress: null,

  // Morning briefing state
  morningBriefing: null,
  isBriefingRunning: false,
  briefingProgress: null,

  setRecommendation: async (rec) => {
    if (rec) {
      // Check if HOLD recommendations should be shown
      const aiSettings = await getAISettings()
      const showHold = aiSettings.showHoldRecommendations ?? true

      // Filter out HOLD recommendations if setting is disabled
      if (rec.action === 'HOLD' && !showHold) {
        console.log('[AI Store] Hiding HOLD recommendation per user settings')
        return
      }

      // Play notification sound based on action
      const actionSound = rec.action.toLowerCase() as 'buy' | 'sell' | 'hold'
      playSound(actionSound, rec.confidence).catch(console.error)
    }

    // Get persona for rich recommendation card BEFORE setting state
    const settings = await getSettings()
    const persona = settings.persona || 'sterling'

    set({ currentRecommendation: rec })
    if (rec) {
      set(state => {
        // Get alert-type messages (recommendation, analysis, alert)
        const alertMessages = state.messages.filter(m =>
          m.type === 'recommendation' || m.type === 'analysis' || m.type === 'alert'
        )
        const otherMessages = state.messages.filter(m =>
          m.type !== 'recommendation' && m.type !== 'analysis' && m.type !== 'alert'
        )

        // Keep only the most recent alerts (so with new one = MAX_ALERT_MESSAGES total)
        const keptAlerts = alertMessages.slice(-(MAX_ALERT_MESSAGES - 1))

        const newRecommendationMessage = {
          id: generateId(),
          type: 'recommendation' as const,
          content: rec.rationale || `Generated ${rec.action} signal for ${rec.ticker}. Confidence: ${rec.confidence}%.`,
          timestamp: Date.now(),
          ticker: rec.ticker,
          // Include full recommendation data for rich UI cards
          recommendation: {
            ...rec,
            persona,
          },
        }

        return {
          messages: [
            ...otherMessages,
            ...keptAlerts,
            newRecommendationMessage,
          ],
        }
      })
    }
  },

  dismissRecommendation: () => {
    set({ currentRecommendation: null })
  },

  addMessage: (message) => {
    set(state => {
      const newMessage = {
        ...message,
        id: generateId(),
        timestamp: Date.now(),
      }

      // If new message is an alert type, enforce 3-alert maximum
      if (newMessage.type === 'recommendation' || newMessage.type === 'analysis' || newMessage.type === 'alert') {
        // Get alert-type messages
        const alertMessages = state.messages.filter(m =>
          m.type === 'recommendation' || m.type === 'analysis' || m.type === 'alert'
        )
        const otherMessages = state.messages.filter(m =>
          m.type !== 'recommendation' && m.type !== 'analysis' && m.type !== 'alert'
        )

        // Keep only most recent alerts (so with new one = MAX_ALERT_MESSAGES total)
        const keptAlerts = alertMessages.slice(-(MAX_ALERT_MESSAGES - 1))

        return {
          messages: [
            ...otherMessages,
            ...keptAlerts,
            newMessage,
          ],
        }
      }

      // For chat/info messages, append with limit to prevent unbounded growth
      const updatedMessages = [...state.messages, newMessage]

      // If we exceed max, remove oldest chat/info messages
      if (updatedMessages.length > MAX_CHAT_MESSAGES + MAX_ALERT_MESSAGES) {
        // Get alert and non-alert messages
        const alerts = updatedMessages.filter(m =>
          m.type === 'recommendation' || m.type === 'analysis' || m.type === 'alert'
        )
        const chatMessages = updatedMessages.filter(m =>
          m.type !== 'recommendation' && m.type !== 'analysis' && m.type !== 'alert'
        )

        // Keep only the most recent chat messages
        const trimmedChat = chatMessages.slice(-MAX_CHAT_MESSAGES)

        return {
          messages: [...trimmedChat, ...alerts.slice(-MAX_ALERT_MESSAGES)],
        }
      }

      return {
        messages: updatedMessages,
      }
    })
  },

  removeAlert: (alertId) => {
    set(state => ({
      messages: state.messages.filter(m => m.id !== alertId)
    }))
  },

  clearMessages: () => {
    set({ messages: [] })
  },

  setAnalyzing: (analyzing) => {
    set({ isAnalyzing: analyzing })
  },

  sendMessage: async (content: string) => {
    const { addMessage, setAnalyzing, messages } = get()

    // Check AI budget BEFORE making API call
    if (!canMakeAICall()) {
      const { used, limit } = getAIBudgetStatus()
      addMessage({
        type: 'info',
        role: 'assistant',
        content: `AI budget limit reached (${used}/${limit} calls today). Please wait until midnight for reset, or increase your limit in Settings → AI Copilot.`,
      })
      return
    }

    // Add user message
    addMessage({
      type: 'chat',
      role: 'user',
      content,
    })

    setAnalyzing(true)

    // Increment request ID to track this specific request
    // This prevents race conditions when multiple messages are sent rapidly
    const thisRequestId = ++currentRequestId

    try {
      // Get user's selected persona from settings
      const settings = await getSettings()
      const persona = settings.persona || 'sterling'

      // Get chat history for context (last 10 messages)
      const recentMessages = messages.slice(0, 10).reverse()
      const response = await sendChatMessage(content, recentMessages, persona)

      // Only process response if this is still the current request
      // (prevents stale responses from appearing after newer requests)
      if (thisRequestId !== currentRequestId) {
        console.log('[AI Store] Ignoring stale response from request', thisRequestId)
        return
      }

      // Record the AI call AFTER successful response
      recordAICall()

      // Add AI response
      addMessage({
        type: 'chat',
        role: 'assistant',
        content: response,
      })
    } catch (error) {
      // Only show error if this is still the current request
      if (thisRequestId !== currentRequestId) {
        return
      }

      console.error('Failed to send message:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const isTimeout = errorMessage.toLowerCase().includes('timeout')
      const helpText = isTimeout
        ? 'Ollama may still be loading the model. Try again in a moment, or check that Ollama is running.'
        : 'Check that Ollama is running and has the dolphin-llama3:8b model installed.'
      addMessage({
        type: 'info',
        role: 'assistant',
        content: `Error: ${errorMessage}. ${helpText}`,
      })
    } finally {
      // Only update analyzing state if this is the current request
      if (thisRequestId === currentRequestId) {
        setAnalyzing(false)
      }
    }
  },

  // Analysis progress actions
  startAnalysis: (ticker: string) => {
    const phases = DEFAULT_ANALYSIS_PHASES.map(phase => ({
      ...phase,
      status: 'pending' as const,
      result: undefined,
    }))
    set({
      analysisProgress: {
        ticker,
        phases,
        startedAt: Date.now(),
      },
      isAnalyzing: true,
    })
  },

  updatePhase: (phaseId: string, status: AnalysisPhase['status'], result?: string) => {
    set(state => {
      if (!state.analysisProgress) return state

      const phases = state.analysisProgress.phases.map(phase =>
        phase.id === phaseId ? { ...phase, status, result } : phase
      )

      return {
        analysisProgress: {
          ...state.analysisProgress,
          phases,
        },
      }
    })
  },

  clearAnalysisProgress: () => {
    set({ analysisProgress: null, isAnalyzing: false })
  },

  // Morning briefing actions
  setMorningBriefing: (briefing: MorningBriefing | null) => {
    set({ morningBriefing: briefing })
  },

  setBriefingRunning: (running: boolean) => {
    set({ isBriefingRunning: running })
  },

  setBriefingProgress: (progress: { current: number; total: number; ticker: string } | null) => {
    set({ briefingProgress: progress })
  },
}))
