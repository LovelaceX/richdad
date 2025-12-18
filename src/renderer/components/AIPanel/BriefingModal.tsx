/**
 * Briefing Modal
 * Displays morning briefing results with summary and individual ticker recommendations
 */

import { motion, AnimatePresence } from 'framer-motion'
import { X, TrendingUp, TrendingDown, Minus, AlertCircle, Clock } from 'lucide-react'
import type { MorningBriefing, BriefingResult } from '../../types'
import { useMarketStore } from '../../stores/marketStore'

interface Props {
  briefing: MorningBriefing
  onClose: () => void
}

const ActionIcon = ({ action }: { action: 'BUY' | 'SELL' | 'HOLD' | null }) => {
  switch (action) {
    case 'BUY':
      return <TrendingUp size={14} className="text-green-400" />
    case 'SELL':
      return <TrendingDown size={14} className="text-red-400" />
    case 'HOLD':
      return <Minus size={14} className="text-gray-400" />
    default:
      return <AlertCircle size={14} className="text-yellow-500" />
  }
}

const getActionColor = (action: 'BUY' | 'SELL' | 'HOLD' | null) => {
  switch (action) {
    case 'BUY':
      return 'text-green-400 bg-green-500/10 border-green-500/30'
    case 'SELL':
      return 'text-red-400 bg-red-500/10 border-red-500/30'
    case 'HOLD':
      return 'text-gray-400 bg-gray-500/10 border-gray-500/30'
    default:
      return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30'
  }
}

function ResultCard({ result, onClick }: { result: BriefingResult; onClick: () => void }) {
  const action = result.recommendation?.action || null

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`
        w-full p-3 rounded border text-left transition-all
        hover:scale-[1.02] hover:shadow-lg
        ${getActionColor(action)}
      `}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <ActionIcon action={action} />
          <span className="font-mono font-medium">{result.ticker}</span>
        </div>
        {result.recommendation && (
          <span className="text-xs opacity-70">
            {result.recommendation.confidence}%
          </span>
        )}
      </div>

      {result.recommendation ? (
        <p className="text-xs opacity-70 line-clamp-2">
          {result.recommendation.rationale}
        </p>
      ) : (
        <p className="text-xs opacity-50 italic">
          {result.error || 'No recommendation'}
        </p>
      )}
    </motion.button>
  )
}

export function BriefingModal({ briefing, onClose }: Props) {
  const setSelectedTicker = useMarketStore(state => state.setSelectedTicker)
  const generatedTime = new Date(briefing.generatedAt).toLocaleTimeString()

  // Sort results: BUY first, then SELL, then HOLD, then failed
  const sortedResults = [...briefing.results].sort((a, b) => {
    const order = { BUY: 0, SELL: 1, HOLD: 2, null: 3 }
    const aOrder = order[a.recommendation?.action || 'null'] ?? 3
    const bOrder = order[b.recommendation?.action || 'null'] ?? 3
    if (aOrder !== bOrder) return aOrder - bOrder
    // Within same action, sort by confidence
    return (b.recommendation?.confidence || 0) - (a.recommendation?.confidence || 0)
  })

  const handleTickerClick = (ticker: string) => {
    setSelectedTicker(ticker)
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-terminal-bg border border-terminal-border rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-terminal-border">
            <div>
              <h2 className="text-lg font-medium text-terminal-text">Morning Briefing</h2>
              <div className="flex items-center gap-2 text-xs text-terminal-text/50">
                <Clock size={12} />
                <span>Generated at {generatedTime}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-terminal-border rounded transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-2 p-4 border-b border-terminal-border">
            <div className="text-center p-2 bg-green-500/10 rounded">
              <div className="text-2xl font-bold text-green-400">{briefing.summary.buy}</div>
              <div className="text-xs text-green-400/70">BUY</div>
            </div>
            <div className="text-center p-2 bg-red-500/10 rounded">
              <div className="text-2xl font-bold text-red-400">{briefing.summary.sell}</div>
              <div className="text-xs text-red-400/70">SELL</div>
            </div>
            <div className="text-center p-2 bg-gray-500/10 rounded">
              <div className="text-2xl font-bold text-gray-400">{briefing.summary.hold}</div>
              <div className="text-xs text-gray-400/70">HOLD</div>
            </div>
            <div className="text-center p-2 bg-yellow-500/10 rounded">
              <div className="text-2xl font-bold text-yellow-500">{briefing.summary.failed}</div>
              <div className="text-xs text-yellow-500/70">NO SIGNAL</div>
            </div>
          </div>

          {/* Results List */}
          <div className="p-4 overflow-y-auto max-h-[50vh] custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {sortedResults.map((result) => (
                <ResultCard
                  key={result.ticker}
                  result={result}
                  onClick={() => handleTickerClick(result.ticker)}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-terminal-border text-center">
            <p className="text-xs text-terminal-text/50">
              Click any ticker to view its chart and detailed analysis
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
