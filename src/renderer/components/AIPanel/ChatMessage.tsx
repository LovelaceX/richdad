import { useState } from 'react'
import { AlertCircle, TrendingUp, Info, Zap, User, ChevronDown, ChevronUp, BarChart2, Target, Microscope } from 'lucide-react'
import type { AIMessage } from '../../types'
import { formatRelativeTime } from '../../lib/utils'

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

const personaConfig = {
  sterling: {
    name: 'Sterling',
    title: 'The Analyst',
    icon: BarChart2,
    color: 'text-blue-400',
    borderColor: 'border-blue-400/30',
  },
  jax: {
    name: 'Jax',
    title: 'The Veteran',
    icon: Target,
    color: 'text-orange-400',
    borderColor: 'border-orange-400/30',
  },
  cipher: {
    name: 'Cipher',
    title: 'The Tech Wiz',
    icon: Microscope,
    color: 'text-green-400',
    borderColor: 'border-green-400/30',
  },
}

const COLLAPSED_LENGTH = 150

export function ChatMessage({ message }: ChatMessageProps) {
  const [expanded, setExpanded] = useState(false)
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
      <div className="flex justify-end group">
        <div className="max-w-[85%] p-2 rounded text-xs bg-terminal-amber/20 border-r-2 border-terminal-amber">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-gray-200 leading-relaxed">{message.content}</p>
              <span className="text-gray-500 text-[10px] mt-1 block text-right">
                {formatRelativeTime(message.timestamp)}
              </span>
            </div>
            <User size={12} className="text-terminal-amber mt-0.5 flex-shrink-0" />
          </div>
        </div>
      </div>
    )
  }

  // Rich recommendation card (when full recommendation data is available)
  if (message.type === 'recommendation' && message.recommendation) {
    const rec = message.recommendation
    const persona = personaConfig[rec.persona] || personaConfig.sterling
    const PersonaIcon = persona.icon

    const actionColor = rec.action === 'BUY'
      ? 'text-semantic-up'
      : rec.action === 'SELL'
        ? 'text-semantic-down'
        : 'text-gray-400'

    const actionBg = rec.action === 'BUY'
      ? 'bg-semantic-up/20'
      : rec.action === 'SELL'
        ? 'bg-semantic-down/20'
        : 'bg-gray-400/20'

    return (
      <div className={`rounded-lg border ${persona.borderColor} bg-terminal-panel/50 overflow-hidden`}>
        {/* Persona header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700/50 bg-black/20">
          <PersonaIcon size={14} className={persona.color} />
          <span className={`text-xs font-medium ${persona.color}`}>{persona.name}</span>
          <span className="text-[10px] text-gray-500">{persona.title}</span>
        </div>

        {/* Action + Ticker + Confidence */}
        <div className="px-3 py-2">
          <div className="flex items-center gap-3 mb-2">
            <span className={`text-sm font-bold ${actionColor} ${actionBg} px-2 py-0.5 rounded`}>
              {rec.action}
            </span>
            <span className="text-terminal-amber font-mono font-semibold">
              {rec.ticker}
            </span>
            {rec.confidence && (
              <div className="flex items-center gap-2 flex-1">
                <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${rec.confidence >= 70 ? 'bg-semantic-up' : rec.confidence >= 50 ? 'bg-yellow-500' : 'bg-semantic-down'}`}
                    style={{ width: `${rec.confidence}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 font-mono">{rec.confidence}%</span>
              </div>
            )}
          </div>

          {/* Rationale */}
          {rec.rationale && (
            <p className="text-xs text-gray-300 italic mb-2 leading-relaxed">
              "{rec.rationale}"
            </p>
          )}

          {/* Price targets */}
          <div className="flex gap-4 text-[10px]">
            {rec.priceTarget && (
              <span className="text-semantic-up">
                Target: ${rec.priceTarget.toFixed(2)}
              </span>
            )}
            {rec.stopLoss && (
              <span className="text-semantic-down">
                Stop: ${rec.stopLoss.toFixed(2)}
              </span>
            )}
            {rec.suggestedShares && (
              <span className="text-gray-400">
                Size: {rec.suggestedShares} shares
              </span>
            )}
          </div>

          {/* Sources */}
          {rec.sources && rec.sources.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-700/50">
              <div className="text-[10px] text-gray-500">
                Based on:{' '}
                {rec.sources.map((s, i) => (
                  <span key={i}>
                    {i > 0 && ', '}
                    {s.url ? (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-terminal-amber hover:underline"
                      >
                        {s.title}
                      </a>
                    ) : (
                      s.title
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className="px-3 py-1 bg-black/20 border-t border-gray-700/50">
          <span className="text-[10px] text-gray-500">
            {formatRelativeTime(message.timestamp)}
          </span>
        </div>
      </div>
    )
  }

  // AI message styling (default)
  return (
    <div
      className={`
        p-2 rounded text-xs
        ${config.bgColor}
        border-l-2
        ${message.type === 'recommendation' ? 'border-terminal-amber' : 'border-transparent'}
      `}
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
      </div>
    </div>
  )
}
