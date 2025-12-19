import { useEffect } from 'react'
import { useMarketStore } from '../stores/marketStore'

export function useMarketData(refreshInterval = 5000) {
  const refreshAllQuotes = useMarketStore(state => state.refreshAllQuotes)

  useEffect(() => {
    // Initial refresh
    refreshAllQuotes()

    // Set up interval for real API updates
    const interval = setInterval(() => {
      refreshAllQuotes()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [refreshAllQuotes, refreshInterval])

  return {
    refreshAllQuotes,
  }
}
