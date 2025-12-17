import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, Zap, Target, ShieldAlert } from 'lucide-react'
import type { AIRecommendation } from '../../types'
import { useAIStore } from '../../stores/aiStore'
import { useMarketStore } from '../../stores/marketStore'
import { useNotificationStore } from '../../stores/notificationStore'
import { logTradeDecision } from '../../lib/db'
import { playSound } from '../../lib/sounds'
import { formatPrice } from '../../lib/utils'

interface ProactiveAlertProps {
  recommendation: AIRecommendation
}

export function ProactiveAlert({ recommendation }: ProactiveAlertProps) {
  const dismissRecommendation = useAIStore(state => state.dismissRecommendation)
  const addPending = useNotificationStore(state => state.addPending)
  const watchlist = useMarketStore(state => state.watchlist)
  const watchlistItem = watchlist.find(w => w.symbol === recommendation.ticker)
  const currentPrice = watchlistItem?.quote.price

  // Dismiss without action - add to pending queue
  const handleDismissWithoutAction = useCallback(() => {
    addPending(recommendation)
    dismissRecommendation()
  }, [recommendation, addPending, dismissRecommendation])

  const handleDecision = useCallback(async (decision: 'execute' | 'skip') => {
    // Log decision to database (with price targets for outcome tracking)
    await logTradeDecision({
      timestamp: Date.now(),
      symbol: recommendation.ticker,
      action: recommendation.action,
      decision,
      confidence: recommendation.confidence,
      rationale: recommendation.rationale,
      priceAtDecision: currentPrice,
      priceTarget: recommendation.priceTarget,
      stopLoss: recommendation.stopLoss,
      outcome: decision === 'execute' ? 'pending' : undefined,  // Track executed trades
      source: 'cloud_ai',  // AI-generated recommendation
    })

    // Play sound notification based on action
    const soundAction = decision === 'execute'
      ? recommendation.action.toLowerCase() as 'buy' | 'sell' | 'hold'
      : 'alert'
    playSound(soundAction)

    dismissRecommendation()
  }, [recommendation, currentPrice, dismissRecommendation])

  // Keyboard shortcuts: E for Execute, S for Skip, Esc for dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault()
        handleDecision('execute')
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        handleDecision('skip')
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleDismissWithoutAction()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleDecision, handleDismissWithoutAction])

  const actionColors = {
    BUY: 'bg-semantic-up text-black',
    SELL: 'bg-semantic-down text-white',
    HOLD: 'bg-terminal-amber text-black',
  }

  const actionBorderColors = {
    BUY: 'border-semantic-up',
    SELL: 'border-semantic-down',
    HOLD: 'border-terminal-amber',
  }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleDismissWithoutAction}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center"
      >
        {/* Centered Modal */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className={`
            bg-terminal-panel
            border-2 ${actionBorderColors[recommendation.action]}
            rounded-lg shadow-2xl w-full max-w-lg mx-4
          `}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-terminal-border">
            <div className="flex items-center gap-3">
              <Zap size={18} className="text-terminal-amber" />
              <span className="text-terminal-amber font-semibold text-sm">
                AI RECOMMENDATION
              </span>
            </div>

            <button
              onClick={handleDismissWithoutAction}
              className="p-1 hover:bg-terminal-border rounded transition-colors"
            >
              <X size={18} className="text-gray-400 hover:text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4">
            {/* Symbol & Action */}
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-terminal-amber">
                {recommendation.ticker}
              </span>
              <span className={`text-xl font-bold px-3 py-1 rounded ${actionColors[recommendation.action]}`}>
                {recommendation.action}
              </span>
            </div>

            {/* Confidence */}
            <div>
              <div className="flex items-center justify-between mb-1 text-sm">
                <span className="text-gray-400">Confidence</span>
                <span className="text-white">{recommendation.confidence}%</span>
              </div>
              <div className="h-2 bg-terminal-bg rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${recommendation.action === 'SELL' ? 'bg-semantic-down' : 'bg-semantic-up'}`}
                  style={{ width: `${recommendation.confidence}%` }}
                />
              </div>
            </div>

            {/* Price */}
            {currentPrice && (
              <div className="text-sm">
                <span className="text-gray-400">Current Price: </span>
                <span className="text-white font-mono">
                  ${formatPrice(currentPrice)}
                </span>
              </div>
            )}

            {/* Rationale */}
            <div>
              <p className="text-gray-400 text-sm mb-1">Rationale</p>
              <p className="text-white text-sm leading-relaxed">
                {recommendation.rationale}
              </p>
            </div>

            {/* Price targets */}
            {(recommendation.priceTarget || recommendation.stopLoss) && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {recommendation.priceTarget && (
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Target size={14} className="text-semantic-up" />
                      <span className="text-gray-400">Target</span>
                    </div>
                    <span className="text-white font-semibold">
                      ${formatPrice(recommendation.priceTarget)}
                    </span>
                  </div>
                )}
                {recommendation.stopLoss && (
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <ShieldAlert size={14} className="text-semantic-down" />
                      <span className="text-gray-400">Stop Loss</span>
                    </div>
                    <span className="text-white font-semibold">
                      ${formatPrice(recommendation.stopLoss)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Sources */}
            {recommendation.sources && recommendation.sources.length > 0 && (
              <div>
                <p className="text-gray-400 text-sm mb-1">Sources</p>
                <div className="space-y-1">
                  {recommendation.sources.slice(0, 2).map((source, i) => (
                    <a
                      key={i}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-terminal-amber text-xs hover:underline block flex items-center gap-1"
                    >
                      <ExternalLink size={10} />
                      {source.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-terminal-border px-6 py-4 flex gap-2">
            <button
              onClick={() => handleDecision('execute')}
              className={`
                flex-1 py-2 px-4 rounded font-medium
                ${recommendation.action === 'SELL'
                  ? 'bg-semantic-down text-white hover:bg-semantic-down/80'
                  : 'bg-semantic-up text-black hover:bg-semantic-up/80'
                }
                transition-colors flex items-center justify-center gap-2
              `}
            >
              Execute {recommendation.action}
              <kbd className="text-xs opacity-60">[E]</kbd>
            </button>

            <button
              onClick={() => handleDecision('skip')}
              className="flex-1 py-2 px-4 rounded font-medium bg-terminal-panel border border-terminal-border text-white hover:bg-terminal-border/50 transition-colors flex items-center justify-center gap-2"
            >
              Skip
              <kbd className="text-xs opacity-60">[S]</kbd>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
