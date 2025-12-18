import { useState, useEffect } from 'react'

/**
 * Hook to track network connectivity status
 * Returns true if online, false if offline
 */
export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => {
      console.log('[Network] Connection restored')
      setIsOnline(true)
    }

    const handleOffline = () => {
      console.log('[Network] Connection lost')
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
