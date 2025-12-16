import { useEffect, useCallback } from 'react'
import { useMarketStore } from '../stores/marketStore'
import { generateQuote } from '../lib/mockData'

export function useMarketData(refreshInterval = 5000) {
  const refreshAllQuotes = useMarketStore(state => state.refreshAllQuotes)
  const updateQuote = useMarketStore(state => state.updateQuote)
  const watchlist = useMarketStore(state => state.watchlist)

  // Simulate real-time price updates
  const simulateUpdate = useCallback(() => {
    // Pick random ticker to update
    const randomTicker = watchlist[Math.floor(Math.random() * watchlist.length)]
    if (randomTicker) {
      const newQuote = generateQuote(randomTicker.symbol)
      updateQuote(randomTicker.symbol, newQuote)
    }
  }, [watchlist, updateQuote])

  useEffect(() => {
    // Initial refresh
    refreshAllQuotes()

    // Set up interval for simulated updates
    const interval = setInterval(() => {
      simulateUpdate()
    }, refreshInterval / 5) // More frequent individual updates

    return () => clearInterval(interval)
  }, [refreshAllQuotes, simulateUpdate, refreshInterval])

  return {
    refreshAllQuotes,
    simulateUpdate,
  }
}
