/**
 * Indicator Selector
 * Dropdown menu for toggling technical indicators on/off
 */

import { useState, useRef, useEffect } from 'react'
import { BarChart2, Check } from 'lucide-react'
import { useIndicatorStore, type IndicatorType } from '../../stores/indicatorStore'

interface IndicatorOption {
  type: IndicatorType
  label: string
  description: string
}

const INDICATOR_OPTIONS: IndicatorOption[] = [
  {
    type: 'macd',
    label: 'MACD',
    description: 'Moving Average Convergence Divergence (12, 26, 9)'
  },
  {
    type: 'stochRsi',
    label: 'Stoch RSI',
    description: 'Stochastic Relative Strength Index (14, 14, 3, 3)'
  }
]

export function IndicatorSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const indicators = useIndicatorStore(state => state.indicators)
  const toggleIndicator = useIndicatorStore(state => state.toggleIndicator)

  // Check if any indicators are active
  const hasActiveIndicators = indicators.some(i => i.visible)

  // Check if a specific indicator is visible
  const isIndicatorVisible = (type: IndicatorType) => {
    const indicator = indicators.find(i => i.type === type)
    return indicator?.visible ?? false
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close menu on Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        title="Technical Indicators"
        className={`
          w-6 h-6 flex items-center justify-center rounded transition-all
          ${hasActiveIndicators
            ? 'bg-terminal-amber/20 text-terminal-amber border border-terminal-amber/50'
            : 'text-gray-500 hover:text-white border border-transparent hover:border-terminal-border'
          }
        `}
      >
        <BarChart2 size={12} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute top-full right-0 mt-2 w-64 bg-terminal-panel border border-terminal-border rounded-lg shadow-xl z-[100]"
        >
          <div className="px-3 py-2 border-b border-terminal-border">
            <span className="text-xs text-gray-400 uppercase tracking-wider">
              Technical Indicators
            </span>
          </div>

          <div className="py-1">
            {INDICATOR_OPTIONS.map(option => {
              const isVisible = isIndicatorVisible(option.type)

              return (
                <button
                  key={option.type}
                  onClick={() => toggleIndicator(option.type)}
                  className="w-full px-3 py-2 flex items-start gap-3 hover:bg-terminal-border/50 transition-colors text-left"
                >
                  {/* Checkbox */}
                  <div
                    className={`
                      w-4 h-4 mt-0.5 rounded border flex items-center justify-center flex-shrink-0
                      ${isVisible
                        ? 'bg-terminal-amber border-terminal-amber'
                        : 'border-gray-500'
                      }
                    `}
                  >
                    {isVisible && <Check size={10} className="text-black" />}
                  </div>

                  {/* Label and Description */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm ${isVisible ? 'text-terminal-amber' : 'text-white'}`}>
                      {option.label}
                    </div>
                    <div className="text-[10px] text-gray-500 truncate">
                      {option.description}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="px-3 py-2 border-t border-terminal-border">
            <p className="text-[10px] text-gray-600">
              Indicators appear below the main chart
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
