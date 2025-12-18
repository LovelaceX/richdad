import { useEffect, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Bot, Loader2, Trash2 } from 'lucide-react'
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

export function AIPanel() {
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleClear = () => {
    if (messages.length > 0) {
      clearMessages()
    }
  }

  return (
    <div className="panel h-full flex flex-col">
      {/* Header - fixed height */}
      <div className="panel-header flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <Bot size={14} />
          <span>AI Co-Pilot</span>
        </div>

        <div className="flex items-center gap-2">
          {selectedTicker && (
            <span className="text-terminal-amber text-[10px] font-mono">
              Analyzing: {selectedTicker}
            </span>
          )}

          {isAnalyzing && (
            <div className="flex items-center gap-1.5 text-terminal-amber">
              <Loader2 size={12} className="animate-spin" />
              <span className="text-[10px] font-normal normal-case">...</span>
            </div>
          )}

          {/* Clear All Button */}
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-terminal-border rounded transition-colors"
              title="Clear chat history"
            >
              <Trash2 size={12} className="text-gray-500 hover:text-red-400" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable messages - takes remaining space */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
        {/* Analysis Progress - animated step-by-step display */}
        <AnimatePresence>
          {analysisProgress && (
            <AnalysisProgress progress={analysisProgress} />
          )}
        </AnimatePresence>

        <ActivityLog />
        <div ref={messagesEndRef} />
      </div>

      {/* Performance Summary - collapsible */}
      {aiPerformanceVisible && (
        <div className="flex-shrink-0">
          <AIPerformanceSummary />
        </div>
      )}

      {/* News Intel Panel - collapsible */}
      {intelPanelEnabled && (
        <div className="flex-shrink-0 px-2 py-1">
          <IntelPanel />
        </div>
      )}

      {/* Morning Briefing Button */}
      <div className="flex-shrink-0 px-2 pb-2">
        <MorningBriefingButton />
      </div>

      {/* Chat Input - fixed at bottom */}
      <div className="flex-shrink-0">
        <ChatInput />
      </div>
    </div>
  )
}
