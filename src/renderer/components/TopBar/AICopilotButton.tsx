/**
 * AI Copilot Button
 * Shows in TopBar with notification badge for unread alerts
 */

import { Bot, Sparkles } from 'lucide-react'
import { useAIModalStore } from '../../stores/aiModalStore'
import { useAIStore } from '../../stores/aiStore'

export function AICopilotButton() {
  const openModal = useAIModalStore(state => state.openModal)
  const unreadCount = useAIModalStore(state => state.unreadCount)
  const isAnalyzing = useAIStore(state => state.isAnalyzing)

  return (
    <button
      onClick={openModal}
      className="relative p-2 hover:bg-terminal-border rounded transition-colors group"
    >
      {/* Icon - animate when analyzing */}
      <div className="relative">
        {isAnalyzing ? (
          <Sparkles size={16} className="text-terminal-amber animate-pulse" />
        ) : (
          <Bot size={16} className="text-gray-400 group-hover:text-terminal-amber transition-colors" />
        )}
      </div>

      {/* Notification Badge */}
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}

      {/* Instant Tooltip */}
      <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-terminal-bg border border-terminal-border rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        AI Copilot
      </span>
    </button>
  )
}
