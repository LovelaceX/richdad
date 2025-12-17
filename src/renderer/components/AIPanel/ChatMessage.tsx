import { useState } from 'react'
import { AlertCircle, TrendingUp, Info, Zap, User, ChevronDown, ChevronUp, X } from 'lucide-react'
import type { AIMessage } from '../../types'
import { formatRelativeTime } from '../../lib/utils'
import { useAIStore } from '../../stores/aiStore'

interface ChatMessageProps {
  message: AIMessage
}

const typeConfig = {
  recommendation: {
    icon: Zap,
    color: 'text-terminal-amber',
    bgColor: 'bg-terminal-amber/10',
  },
  analysis: {
    icon: TrendingUp,
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
  },
  alert: {
    icon: AlertCircle,
    color: 'text-semantic-up',
    bgColor: 'bg-semantic-up/10',
  },
  info: {
    icon: Info,
    color: 'text-gray-400',
    bgColor: 'bg-gray-400/10',
  },
  chat: {
    icon: Info,
    color: 'text-gray-400',
    bgColor: 'bg-gray-400/10',
  },
}

const COLLAPSED_LENGTH = 150

export function ChatMessage({ message }: ChatMessageProps) {
  const [expanded, setExpanded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const removeAlert = useAIStore(state => state.removeAlert)
  const config = typeConfig[message.type] || typeConfig.info
  const Icon = config.icon

  const isUserMessage = message.role === 'user'
  const isLongContent = message.content.length > COLLAPSED_LENGTH
  const displayContent = expanded || !isLongContent
    ? message.content
    : message.content.slice(0, COLLAPSED_LENGTH) + '...'

  // User message styling
  if (isUserMessage) {
    return (
      <div
        className="flex justify-end group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative max-w-[85%] p-2 rounded text-xs bg-terminal-amber/20 border-r-2 border-terminal-amber">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-gray-200 leading-relaxed">{message.content}</p>
              <span className="text-gray-500 text-[10px] mt-1 block text-right">
                {formatRelativeTime(message.timestamp)}
              </span>
            </div>
            <User size={12} className="text-terminal-amber mt-0.5 flex-shrink-0" />
          </div>
          {/* Delete button for user messages */}
          {isHovered && (
            <button
              onClick={() => removeAlert(message.id)}
              className="absolute top-1 left-1 p-1 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
              title="Delete message"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>
    )
  }

  // AI message styling
  return (
    <div
      className={`
        relative p-2 rounded text-xs
        ${config.bgColor}
        border-l-2
        ${message.type === 'recommendation' ? 'border-terminal-amber' : 'border-transparent'}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-2">
        <Icon size={12} className={`${config.color} mt-0.5 flex-shrink-0`} />

        <div className="flex-1 min-w-0">
          <p className="text-gray-200 leading-relaxed">
            {message.ticker && (
              <span className="text-terminal-amber font-semibold mr-1">
                [{message.ticker}]
              </span>
            )}
            {displayContent}
          </p>

          {isLongContent && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-terminal-amber text-[10px] mt-1 hover:underline"
            >
              {expanded ? (
                <>
                  <ChevronUp size={10} />
                  See less
                </>
              ) : (
                <>
                  <ChevronDown size={10} />
                  See more
                </>
              )}
            </button>
          )}

          <span className="text-gray-500 text-[10px] mt-1 block">
            {formatRelativeTime(message.timestamp)}
          </span>
        </div>

        {/* Delete button - shows on hover for all AI messages */}
        {isHovered && (
          <button
            onClick={() => removeAlert(message.id)}
            className="absolute top-1 right-1 p-1 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
            title="Delete message"
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  )
}
