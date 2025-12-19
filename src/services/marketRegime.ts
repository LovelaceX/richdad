/**
 * Market Regime Classifier
 * Determines overall market conditions based on SPY trend and VIX volatility
 *
 * Regimes:
 * - LOW_VOL_BULLISH: VIX < 15 && SPY > MA(50) → Risk-on, momentum favored
 * - LOW_VOL_BEARISH: VIX < 15 && SPY < MA(50) → Quiet decline, caution
 * - HIGH_VOL_BULLISH: VIX > 25 && SPY > MA(50) → Volatile rally, reduce size
 * - HIGH_VOL_BEARISH: VIX > 25 && SPY < MA(50) → Fear mode, defensive
 * - ELEVATED_VOL_BULLISH: 15 <= VIX <= 25 && SPY > MA(50) → Moderate risk
 * - ELEVATED_VOL_BEARISH: 15 <= VIX <= 25 && SPY < MA(50) → Caution advised
 * - NEUTRAL: Mixed signals
 */

import { fetchHistoricalData, fetchLivePrices } from './marketData'
import { calculateSMA } from './technicalIndicators'
import { getTradingThresholds, DEFAULT_TRADING_THRESHOLDS, type TradingThresholds } from '../renderer/lib/db'

export type MarketRegimeType =
  | 'LOW_VOL_BULLISH'
  | 'LOW_VOL_BEARISH'
  | 'HIGH_VOL_BULLISH'
  | 'HIGH_VOL_BEARISH'
  | 'ELEVATED_VOL_BULLISH'
  | 'ELEVATED_VOL_BEARISH'
  | 'CHOPPY'
  | 'NEUTRAL'

export interface MarketRegime {
  regime: MarketRegimeType
  vix: number
  spyPrice: number
  spyMA50: number | null
  description: string
  tradingGuidance: string
  riskLevel: 'low' | 'moderate' | 'high' | 'extreme'
  timestamp: number
}

// Cache to avoid excessive API calls
let cachedRegime: MarketRegime | null = null
let cacheTimestamp = 0
const CACHE_DURATION_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Get human-readable description for each regime
 */
function getRegimeDescription(regime: MarketRegimeType): { description: string; guidance: string; risk: 'low' | 'moderate' | 'high' | 'extreme' } {
  switch (regime) {
    case 'LOW_VOL_BULLISH':
      return {
        description: 'Low volatility bull market - ideal conditions',
        guidance: 'Momentum strategies favored. Consider full position sizes.',
        risk: 'low'
      }
    case 'LOW_VOL_BEARISH':
      return {
        description: 'Quiet decline - low volatility but trending down',
        guidance: 'Be cautious of complacency. Watch for trend reversal signals.',
        risk: 'moderate'
      }
    case 'HIGH_VOL_BULLISH':
      return {
        description: 'Volatile rally - high fear but market rising',
        guidance: 'Reduce position sizes. Take profits on rallies.',
        risk: 'high'
      }
    case 'HIGH_VOL_BEARISH':
      return {
        description: 'Fear mode - high volatility, market declining',
        guidance: 'Defensive posture. Consider cash or hedges. Avoid new longs.',
        risk: 'extreme'
      }
    case 'ELEVATED_VOL_BULLISH':
      return {
        description: 'Elevated volatility with bullish trend',
        guidance: 'Moderate risk exposure. Be selective with entries.',
        risk: 'moderate'
      }
    case 'ELEVATED_VOL_BEARISH':
      return {
        description: 'Elevated volatility with bearish trend',
        guidance: 'Caution advised. Tighten stops and reduce exposure.',
        risk: 'high'
      }
    case 'CHOPPY':
      return {
        description: 'High volatility with no clear trend direction',
        guidance: 'Dangerous conditions. Avoid directional bets. Wait for clarity.',
        risk: 'extreme'
      }
    case 'NEUTRAL':
    default:
      return {
        description: 'Mixed signals - no clear regime',
        guidance: 'Wait for clarity before making large moves.',
        risk: 'moderate'
      }
  }
}

/**
 * Calculate market regime based on VIX and SPY data
 */
