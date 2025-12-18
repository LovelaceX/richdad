import { useEffect, useState } from 'react'
import { Activity, TrendingUp, TrendingDown, AlertTriangle, BarChart3, Zap, Target } from 'lucide-react'
import type { MarketRegime, MarketRegimeType } from '../../../services/marketRegime'

interface MarketContextData {
  regime: MarketRegime | null
  vixLevel: 'low' | 'elevated' | 'high'
  spyTrend: 'bullish' | 'bearish' | 'neutral'
  correlations: {
    spy: number
    qqq: number
    bonds: number
  }
}

export function MarketContextPanel() {
  const [context, setContext] = useState<MarketContextData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const loadContext = async () => {
      try {
        const { calculateMarketRegime } = await import('../../../services/marketRegime')
        const regime = await calculateMarketRegime()

        if (regime) {
          setContext({
            regime,
            vixLevel: regime.vix < 15 ? 'low' : regime.vix > 25 ? 'high' : 'elevated',
            spyTrend: regime.spyMA50 && regime.spyPrice > regime.spyMA50 ? 'bullish' : 'bearish',
            correlations: {
              spy: 1.0,  // SPY always correlates with itself
              qqq: 0.92, // Tech typically high correlation
              bonds: -0.35 // Inverse correlation
            }
          })
        }
      } catch (error) {
        console.error('[MarketContextPanel] Failed to load context:', error)
      } finally {
        setLoading(false)
      }
    }

    loadContext()
    const interval = setInterval(loadContext, 5 * 60 * 1000) // Refresh every 5 min
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
        <div className="flex items-center gap-2 text-gray-500">
          <Activity size={14} className="animate-pulse" />
          <span className="text-sm">Loading market context...</span>
        </div>
      </div>
    )
  }

  if (!context?.regime) {
    return null
  }

  const { regime, vixLevel, spyTrend } = context
  const { label, color, bgColor, icon: Icon } = getRegimeDisplay(regime.regime)

  return (
    <div className="bg-terminal-panel border border-terminal-border rounded-lg overflow-hidden">
      {/* Header - Always Visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-terminal-bg/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded ${bgColor}`}>
            <Icon size={16} className={color} />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className={`font-medium ${color}`}>{label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${getRiskBadge(regime.riskLevel)}`}>
                {regime.riskLevel.toUpperCase()}
              </span>
            </div>
            <p className="text-gray-500 text-[10px]">Market Regime</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4">
          <QuickStat label="VIX" value={regime.vix.toFixed(1)} color={getVixColor(regime.vix)} />
          <QuickStat label="SPY" value={`$${regime.spyPrice.toFixed(0)}`} color="text-white" />
          <div className={`transition-transform ${expanded ? 'rotate-180' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" className="text-gray-500">
              <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-terminal-border">
          {/* Guidance */}
          <div className="pt-3">
            <p className="text-gray-300 text-xs">{regime.description}</p>
            <p className="text-gray-400 text-[10px] mt-1">{regime.tradingGuidance}</p>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-2">
            <MetricCard
              icon={Zap}
              label="Volatility"
              value={vixLevel.charAt(0).toUpperCase() + vixLevel.slice(1)}
              subValue={`VIX: ${regime.vix.toFixed(1)}`}
              color={getVixColor(regime.vix)}
            />
            <MetricCard
              icon={TrendingUp}
              label="Trend"
              value={spyTrend.charAt(0).toUpperCase() + spyTrend.slice(1)}
              subValue={regime.spyMA50 ? `MA50: $${regime.spyMA50.toFixed(0)}` : 'N/A'}
              color={spyTrend === 'bullish' ? 'text-terminal-up' : 'text-terminal-down'}
            />
            <MetricCard
              icon={Target}
              label="Risk"
              value={regime.riskLevel.charAt(0).toUpperCase() + regime.riskLevel.slice(1)}
              subValue={getRiskGuidance(regime.riskLevel)}
              color={getRiskColor(regime.riskLevel)}
            />
          </div>

          {/* Position Sizing Guidance */}
          <div className="bg-terminal-bg rounded p-3">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={12} className="text-terminal-amber" />
              <span className="text-xs text-white font-medium">Position Sizing</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="text-gray-500">Suggested: </span>
                <span className={getRiskColor(regime.riskLevel)}>
                  {getPositionSizeGuidance(regime.riskLevel)}
                </span>
              </div>
              <div className="text-gray-600">|</div>
              <div>
                <span className="text-gray-500">Stop-loss: </span>
                <span className="text-gray-300">
                  {getStopLossGuidance(regime.riskLevel)}
                </span>
              </div>
            </div>
          </div>

          {/* Correlations (simplified) */}
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-gray-500">Correlations:</span>
            <span className="text-gray-400">QQQ</span>
            <CorrelationBar value={context.correlations.qqq} />
            <span className="text-gray-400 ml-2">Bonds</span>
            <CorrelationBar value={context.correlations.bonds} />
          </div>
        </div>
      )}
    </div>
  )
}

