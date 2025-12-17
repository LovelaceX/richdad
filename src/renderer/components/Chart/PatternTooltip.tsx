import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { PatternDiagram } from './PatternDiagram'
import { usePatternStore } from '../../stores/patternStore'
import type { DetectedPattern } from '../../../services/candlestickPatterns'

interface PatternTooltipProps {
  pattern: DetectedPattern
  position: { x: number; y: number }
  onClose: () => void
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getReliabilityColor(reliability: string): string {
  switch (reliability) {
    case 'High':
      return 'text-green-400'
    case 'Medium':
      return 'text-yellow-400'
    case 'Low':
      return 'text-gray-400'
    default:
      return 'text-gray-400'
  }
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'bullish':
      return 'text-green-400'
    case 'bearish':
      return 'text-red-400'
    default:
      return 'text-gray-400'
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'bullish':
      return 'Bullish reversal'
    case 'bearish':
      return 'Bearish reversal'
    default:
      return 'Neutral / Indecision'
  }
}

export function PatternTooltip({ pattern, position, onClose }: PatternTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // Calculate position to keep tooltip within viewport
  const getAdjustedPosition = () => {
    const tooltipWidth = 280
    const tooltipHeight = 200
    const padding = 16

    let x = position.x
    let y = position.y

    // Adjust horizontal position
    if (x + tooltipWidth + padding > window.innerWidth) {
      x = position.x - tooltipWidth - 10
    } else {
      x = position.x + 10
    }

    // Adjust vertical position
    if (y + tooltipHeight + padding > window.innerHeight) {
      y = window.innerHeight - tooltipHeight - padding
    }
    if (y < padding) {
      y = padding
    }

    return { x, y }
  }

  const adjustedPosition = getAdjustedPosition()

  return (
    <motion.div
      ref={tooltipRef}
      initial={{ opacity: 0, scale: 0.95, y: -5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -5 }}
      transition={{ duration: 0.15 }}
      className="fixed z-50 w-[280px] bg-terminal-panel border border-terminal-border rounded-lg shadow-xl overflow-hidden"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {/* Header with diagram */}
      <div className="flex items-start gap-3 p-3 border-b border-terminal-border bg-terminal-bg">
        <div className="flex-shrink-0 p-2 bg-terminal-panel rounded border border-terminal-border">
          <PatternDiagram pattern={pattern.pattern} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium text-sm truncate">
            {pattern.pattern}
          </h3>
          <p className={`text-xs mt-0.5 ${getTypeColor(pattern.type)}`}>
            {getTypeLabel(pattern.type)}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-terminal-bg rounded transition-colors"
        >
          <X size={14} className="text-gray-500 hover:text-white" />
        </button>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        {/* Description */}
        <p className="text-gray-400 text-xs leading-relaxed">
          {pattern.description}
        </p>

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-terminal-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Reliability:</span>
              <span className={getReliabilityColor(pattern.reliability)}>
                {pattern.reliability}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">Candles:</span>
              <span className="text-gray-300">{pattern.candleCount}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-gray-300">{formatTime(pattern.time)}</div>
            <div className="text-gray-500">{formatDate(pattern.time)}</div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Container component that connects to the store
export function PatternTooltipContainer() {
  const { selectedPattern, tooltipPosition, clearSelection } = usePatternStore()

  return (
    <AnimatePresence>
      {selectedPattern && tooltipPosition && (
        <PatternTooltip
          pattern={selectedPattern}
          position={tooltipPosition}
          onClose={clearSelection}
        />
      )}
    </AnimatePresence>
  )
}
