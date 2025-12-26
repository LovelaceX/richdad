import { useState, useEffect } from 'react'
import { useAIStore } from '../../stores/aiStore'
import { ChatMessage } from './ChatMessage'
import { Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Rotating thinking messages (VS Code Copilot style)
const THINKING_MESSAGES = [
  'Analyzing...',
  'Thinking...',
  'Cooking...',
  'Vibing...',
  'Unraveling...',
  'Schlepping...',
  'Crunching numbers...',
  'Reading the charts...',
  'Consulting the algos...',
]

export function ActivityLog() {
  const messages = useAIStore(state => state.messages)
  const isAnalyzing = useAIStore(state => state.isAnalyzing)
  const analysisProgress = useAIStore(state => state.analysisProgress)
  const [thinkingIndex, setThinkingIndex] = useState(0)

  // Rotate through thinking messages every 2 seconds when analyzing
  useEffect(() => {
    if (!isAnalyzing) {
      setThinkingIndex(0) // Reset on stop
      return
    }
    const interval = setInterval(() => {
      setThinkingIndex(i => (i + 1) % THINKING_MESSAGES.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [isAnalyzing])

  const getCurrentPhaseLabel = () => {
    if (!analysisProgress) return THINKING_MESSAGES[thinkingIndex]
    const activePhase = analysisProgress.phases.find(p => p.status === 'active')
    return activePhase?.label || THINKING_MESSAGES[thinkingIndex]
  }

  return (
    <div className="p-2 space-y-1">
      {messages.length === 0 && !isAnalyzing ? (
        <div className="text-center text-gray-500 text-xs py-8">
          AI activity will appear here...
        </div>
      ) : (
        <>
          {messages.map(message => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {/* Status bubble - appears as last item when analyzing */}
          <AnimatePresence>
            {isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 p-2 text-terminal-amber text-sm"
              >
                <Loader2 size={14} className="animate-spin" />
                <span>{getCurrentPhaseLabel()}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  )
}
