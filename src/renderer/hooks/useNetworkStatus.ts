import { useState, useEffect } from 'react'
import { networkMonitor } from '../lib/utils'

/**
 * Hook to track network connectivity status
 * Returns true if online, false if offline
 * Uses the global networkMonitor for consistent status across the app
 */
export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState(networkMonitor.isOnline)

  useEffect(() => {
    // Subscribe to network status changes from the global monitor
    const unsubscribe = networkMonitor.subscribe(setIsOnline)
    return unsubscribe
  }, [])

  return isOnline
}
