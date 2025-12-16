import { useEffect } from 'react'
import { dataHeartbeat } from '../../services/DataHeartbeatService'
import { useMarketStore } from '../stores/marketStore'
import { useNewsStore } from '../stores/newsStore'
import type { DataUpdateCallback } from '../../services/DataHeartbeatService'

/**
 * Hook to initialize and manage the data heartbeat service
 * This should be used once at the app root level
 */
export function useDataHeartbeat() {
  const setQuotes = useMarketStore(state => state.setQuotes)
  const setCacheStatus = useMarketStore(state => state.setCacheStatus)
  const setNews = useNewsStore(state => state.setNews)
  const setLoading = useNewsStore(state => state.setLoading)

  useEffect(() => {
    console.log('[useDataHeartbeat] Initializing heartbeat service')

    // Subscribe to data updates
    const unsubscribe = dataHeartbeat.subscribe(handleDataUpdate)

    // Start the heartbeat service
    dataHeartbeat.start().catch(error => {
      console.error('[useDataHeartbeat] Failed to start heartbeat:', error)
    })

    // Cleanup on unmount
    return () => {
      console.log('[useDataHeartbeat] Cleaning up heartbeat service')
      unsubscribe()
      dataHeartbeat.stop()
    }
  }, [])

  const handleDataUpdate: DataUpdateCallback = ({ type, payload }) => {
    switch (type) {
      case 'market':
        if (payload.quotes) {
          setQuotes(payload.quotes)
        }
        if (payload.cacheStatus) {
          setCacheStatus(payload.cacheStatus)
        }
        break

      case 'news':
        setNews(payload)
        setLoading(false)
        break

      case 'sentiment':
        // News with updated sentiment
        setNews(payload)
        break

      case 'llm_status':
        console.log('[LLM Status]', payload)
        // Could update a global store if needed
        break
    }
  }
}

/**
 * Hook to manually trigger data updates
 */
export function useDataRefresh() {
  const refreshMarket = (symbols: string[]) => {
    return dataHeartbeat.updateMarketData(symbols)
  }

  const refreshNews = () => {
    return dataHeartbeat.updateNews()
  }

  const refreshSentiment = () => {
    return dataHeartbeat.updateSentiment()
  }

  return {
    refreshMarket,
    refreshNews,
    refreshSentiment
  }
}
