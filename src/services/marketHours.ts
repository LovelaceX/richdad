/**
 * Market Hours Service
 *
 * Provides market status detection for US stock exchanges.
 * Used by MarketStatusIndicator to display current market state.
 */

export type MarketState = 'open' | 'premarket' | 'afterhours' | 'closed'

export interface MarketStatus {
  state: MarketState
  currentTimeET: string
  label: string
}

/**
 * Get the current US stock market status
 *
 * Market Hours (Eastern Time):
 * - Pre-Market: 4:00 AM - 9:30 AM
 * - Regular: 9:30 AM - 4:00 PM
 * - After-Hours: 4:00 PM - 8:00 PM
 * - Closed: 8:00 PM - 4:00 AM, weekends, holidays
 */
export function getMarketStatus(): MarketStatus {
  const now = new Date()

  // Format time in ET
  const etTime = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(now)

  // Get ET date components
  const etDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const hours = etDate.getHours()
  const minutes = etDate.getMinutes()
  const day = etDate.getDay()
  const timeInMinutes = hours * 60 + minutes

  // Weekend check (0 = Sunday, 6 = Saturday)
  if (day === 0 || day === 6) {
    return {
      state: 'closed',
      currentTimeET: `${etTime} ET`,
      label: 'Market Closed'
    }
  }

  // Market hours in minutes from midnight
  const preMarketStart = 4 * 60      // 4:00 AM
  const marketOpen = 9 * 60 + 30     // 9:30 AM
  const marketClose = 16 * 60        // 4:00 PM
  const afterHoursEnd = 20 * 60      // 8:00 PM

  if (timeInMinutes >= marketOpen && timeInMinutes < marketClose) {
    return {
      state: 'open',
      currentTimeET: `${etTime} ET`,
      label: 'Market Open'
    }
  } else if (timeInMinutes >= preMarketStart && timeInMinutes < marketOpen) {
    return {
      state: 'premarket',
      currentTimeET: `${etTime} ET`,
      label: 'Pre-Market'
    }
  } else if (timeInMinutes >= marketClose && timeInMinutes < afterHoursEnd) {
    return {
      state: 'afterhours',
      currentTimeET: `${etTime} ET`,
      label: 'After-Hours'
    }
  } else {
    return {
      state: 'closed',
      currentTimeET: `${etTime} ET`,
      label: 'Market Closed'
    }
  }
}

/**
 * Check if we're within regular market hours
 */
export function isMarketOpen(): boolean {
  return getMarketStatus().state === 'open'
}

/**
 * Check if we're in any trading session (pre-market, regular, or after-hours)
 */
export function isTradingSession(): boolean {
  const state = getMarketStatus().state
  return state === 'open' || state === 'premarket' || state === 'afterhours'
}

/**
 * Get time until next market state change (in minutes)
 */
export function getTimeUntilNextChange(): { minutes: number; nextState: MarketState } | null {
  const now = new Date()
  const etDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const hours = etDate.getHours()
  const minutes = etDate.getMinutes()
  const day = etDate.getDay()
  const timeInMinutes = hours * 60 + minutes

  // Weekend - calculate until Monday 4 AM
  if (day === 0 || day === 6) {
    const daysUntilMonday = day === 0 ? 1 : 2
    const minutesUntilMonday = daysUntilMonday * 24 * 60 - timeInMinutes + 4 * 60
    return { minutes: minutesUntilMonday, nextState: 'premarket' }
  }

  const preMarketStart = 4 * 60
  const marketOpen = 9 * 60 + 30
  const marketClose = 16 * 60
  const afterHoursEnd = 20 * 60

  if (timeInMinutes < preMarketStart) {
    return { minutes: preMarketStart - timeInMinutes, nextState: 'premarket' }
  } else if (timeInMinutes < marketOpen) {
    return { minutes: marketOpen - timeInMinutes, nextState: 'open' }
  } else if (timeInMinutes < marketClose) {
    return { minutes: marketClose - timeInMinutes, nextState: 'afterhours' }
  } else if (timeInMinutes < afterHoursEnd) {
    return { minutes: afterHoursEnd - timeInMinutes, nextState: 'closed' }
  } else {
    // After 8 PM - calculate until tomorrow 4 AM
    const minutesUntilPremarket = (24 * 60 - timeInMinutes) + 4 * 60
    return { minutes: minutesUntilPremarket, nextState: 'premarket' }
  }
}
