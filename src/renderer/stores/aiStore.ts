import { create } from 'zustand'
import type { AIRecommendation, AIMessage, AnalysisProgress, AnalysisPhase, MorningBriefing } from '../types'
import { MOCK_AI_MESSAGES } from '../lib/mockData'
import { generateId } from '../lib/utils'
import { sendChatMessage } from '../lib/ai'
import { playSound } from '../lib/sounds'

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
  setRecommendation: (rec: AIRecommendation | null) => void
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
  messages: MOCK_AI_MESSAGES,
  isAnalyzing: false,

  // Analysis progress state
  analysisProgress: null,

  // Morning briefing state
  morningBriefing: null,
  isBriefingRunning: false,
  briefingProgress: null,

  setRecommendation: (rec) => {
    set({ currentRecommendation: rec })
    if (rec) {
      // Play notification sound based on action
      const actionSound = rec.action.toLowerCase() as 'buy' | 'sell' | 'hold'
      playSound(actionSound, rec.confidence).catch(console.error)

      set(state => {
        // Get alert-type messages (recommendation, analysis, alert)
        const alertMessages = state.messages.filter(m =>
          m.type === 'recommendation' || m.type === 'analysis' || m.type === 'alert'
        )
        const otherMessages = state.messages.filter(m =>
          m.type !== 'recommendation' && m.type !== 'analysis' && m.type !== 'alert'
        )

        // Keep only the 2 most recent alerts (so with new one = 3 total)
        const keptAlerts = alertMessages.slice(-2)

        const newRecommendationMessage = {
          id: generateId(),
          type: 'recommendation' as const,
          content: `Generated ${rec.action} signal for ${rec.ticker}. Confidence: ${rec.confidence}%.`,
          timestamp: Date.now(),
          ticker: rec.ticker,
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

        // Keep only 2 most recent alerts (so with new one = 3 total)
        const keptAlerts = alertMessages.slice(-2)

        return {
          messages: [
            ...otherMessages,
            ...keptAlerts,
            newMessage,
          ],
        }
      }

      // For chat/info messages, just append (newest at bottom)
      return {
        messages: [...state.messages, newMessage],
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

    // Add user message
    addMessage({
      type: 'chat',
      role: 'user',
      content,
    })

    setAnalyzing(true)

    try {
      // Get chat history for context (last 10 messages)
      const recentMessages = messages.slice(0, 10).reverse()
      const response = await sendChatMessage(content, recentMessages)

      // Add AI response
      addMessage({
        type: 'chat',
        role: 'assistant',
        content: response,
      })
    } catch (error) {
      console.error('Failed to send message:', error)
      addMessage({
        type: 'info',
        role: 'assistant',
        content: error instanceof Error
          ? `Error: ${error.message}. Please check your API key in Settings.`
          : 'Failed to get response. Please check your API key in Settings.',
      })
    } finally {
      setAnalyzing(false)
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
