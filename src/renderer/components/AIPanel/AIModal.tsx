/**
 * AI Copilot Panel
 * Right-side sliding panel containing the AI Copilot interface
 */

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bot, Loader2, Trash2 } from 'lucide-react'
import { ActivityLog } from './ActivityLog'
import { ChatInput } from './ChatInput'
import { AIPerformanceSummary } from './AIPerformanceSummary'
import { AnalysisProgress } from './AnalysisProgress'
import { MorningBriefingButton } from './MorningBriefingButton'
import { IntelPanel } from '../Intel'
import { useAIStore } from '../../stores/aiStore'
import { useMarketStore } from '../../stores/marketStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useIntelStore } from '../../stores/intelStore'

interface AIModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AIModal({ isOpen, onClose }: AIModalProps) {
  const isAnalyzing = useAIStore(state => state.isAnalyzing)
  const messages = useAIStore(state => state.messages)
  const clearMessages = useAIStore(state => state.clearMessages)
  const analysisProgress = useAIStore(state => state.analysisProgress)
  const selectedTicker = useMarketStore(state => state.selectedTicker)
  const aiPerformanceVisible = useSettingsStore(state => state.panelVisibility.aiPerformanceVisible)
  const intelPanelEnabled = useIntelStore(state => state.intelPanelEnabled)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleClear = () => {
    if (messages.length > 0) {
      clearMessages()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - subtle overlay, click to close */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 z-[100]"
          />

          {/* Sliding Panel from Right */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="fixed right-0 top-12 bottom-0 w-[480px] bg-terminal-panel border-l border-terminal-border shadow-[-8px_0_24px_rgba(0,0,0,0.4)] z-[101] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-terminal-border bg-terminal-bg/50">
              <div className="flex items-center gap-3">
                <Bot size={18} className="text-terminal-amber" />
                <span className="text-white font-medium">AI Copilot</span>
                {selectedTicker && (
                  <span className="text-terminal-amber text-xs font-mono bg-terminal-amber/10 px-2 py-0.5 rounded">
                    {selectedTicker}
                  </span>
                )}
                {isAnalyzing && (
                  <div className="flex items-center gap-1.5 text-terminal-amber">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-xs">Analyzing...</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Clear All Button */}
                {messages.length > 0 && (
                  <button
                    onClick={handleClear}
                    className="p-1.5 hover:bg-terminal-border rounded transition-colors"
                    title="Clear chat history"
                  >
                    <Trash2 size={14} className="text-gray-500 hover:text-red-400" />
                  </button>
                )}

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-terminal-border rounded transition-colors"
                  title="Close (Esc)"
                >
                  <X size={18} className="text-gray-400 hover:text-white" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* Analysis Progress */}
                <AnimatePresence>
                  {analysisProgress && (
                    <AnalysisProgress progress={analysisProgress} />
                  )}
                </AnimatePresence>

                <ActivityLog />
                <div ref={messagesEndRef} />
              </div>

              {/* Performance Summary */}
              {aiPerformanceVisible && (
                <div className="flex-shrink-0 border-t border-terminal-border">
                  <AIPerformanceSummary />
                </div>
              )}

              {/* Intel Panel */}
              {intelPanelEnabled && (
                <div className="flex-shrink-0 px-4 py-2 border-t border-terminal-border">
                  <IntelPanel />
                </div>
              )}

              {/* Morning Briefing Button */}
              <div className="flex-shrink-0 px-4 py-2 border-t border-terminal-border">
                <MorningBriefingButton />
              </div>

              {/* Chat Input */}
              <div className="flex-shrink-0">
                <ChatInput />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
