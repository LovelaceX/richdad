import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { NewsItemExtended } from '../../types'

interface NewsModalProps {
  item: NewsItemExtended | null
  onClose: () => void
}

export function NewsModal({ item, onClose }: NewsModalProps) {
  if (!item) return null

  const getSentimentIcon = (sentiment?: 'positive' | 'negative' | 'neutral') => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="w-5 h-5 text-terminal-up" />
      case 'negative':
        return <TrendingDown className="w-5 h-5 text-terminal-down" />
      default:
        return <Minus className="w-5 h-5 text-gray-400" />
    }
  }

  return (
    <AnimatePresence>
      {/* Semi-transparent backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-start justify-end p-4"
      >
        {/* Notification card - slides in from right */}
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-terminal-panel border border-terminal-border rounded-lg shadow-2xl w-full max-w-lg mt-16"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b border-terminal-border">
            <div className="flex items-center gap-2">
              {getSentimentIcon(item.sentiment)}
              <div className="flex gap-2">
                {item.ticker && (
                  <span className="text-terminal-amber font-mono text-sm font-semibold">
                    ${item.ticker}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
            {/* Headline */}
            <h3 className="text-white text-lg font-medium leading-snug">
              {item.headline}
            </h3>

            {/* Summary */}
            <p className="text-gray-300 text-sm leading-relaxed">
              {item.summary || 'Market analysts are closely watching this development for potential impact on trading volumes and investor sentiment in the coming sessions.'}
            </p>

            {/* Image if available */}
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt=""
                className="w-full h-48 object-cover rounded"
              />
            )}

            {/* Timestamp */}
            <p className="text-gray-500 text-xs">
              {new Date(item.timestamp).toLocaleString()}
            </p>
          </div>

          {/* Footer with source */}
          <div className="border-t border-terminal-border p-4 flex items-center justify-between">
            <span className="text-gray-400 text-sm">Source: {item.source}</span>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-terminal-amber hover:underline text-sm flex items-center gap-1"
              >
                View Article <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
