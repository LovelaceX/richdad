import { useEffect, useState } from 'react'
import { Activity, TrendingUp, TrendingDown, AlertTriangle, Shield } from 'lucide-react'
import type { MarketRegime, MarketRegimeType } from '../../../services/marketRegime'

interface MarketRegimeIndicatorProps {
  compact?: boolean  // For header display
}

export function MarketRegimeIndicator({ compact = false }: MarketRegimeIndicatorProps) {
  const [regime, setRegime] = useState<MarketRegime | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    const loadRegime = async () => {
      try {
        const { calculateMarketRegime } = await import('../../../services/marketRegime')
        const result = await calculateMarketRegime()
        setRegime(result)
      } catch (error) {
        console.error('[MarketRegimeIndicator] Failed to load regime:', error)
      } finally {
        setLoading(false)
      }
    }

    loadRegime()

    // Refresh every 5 minutes
    const interval = setInterval(loadRegime, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-1 text-gray-500 text-[10px]">
        <Activity size={12} className="animate-pulse" />
        <span>Loading...</span>
      </div>
    )
  }

  if (!regime) {
    return null
  }

  const { label, color, bgColor, icon: Icon } = getRegimeDisplay(regime.regime)

  if (compact) {
    return (
      <div
        className="relative"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-medium cursor-help ${bgColor} ${color}`}
          title={regime.description}
        >
          <Icon size={12} />
          <span>{label}</span>
        </div>

        {/* Tooltip */}
        {showTooltip && (
          <div className="absolute top-full left-0 mt-2 w-64 p-3 bg-terminal-panel border border-terminal-border rounded-lg shadow-xl z-50">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} className={color} />
              <span className={`font-medium ${color}`}>{label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${getRiskBadge(regime.riskLevel)}`}>
                {regime.riskLevel.toUpperCase()}
              </span>
            </div>

            <p className="text-gray-300 text-xs mb-2">{regime.description}</p>
            <p className="text-gray-400 text-[10px] mb-3">{regime.tradingGuidance}</p>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-terminal-bg rounded p-2">
                <span className="text-gray-500">VIX</span>
                <span className={`ml-2 ${getVixColor(regime.vix)}`}>
                  {regime.vix.toFixed(1)}
                </span>
              </div>
              <div className="bg-terminal-bg rounded p-2">
                <span className="text-gray-500">SPY vs MA50</span>
                <span className={`ml-2 ${regime.spyMA50 && regime.spyPrice > regime.spyMA50 ? 'text-terminal-up' : 'text-terminal-down'}`}>
                  {regime.spyMA50 ? (regime.spyPrice > regime.spyMA50 ? 'Above' : 'Below') : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Full display (for panel)
  return (
    <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white text-sm font-medium">Market Regime</span>
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${bgColor} ${color}`}>
          <Icon size={14} />
          <span className="text-xs font-medium">{label}</span>
        </div>
      </div>

      <p className="text-gray-300 text-xs mb-2">{regime.description}</p>
      <p className="text-gray-400 text-[10px] mb-4">{regime.tradingGuidance}</p>

      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <div className="bg-terminal-bg rounded p-2 text-center">
          <div className="text-gray-500 mb-1">VIX</div>
          <div className={`font-medium ${getVixColor(regime.vix)}`}>
            {regime.vix.toFixed(1)}
          </div>
        </div>
        <div className="bg-terminal-bg rounded p-2 text-center">
          <div className="text-gray-500 mb-1">SPY</div>
          <div className="text-white font-medium">
            ${regime.spyPrice.toFixed(2)}
          </div>
        </div>
        <div className="bg-terminal-bg rounded p-2 text-center">
          <div className="text-gray-500 mb-1">Risk</div>
          <div className={`font-medium ${getRiskColor(regime.riskLevel)}`}>
            {regime.riskLevel.charAt(0).toUpperCase() + regime.riskLevel.slice(1)}
          </div>
        </div>
      </div>
    </div>
  )
}

function getRegimeDisplay(regime: MarketRegimeType): {
  label: string
  color: string
  bgColor: string
  icon: typeof TrendingUp
} {
  switch (regime) {
    case 'LOW_VOL_BULLISH':
      return {
        label: 'Risk On',
        color: 'text-terminal-up',
        bgColor: 'bg-terminal-up/10',
        icon: TrendingUp
      }
    case 'LOW_VOL_BEARISH':
      return {
        label: 'Quiet Decline',
        color: 'text-terminal-amber',
        bgColor: 'bg-terminal-amber/10',
        icon: TrendingDown
      }
    case 'ELEVATED_VOL_BULLISH':
      return {
        label: 'Cautious Bull',
        color: 'text-terminal-amber',
        bgColor: 'bg-terminal-amber/10',
        icon: TrendingUp
      }
    case 'ELEVATED_VOL_BEARISH':
      return {
        label: 'Caution',
        color: 'text-orange-400',
        bgColor: 'bg-orange-400/10',
        icon: AlertTriangle
      }
    case 'HIGH_VOL_BULLISH':
      return {
        label: 'Volatile Rally',
        color: 'text-purple-400',
        bgColor: 'bg-purple-400/10',
        icon: Activity
      }
    case 'HIGH_VOL_BEARISH':
      return {
        label: 'Fear Mode',
        color: 'text-terminal-down',
        bgColor: 'bg-terminal-down/10',
        icon: Shield
      }
    case 'CHOPPY':
      return {
        label: 'Choppy',
        color: 'text-terminal-down',
        bgColor: 'bg-terminal-down/10',
        icon: AlertTriangle
      }
    default:
      return {
        label: 'Mixed',
        color: 'text-gray-400',
        bgColor: 'bg-gray-400/10',
        icon: Activity
      }
  }
}

function getVixColor(vix: number): string {
  if (vix < 15) return 'text-terminal-up'
  if (vix < 25) return 'text-terminal-amber'
  return 'text-terminal-down'
}

function getRiskColor(risk: 'low' | 'moderate' | 'high' | 'extreme'): string {
  switch (risk) {
    case 'low': return 'text-terminal-up'
    case 'moderate': return 'text-terminal-amber'
    case 'high': return 'text-orange-400'
    case 'extreme': return 'text-terminal-down'
  }
}

function getRiskBadge(risk: 'low' | 'moderate' | 'high' | 'extreme'): string {
  switch (risk) {
    case 'low': return 'bg-terminal-up/20 text-terminal-up'
    case 'moderate': return 'bg-terminal-amber/20 text-terminal-amber'
    case 'high': return 'bg-orange-400/20 text-orange-400'
    case 'extreme': return 'bg-terminal-down/20 text-terminal-down'
  }
}