export async function calculateMarketRegime(forceRefresh = false): Promise<MarketRegime | null> {
  // Check cache first
  const now = Date.now()
  if (!forceRefresh && cachedRegime && (now - cacheTimestamp) < CACHE_DURATION_MS) {
    console.log('[Market Regime] Returning cached regime')
    return cachedRegime
  }

  try {
    console.log('[Market Regime] Calculating market regime...')

    // Get configurable thresholds (with fallback to defaults)
    let thresholds: TradingThresholds
    try {
      thresholds = await getTradingThresholds()
    } catch {
      // Fallback if DB not initialized
      thresholds = DEFAULT_TRADING_THRESHOLDS
    }

    const VIX_LOW = thresholds.vixLow
    const VIX_HIGH = thresholds.vixHigh
    const SIDEWAYS_THRESHOLD = thresholds.sidewaysPercent / 100 // Convert percent to decimal

    // Fetch current VIX price
    // Note: Alpha Vantage uses ^VIX or VIX for volatility index
    const vixQuotes = await fetchLivePrices(['VIX'])
    const vixQuote = vixQuotes.find(q => q.symbol === 'VIX')

    // Fetch SPY data for MA calculation
    const spyQuotes = await fetchLivePrices(['SPY'])
    const spyQuote = spyQuotes.find(q => q.symbol === 'SPY')

    if (!spyQuote) {
      console.warn('[Market Regime] Could not fetch SPY data')
      return null
    }

    // Get VIX value (use mock if not available)
    const vixValue = vixQuote?.price ?? 18 // Default to neutral if unavailable

    // Fetch SPY historical for MA(50)
    const spyHistoryResult = await fetchHistoricalData('SPY', 'daily')
    const spyCandles = spyHistoryResult.candles
    const spyMA50 = calculateSMA(spyCandles, 50)

    // Determine regime
    let regime: MarketRegimeType = 'NEUTRAL'
    const spyAboveMA50 = spyMA50 ? spyQuote.price > spyMA50 : null

    // Check if sideways (within threshold of MA50 - no clear trend)
    const isSideways = spyMA50
      ? Math.abs(spyQuote.price - spyMA50) / spyMA50 < SIDEWAYS_THRESHOLD
      : false

    if (isSideways && vixValue > VIX_HIGH) {
      // High volatility + no clear direction = CHOPPY (dangerous)
      regime = 'CHOPPY'
    } else if (spyAboveMA50 !== null) {
      if (vixValue < VIX_LOW) {
        // Low volatility
        regime = spyAboveMA50 ? 'LOW_VOL_BULLISH' : 'LOW_VOL_BEARISH'
      } else if (vixValue > VIX_HIGH) {
        // High volatility
        regime = spyAboveMA50 ? 'HIGH_VOL_BULLISH' : 'HIGH_VOL_BEARISH'
      } else {
        // Elevated volatility (VIX between thresholds)
        regime = spyAboveMA50 ? 'ELEVATED_VOL_BULLISH' : 'ELEVATED_VOL_BEARISH'
      }
    }

    const { description, guidance, risk } = getRegimeDescription(regime)

    const result: MarketRegime = {
      regime,
      vix: vixValue,
      spyPrice: spyQuote.price,
      spyMA50,
      description,
      tradingGuidance: guidance,
      riskLevel: risk,
      timestamp: now
    }

    // Update cache
    cachedRegime = result
    cacheTimestamp = now

    console.log(`[Market Regime] Current regime: ${regime} (VIX: ${vixValue}, SPY: $${spyQuote.price}, MA50: $${spyMA50})`)
    return result

  } catch (error) {
    console.error('[Market Regime] Failed to calculate regime:', error)
    return null
  }
}

/**
 * Get regime for AI prompt context
 * Uses default thresholds for labeling (actual classification used user's settings)
 */
export function formatRegimeForPrompt(regime: MarketRegime): string {
  const { vixLow, vixHigh } = DEFAULT_TRADING_THRESHOLDS
  return `**MARKET REGIME:**
- Current Regime: ${regime.regime.replace(/_/g, ' ')}
- VIX Level: ${regime.vix.toFixed(2)} (${regime.vix < vixLow ? 'Low' : regime.vix > vixHigh ? 'High' : 'Elevated'} volatility)
- SPY vs MA(50): ${regime.spyMA50 ? (regime.spyPrice > regime.spyMA50 ? 'Above' : 'Below') : 'N/A'} ($${regime.spyPrice.toFixed(2)} vs $${regime.spyMA50?.toFixed(2) ?? 'N/A'})
- Risk Level: ${regime.riskLevel.toUpperCase()}
- Trading Guidance: ${regime.tradingGuidance}`
}

/**
 * Get short label for UI display
 */
export function getRegimeLabel(regime: MarketRegimeType): string {
  switch (regime) {
    case 'LOW_VOL_BULLISH': return 'Risk On'
    case 'LOW_VOL_BEARISH': return 'Quiet Decline'
    case 'ELEVATED_VOL_BULLISH': return 'Cautious Bull'
    case 'ELEVATED_VOL_BEARISH': return 'Caution'
    case 'HIGH_VOL_BULLISH': return 'Volatile Rally'
    case 'HIGH_VOL_BEARISH': return 'Fear Mode'
    case 'CHOPPY': return 'Choppy'
    default: return 'Mixed'
  }
}
