import { useState } from 'react'
import { ArrowUpCircle, ArrowDownCircle, X, Check } from 'lucide-react'
import { useMarketStore } from '../../stores/marketStore'
import { logTradeDecision } from '../../lib/db'
import { playSound } from '../../lib/sounds'

type TradeAction = 'BUY' | 'SELL' | null

export function QuickTradeButtons() {
  const selectedTicker = useMarketStore(state => state.selectedTicker)
  const watchlist = useMarketStore(state => state.watchlist)
  const [expandedAction, setExpandedAction] = useState<TradeAction>(null)
  const [shares, setShares] = useState('')
  const [dollarAmount, setDollarAmount] = useState('')
  const [isLogging, setIsLogging] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const currentItem = watchlist.find(w => w.symbol === selectedTicker)
  const currentPrice = currentItem?.quote.price || 0

  const handleButtonClick = (action: TradeAction) => {
    if (expandedAction === action) {
      // Close if already expanded
      setExpandedAction(null)
      resetForm()
    } else {
      setExpandedAction(action)
    }
  }

  const resetForm = () => {
    setShares('')
    setDollarAmount('')
  }

  const handleLogTrade = async () => {
    if (!expandedAction) return

    setIsLogging(true)

    try {
      // Parse optional fields
      const sharesNum = shares ? parseInt(shares, 10) : undefined
      const dollarNum = dollarAmount ? parseFloat(dollarAmount) : undefined

      // Calculate dollar amount from shares if only shares provided
      const calculatedDollar = sharesNum && currentPrice
        ? Math.round(sharesNum * currentPrice * 100) / 100
        : dollarNum

      await logTradeDecision({
        timestamp: Date.now(),
        symbol: selectedTicker,
        action: expandedAction,
        decision: 'execute',
        confidence: 100,  // Manual = user is certain
        rationale: `Manual ${expandedAction.toLowerCase()} logged from chart`,
        priceAtDecision: currentPrice,
        source: 'manual',
        outcome: 'pending',
        shares: sharesNum,
        dollarAmount: calculatedDollar
      })

      // Play sound
      playSound(expandedAction.toLowerCase() as 'buy' | 'sell')

      // Show success feedback
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        setExpandedAction(null)
        resetForm()
      }, 1500)

      console.log(`[Quick Trade] Logged ${expandedAction} ${selectedTicker} @ $${currentPrice}${sharesNum ? ` (${sharesNum} shares)` : ''}`)

    } catch (error) {
      console.error('[Quick Trade] Failed to log trade:', error)
    } finally {
      setIsLogging(false)
    }
  }

  const handleSharesChange = (value: string) => {
    setShares(value)
    // Auto-calculate dollar amount
    if (value && currentPrice) {
      const num = parseInt(value, 10)
      if (!isNaN(num)) {
        setDollarAmount((num * currentPrice).toFixed(2))
      }
    }
  }

  const handleDollarChange = (value: string) => {
    setDollarAmount(value)
    // Auto-calculate shares
    if (value && currentPrice) {
      const num = parseFloat(value)
      if (!isNaN(num)) {
        setShares(Math.floor(num / currentPrice).toString())
      }
    }
  }

  return (
    <div className="relative flex items-center gap-1.5">
      {/* Buy Button */}
      <button
        onClick={() => handleButtonClick('BUY')}
        className={`
          flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all
          ${expandedAction === 'BUY'
            ? 'bg-semantic-up text-black'
            : 'bg-semantic-up text-white hover:bg-semantic-up/90'
          }
        `}
        title="Log a buy trade"
      >
        <ArrowUpCircle size={12} />
        Buy
      </button>

      {/* Sell Button */}
      <button
        onClick={() => handleButtonClick('SELL')}
        className={`
          flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all
          ${expandedAction === 'SELL'
            ? 'bg-semantic-down text-black'
            : 'bg-semantic-down text-white hover:bg-semantic-down/90'
          }
        `}
        title="Log a sell trade"
      >
        <ArrowDownCircle size={12} />
        Sell
      </button>

      {/* Expanded Panel */}
      {expandedAction && (
        <div className={`
          absolute top-full left-0 mt-1 z-50
          bg-terminal-panel border rounded-lg shadow-lg p-3 min-w-[280px]
          ${expandedAction === 'BUY' ? 'border-semantic-up/50' : 'border-semantic-down/50'}
        `}>
          {showSuccess ? (
            <div className="flex items-center gap-2 text-semantic-up">
              <Check size={16} />
              <span className="text-sm font-medium">
                {expandedAction} {selectedTicker} logged!
              </span>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-medium ${expandedAction === 'BUY' ? 'text-semantic-up' : 'text-semantic-down'}`}>
                  {expandedAction} {selectedTicker} @ ${currentPrice.toFixed(2)}
                </span>
                <button
                  onClick={() => {
                    setExpandedAction(null)
                    resetForm()
                  }}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Optional Fields */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2">
                  <label className="text-gray-400 text-xs w-16">Shares:</label>
                  <input
                    type="number"
                    value={shares}
                    onChange={(e) => handleSharesChange(e.target.value)}
                    placeholder="Optional"
                    className="flex-1 bg-terminal-bg border border-terminal-border rounded px-2 py-1 text-xs text-white placeholder:text-gray-500 focus:border-terminal-amber focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-gray-400 text-xs w-16">Amount:</label>
                  <div className="flex-1 relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">$</span>
                    <input
                      type="number"
                      value={dollarAmount}
                      onChange={(e) => handleDollarChange(e.target.value)}
                      placeholder="Optional"
                      step="0.01"
                      className="w-full bg-terminal-bg border border-terminal-border rounded pl-5 pr-2 py-1 text-xs text-white placeholder:text-gray-500 focus:border-terminal-amber focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Log Button */}
              <button
                onClick={handleLogTrade}
                disabled={isLogging}
                className={`
                  w-full py-2 rounded text-xs font-medium transition-colors
                  ${expandedAction === 'BUY'
                    ? 'bg-semantic-up text-black hover:bg-semantic-up/90'
                    : 'bg-semantic-down text-black hover:bg-semantic-down/90'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                {isLogging ? 'Logging...' : `Log ${expandedAction}`}
              </button>

              <p className="text-gray-500 text-[10px] mt-2 text-center">
                Fields are optional. Click to log trade at current price.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
