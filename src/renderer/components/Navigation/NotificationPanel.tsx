import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { X, Zap, CheckCircle, XCircle, Trash2 } from 'lucide-react'
import { useNotificationStore, type PendingRecommendation } from '../../stores/notificationStore'
import { useMarketStore } from '../../stores/marketStore'
import { logTradeDecision } from '../../lib/db'
import { playSound } from '../../lib/sounds'

interface NotificationPanelProps {
  onClose: () => void
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const pendingRecommendations = useNotificationStore(state => state.pendingRecommendations)
  const removePending = useNotificationStore(state => state.removePending)
  const clearAll = useNotificationStore(state => state.clearAll)
  const watchlist = useMarketStore(state => state.watchlist)

  const handleDecision = useCallback(async (
    rec: PendingRecommendation,
    decision: 'execute' | 'skip'
  ) => {
    const watchlistItem = watchlist.find(w => w.symbol === rec.ticker)
    const currentPrice = watchlistItem?.quote.price

    await logTradeDecision({
      timestamp: Date.now(),
      symbol: rec.ticker,
      action: rec.action,
      decision,
      confidence: rec.confidence,
      rationale: rec.rationale,
      priceAtDecision: currentPrice,
      priceTarget: rec.priceTarget,
      stopLoss: rec.stopLoss,
      outcome: decision === 'execute' ? 'pending' : undefined,
      source: 'cloud_ai',
    })

    // Play sound
    if (decision === 'execute') {
      const soundAction = rec.action.toLowerCase() as 'buy' | 'sell' | 'hold'
      playSound(soundAction).catch(console.error)
    }

    removePending(rec.id)
  }, [watchlist, removePending])

  const handleBulkAction = useCallback(async (decision: 'execute' | 'skip') => {
    for (const rec of pendingRecommendations) {
      await handleDecision(rec, decision)
    }
  }, [pendingRecommendations, handleDecision])

  const actionColors = {
    BUY: 'text-semantic-up',
    SELL: 'text-semantic-down',
    HOLD: 'text-terminal-amber',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className="absolute top-full right-0 mt-2 w-80 max-h-[400px] bg-terminal-panel border border-terminal-border rounded-lg shadow-2xl overflow-hidden z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-terminal-border bg-terminal-bg/50">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-terminal-amber" />
          <span className="text-white text-sm font-medium">
            Pending ({pendingRecommendations.length})
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-terminal-border rounded transition-colors"
        >
          <X size={16} className="text-gray-400 hover:text-white" />
        </button>
      </div>

      {/* Bulk Actions */}
      {pendingRecommendations.length > 0 && (
        <div className="flex gap-2 px-4 py-2 border-b border-terminal-border bg-terminal-bg/30">
          <button
            onClick={() => handleBulkAction('execute')}
            className="flex-1 py-1.5 px-3 text-xs font-medium rounded bg-semantic-up/20 text-semantic-up hover:bg-semantic-up/30 transition-colors flex items-center justify-center gap-1"
          >
            <CheckCircle size={12} />
            Execute All
          </button>
          <button
            onClick={() => handleBulkAction('skip')}
            className="flex-1 py-1.5 px-3 text-xs font-medium rounded bg-terminal-border text-gray-300 hover:bg-terminal-border/70 transition-colors flex items-center justify-center gap-1"
          >
            <XCircle size={12} />
            Skip All
          </button>
          <button
            onClick={clearAll}
            className="py-1.5 px-2 text-xs rounded bg-semantic-down/20 text-semantic-down hover:bg-semantic-down/30 transition-colors"
            title="Clear all without logging"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      {/* Recommendations List */}
      <div className="overflow-y-auto max-h-[280px]">
        {pendingRecommendations.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-gray-500 text-sm">No pending recommendations</p>
            <p className="text-gray-600 text-xs mt-1">
              Dismissed signals will appear here
            </p>
          </div>
        ) : (
          pendingRecommendations.map(rec => (
            <div
              key={rec.id}
              className={`px-4 py-3 border-b border-terminal-border hover:bg-terminal-border/30 ${
                !rec.viewed ? 'bg-terminal-amber/5' : ''
              }`}
            >
              {/* Ticker & Action */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-terminal-amber font-mono font-semibold">
                  {rec.ticker}
                </span>
                <span className={`text-xs font-bold ${actionColors[rec.action]}`}>
                  {rec.action}
                </span>
              </div>

              {/* Confidence & Time */}
              <div className="flex items-center justify-between mb-2 text-xs text-gray-400">
                <span>{rec.confidence}% confidence</span>
                <span>{formatTimeAgo(rec.dismissedAt)}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleDecision(rec, 'execute')}
                  className={`flex-1 py-1 text-xs rounded font-medium ${
                    rec.action === 'SELL'
                      ? 'bg-semantic-down/80 text-white hover:bg-semantic-down'
                      : 'bg-semantic-up/80 text-black hover:bg-semantic-up'
                  }`}
                >
                  Execute
                </button>
                <button
                  onClick={() => handleDecision(rec, 'skip')}
                  className="flex-1 py-1 text-xs rounded font-medium bg-terminal-border text-gray-300 hover:bg-terminal-border/70"
                >
                  Skip
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  )
}
