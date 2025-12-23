/**
 * useApiUsage Hook
 *
 * Provides real-time API usage data for the dashboard.
 * Updates every second for accurate countdown display.
 */

import { useState, useEffect } from 'react'
import { getApiUsageSnapshot, type ApiUsageSnapshot } from '../../services/apiBudgetTracker'

/**
 * Hook to get real-time API usage data
 * Updates every second for accurate reset countdowns
 */
export function useApiUsage() {
  const [usage, setUsage] = useState<ApiUsageSnapshot>(getApiUsageSnapshot())

  useEffect(() => {
    // Update immediately
    setUsage(getApiUsageSnapshot())

    // Update every second for accurate countdown
    const interval = setInterval(() => {
      setUsage(getApiUsageSnapshot())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return usage
}

/**
 * Format seconds into human-readable time string
 */
export function formatResetTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  } else {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${mins}m`
  }
}
