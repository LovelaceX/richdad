import { create } from 'zustand'
import type { AIRecommendation, AIMessage } from '../types'
import { MOCK_RECOMMENDATION, MOCK_AI_MESSAGES } from '../lib/mockData'
import { generateId } from '../lib/utils'
import { sendChatMessage } from '../lib/ai'
import { playSound } from '../lib/sounds'

interface AIState {
  currentRecommendation: AIRecommendation | null
  messages: AIMessage[]
  isAnalyzing: boolean

  // Actions
  setRecommendation: (rec: AIRecommendation | null) => void
  dismissRecommendation: () => void
  addMessage: (message: Omit<AIMessage, 'id' | 'timestamp'>) => void
  removeAlert: (alertId: string) => void
  clearMessages: () => void
  setAnalyzing: (analyzing: boolean) => void
  sendMessage: (content: string) => Promise<void>
}

export const useAIStore = create<AIState>((set, get) => ({
  currentRecommendation: MOCK_RECOMMENDATION,
  messages: MOCK_AI_MESSAGES,
  isAnalyzing: false,

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
}))
