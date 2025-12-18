import { useEffect } from 'react'
import { dataHeartbeat } from '../../services/DataHeartbeatService'
import { useMarketStore } from '../stores/marketStore'
import { useNewsStore } from '../stores/newsStore'
import { useAIStore } from '../stores/aiStore'
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
  const setRecommendation = useAIStore(state => state.setRecommendation)

  // AI analysis progress actions
  const startAnalysis = useAIStore(state => state.startAnalysis)
  const updatePhase = useAIStore(state => state.updatePhase)
  const clearAnalysisProgress = useAIStore(state => state.clearAnalysisProgress)

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

  // Listen for AI settings changes and update interval
  useEffect(() => {
    const handleAISettingsChange = () => {
      console.log('[useDataHeartbeat] AI settings changed, updating interval')
      dataHeartbeat.updateAIInterval().catch(console.error)
    }

    window.addEventListener('ai-settings-updated', handleAISettingsChange)
    return () => window.removeEventListener('ai-settings-updated', handleAISettingsChange)
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

      case 'ai_recommendation':
        // New AI-generated recommendation
        console.log('[useDataHeartbeat] Received AI recommendation:', payload)
        setRecommendation(payload)
        break

      case 'ai_analysis_start':
        // AI analysis starting - show progress animation
        console.log('[useDataHeartbeat] AI analysis starting:', payload.ticker)
        startAnalysis(payload.ticker)
        break

      case 'ai_phase_update':
        // Update specific phase in progress animation
        updatePhase(payload.phaseId, payload.status, payload.result)
        break

      case 'ai_analysis_end':
        // AI analysis complete - clear progress after short delay
        console.log('[useDataHeartbeat] AI analysis complete:', payload)
        // Keep the progress visible briefly so user sees the final state
        setTimeout(() => {
          clearAnalysisProgress()
        }, 1500)
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

  const refreshAI = (symbol: string = 'SPY') => {
    return dataHeartbeat.updateAIAnalysis(symbol)
  }

  return {
    refreshMarket,
    refreshNews,
    refreshSentiment,
    refreshAI
  }
}
