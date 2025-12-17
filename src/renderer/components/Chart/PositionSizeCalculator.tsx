import { useState } from 'react'
import { Calculator, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'
import { useMarketStore } from '../../stores/marketStore'

const QUICK_RISK_PERCENTAGES = [0.5, 1, 1.5, 2, 3, 5]
const QUICK_STOP_LOSSES = [1, 2, 3, 5, 7, 10]

export function PositionSizeCalculator() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [accountSize, setAccountSize] = useState('10000')
  const [riskPercent, setRiskPercent] = useState('2')
  const [entryPrice, setEntryPrice] = useState('')
  const [stopLoss, setStopLoss] = useState('')

  const selectedTicker = useMarketStore(state => state.selectedTicker)
  const watchlist = useMarketStore(state => state.watchlist)
  const selectedItem = watchlist.find(item => item.symbol === selectedTicker)
  const currentPrice = selectedItem?.quote?.price

  // Auto-fill entry price and default stop loss when expanded
  const handleExpand = () => {
    if (!isExpanded && currentPrice) {
      setEntryPrice(currentPrice.toFixed(2))
      // Auto-set stop loss 2% below entry (for long)
      setStopLoss((currentPrice * 0.98).toFixed(2))
    }
    setIsExpanded(!isExpanded)
  }

  // Quick risk % selection
  const handleQuickRisk = (pct: number) => {
    setRiskPercent(pct.toString())
  }

  // Quick stop loss % selection (% below entry)
  const handleQuickStopLoss = (pct: number) => {
    const entry = parseFloat(entryPrice)
    if (entry > 0) {
      setStopLoss((entry * (1 - pct / 100)).toFixed(2))
    }
  }

  // Reset to defaults
  const handleReset = () => {
    setAccountSize('10000')
    setRiskPercent('2')
    if (currentPrice) {
      setEntryPrice(currentPrice.toFixed(2))
      setStopLoss((currentPrice * 0.98).toFixed(2))
    } else {
      setEntryPrice('')
      setStopLoss('')
    }
  }

  // Calculate position size
  const account = parseFloat(accountSize) || 0
  const risk = parseFloat(riskPercent) || 0
  const entry = parseFloat(entryPrice) || 0
  const stop = parseFloat(stopLoss) || 0

  const riskAmount = account * (risk / 100)
  const riskPerShare = Math.abs(entry - stop)
  const shares = riskPerShare > 0 ? Math.floor(riskAmount / riskPerShare) : 0
  const totalCost = shares * entry
  const isValidCalc = entry > 0 && stop > 0 && riskPerShare > 0

  // Determine if stop is above or below entry (short vs long)
  const isLong = stop < entry
  const tradeDirection = isLong ? 'Long' : 'Short'

  // Calculate current stop loss percentage for highlighting
  const currentStopPct = entry > 0 && stop > 0
    ? Math.abs((entry - stop) / entry * 100)
    : 0

  return (
    <div className="relative">
      {/* Calculator Toggle Button */}
      <button
        onClick={handleExpand}
        className={`
          flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-all
          ${isExpanded
            ? 'bg-terminal-amber/20 text-terminal-amber border border-terminal-amber/50'
            : 'text-gray-400 hover:text-terminal-amber hover:bg-terminal-border/50 border border-transparent'
          }
        `}
        title="Position Size Calculator"
      >
        <Calculator size={12} />
        <span className="hidden sm:inline">Size</span>
        {isExpanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>

      {/* Expanded Calculator Panel */}
      {isExpanded && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-terminal-panel border border-terminal-border rounded-lg shadow-xl z-50">
          {/* Header */}
          <div className="px-3 py-2 border-b border-terminal-border">
            <div className="flex items-center justify-between">
              <span className="text-white text-xs font-medium">Position Size Calculator</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-[10px]">{selectedTicker}</span>
                <button
                  onClick={handleReset}
                  className="p-1 text-gray-500 hover:text-terminal-amber transition-colors"
                  title="Reset"
                >
                  <RotateCcw size={10} />
                </button>
              </div>
            </div>
          </div>

          {/* Inputs */}
          <div className="p-3 space-y-3">
            {/* Account Size */}
            <div>
              <label className="text-gray-400 text-[10px] uppercase tracking-wide">Account Size</label>
              <div className="relative mt-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">$</span>
                <input
                  type="number"
                  value={accountSize}
                  onChange={(e) => setAccountSize(e.target.value)}
                  className="w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1.5 pl-5 text-white text-xs focus:border-terminal-amber focus:outline-none"
                  placeholder="10000"
                />
              </div>
            </div>

            {/* Risk % with Quick Buttons */}
            <div>
              <label className="text-gray-400 text-[10px] uppercase tracking-wide">Risk Per Trade</label>
              <div className="relative mt-1">
                <input
                  type="number"
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(e.target.value)}
                  step="0.5"
                  min="0.5"
                  max="10"
                  className="w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1.5 pr-6 text-white text-xs focus:border-terminal-amber focus:outline-none"
                  placeholder="2"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">%</span>
              </div>
              {/* Quick Risk Buttons */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {QUICK_RISK_PERCENTAGES.map((pct) => (
                  <button
                    key={pct}
                    onClick={() => handleQuickRisk(pct)}
                    className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                      riskPercent === pct.toString()
                        ? 'bg-terminal-amber/20 text-terminal-amber border border-terminal-amber/50'
                        : 'bg-terminal-bg text-gray-400 hover:text-white border border-terminal-border'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Entry Price */}
            <div>
              <label className="text-gray-400 text-[10px] uppercase tracking-wide">Entry Price</label>
              <div className="relative mt-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">$</span>
                <input
                  type="number"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  step="0.01"
                  className="w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1.5 pl-5 text-white text-xs focus:border-terminal-amber focus:outline-none"
                  placeholder={currentPrice?.toFixed(2) || '0.00'}
                />
              </div>
            </div>

            {/* Stop Loss with Quick Buttons */}
            <div>
              <label className="text-gray-400 text-[10px] uppercase tracking-wide">Stop Loss</label>
              <div className="relative mt-1">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">$</span>
                <input
                  type="number"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  step="0.01"
                  className="w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1.5 pl-5 text-white text-xs focus:border-terminal-amber focus:outline-none"
                  placeholder="0.00"
                />
              </div>
              {/* Quick Stop Loss Buttons */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {QUICK_STOP_LOSSES.map((pct) => (
                  <button
                    key={pct}
                    onClick={() => handleQuickStopLoss(pct)}
                    className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                      Math.abs(currentStopPct - pct) < 0.5
                        ? 'bg-semantic-down/20 text-semantic-down border border-semantic-down/50'
                        : 'bg-terminal-bg text-gray-400 hover:text-white border border-terminal-border'
                    }`}
                  >
                    -{pct}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results */}
          {isValidCalc && (
            <div className="px-3 pb-3 space-y-2">
              <div className="h-px bg-terminal-border" />

              {/* Risk Amount */}
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-[10px]">Risk Amount</span>
                <span className="text-terminal-amber text-xs font-medium">
                  ${riskAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Risk Per Share */}
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-[10px]">Risk/Share</span>
                <span className="text-gray-300 text-xs">
                  ${riskPerShare.toFixed(2)}
                </span>
              </div>

              {/* Position Size - Main Result */}
              <div className="bg-terminal-bg border border-terminal-amber/30 rounded p-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-[10px]">Position Size</span>
                  <span className="text-terminal-amber text-lg font-bold">
                    {shares.toLocaleString()} shares
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-gray-400 text-[10px]">Total Cost</span>
                  <span className="text-white text-xs font-medium">
                    ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Trade Direction Indicator */}
              <div className="flex justify-center">
                <span className={`text-[10px] px-2 py-0.5 rounded ${
                  isLong
                    ? 'bg-semantic-up/10 text-semantic-up'
                    : 'bg-semantic-down/10 text-semantic-down'
                }`}>
                  {tradeDirection} Position
                </span>
              </div>
            </div>
          )}

          {/* Help Text */}
          {!isValidCalc && (
            <div className="px-3 pb-3">
              <p className="text-gray-500 text-[10px] text-center">
                Enter entry price and stop loss to calculate position size
              </p>
            </div>
          )}

          {/* Formula Footer */}
          <div className="px-3 py-2 border-t border-terminal-border bg-terminal-bg/50 rounded-b-lg">
            <p className="text-gray-500 text-[9px] font-mono text-center">
              shares = (account × risk%) ÷ (entry − stop)
            </p>
          </div>
        </div>
      )}

      {/* Backdrop to close on outside click */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  )
}