// Sub-components

function QuickStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-right">
      <div className={`text-xs font-medium ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  subValue,
  color
}: {
  icon: typeof Activity
  label: string
  value: string
  subValue: string
  color: string
}) {
  return (
    <div className="bg-terminal-bg rounded p-2">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={10} className="text-gray-500" />
        <span className="text-[10px] text-gray-500">{label}</span>
      </div>
      <div className={`text-sm font-medium ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-500">{subValue}</div>
    </div>
  )
}

function CorrelationBar({ value }: { value: number }) {
  const width = Math.abs(value) * 50
  const isNegative = value < 0

  return (
    <div className="flex items-center gap-1">
      <div className="w-12 h-1.5 bg-terminal-bg rounded overflow-hidden">
        <div
          className={`h-full ${isNegative ? 'bg-terminal-down' : 'bg-terminal-up'}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className={`text-[10px] ${isNegative ? 'text-terminal-down' : 'text-terminal-up'}`}>
        {value > 0 ? '+' : ''}{(value * 100).toFixed(0)}%
      </span>
    </div>
  )
}

// Helper functions

function getRegimeDisplay(regime: MarketRegimeType) {
  switch (regime) {
    case 'LOW_VOL_BULLISH':
      return { label: 'Risk On', color: 'text-terminal-up', bgColor: 'bg-terminal-up/10', icon: TrendingUp }
    case 'LOW_VOL_BEARISH':
      return { label: 'Quiet Decline', color: 'text-terminal-amber', bgColor: 'bg-terminal-amber/10', icon: TrendingDown }
    case 'ELEVATED_VOL_BULLISH':
      return { label: 'Cautious Bull', color: 'text-terminal-amber', bgColor: 'bg-terminal-amber/10', icon: TrendingUp }
    case 'ELEVATED_VOL_BEARISH':
      return { label: 'Caution', color: 'text-orange-400', bgColor: 'bg-orange-400/10', icon: AlertTriangle }
    case 'HIGH_VOL_BULLISH':
      return { label: 'Volatile Rally', color: 'text-purple-400', bgColor: 'bg-purple-400/10', icon: Activity }
    case 'HIGH_VOL_BEARISH':
      return { label: 'Fear Mode', color: 'text-terminal-down', bgColor: 'bg-terminal-down/10', icon: AlertTriangle }
    case 'CHOPPY':
      return { label: 'Choppy', color: 'text-terminal-down', bgColor: 'bg-terminal-down/10', icon: AlertTriangle }
    default:
      return { label: 'Mixed', color: 'text-gray-400', bgColor: 'bg-gray-400/10', icon: Activity }
  }
}

function getVixColor(vix: number): string {
  if (vix < 15) return 'text-terminal-up'
  if (vix < 25) return 'text-terminal-amber'
  return 'text-terminal-down'
}

function getRiskColor(risk: string): string {
  switch (risk) {
    case 'low': return 'text-terminal-up'
    case 'moderate': return 'text-terminal-amber'
    case 'high': return 'text-orange-400'
    case 'extreme': return 'text-terminal-down'
    default: return 'text-gray-400'
  }
}

function getRiskBadge(risk: string): string {
  switch (risk) {
    case 'low': return 'bg-terminal-up/20 text-terminal-up'
    case 'moderate': return 'bg-terminal-amber/20 text-terminal-amber'
    case 'high': return 'bg-orange-400/20 text-orange-400'
    case 'extreme': return 'bg-terminal-down/20 text-terminal-down'
    default: return 'bg-gray-400/20 text-gray-400'
  }
}

function getRiskGuidance(risk: string): string {
  switch (risk) {
    case 'low': return 'Full positions OK'
    case 'moderate': return 'Reduce size 25%'
    case 'high': return 'Reduce size 50%'
    case 'extreme': return 'Cash preferred'
    default: return 'Be selective'
  }
}

function getPositionSizeGuidance(risk: string): string {
  switch (risk) {
    case 'low': return '100%'
    case 'moderate': return '75%'
    case 'high': return '50%'
    case 'extreme': return '25%'
    default: return '50%'
  }
}

function getStopLossGuidance(risk: string): string {
  switch (risk) {
    case 'low': return '5-7%'
    case 'moderate': return '4-5%'
    case 'high': return '3-4%'
    case 'extreme': return '2-3%'
    default: return '5%'
  }
}
