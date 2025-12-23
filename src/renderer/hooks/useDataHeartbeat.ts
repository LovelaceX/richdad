import { useEffect, useRef, useState } from 'react'
import { dataHeartbeat } from '../../services/DataHeartbeatService'
import { websocketService } from '../../services/websocketService'
import { useMarketStore } from '../stores/marketStore'
import { useNewsStore } from '../stores/newsStore'
import { useAIStore } from '../stores/aiStore'
import { useIntelStore } from '../stores/intelStore'
import { useAIModalStore } from '../stores/aiModalStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useServiceHealthStore, type WebSocketStatus } from '../stores/serviceHealthStore'
import { playSound } from '../lib/sounds'
import type { DataUpdateCallback } from '../../services/DataHeartbeatService'
import type { NewsIntelReport, PatternScanReport } from '../../services/agents/types'

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

  // Intel store actions
  const setNewsIntel = useIntelStore(state => state.setNewsIntel)
  const setPatternScan = useIntelStore(state => state.setPatternScan)

  // AI modal notification
  const incrementAIUnread = useAIModalStore(state => state.incrementUnread)

  // Track previous alert count to detect new alerts
  const prevAlertCountRef = useRef(0)

  // Track heartbeat service errors
  const [heartbeatError, setHeartbeatError] = useState<Error | null>(null)

  // Get live data state from settings store
  const isLiveDataEnabled = useSettingsStore(state => state.isLiveDataEnabled)

  // WebSocket status updates
  const updateWebSocketStatus = useServiceHealthStore(state => state.updateWebSocketStatus)

  // Subscribe to data updates (always active)
  useEffect(() => {
    const unsubscribe = dataHeartbeat.subscribe(handleDataUpdate)
    return () => unsubscribe()
  }, [])

  // Start/stop heartbeat based on isLiveDataEnabled
  useEffect(() => {
    if (isLiveDataEnabled) {
      console.log('[useDataHeartbeat] Live data enabled, starting heartbeat...')
      dataHeartbeat.start().catch(error => {
        console.error('[useDataHeartbeat] Failed to start heartbeat:', error)
        setHeartbeatError(error instanceof Error ? error : new Error(String(error)))
      })
    } else {
      console.log('[useDataHeartbeat] Live data disabled, stopping heartbeat...')
      dataHeartbeat.stop()
    }

    // Cleanup on unmount
    return () => {
      dataHeartbeat.stop()
    }
  }, [isLiveDataEnabled])

  // Listen for AI settings changes and update interval
  useEffect(() => {
    const handleAISettingsChange = () => {
      console.log('[useDataHeartbeat] AI settings changed, updating interval')
      dataHeartbeat.updateAIInterval().catch(console.error)
    }

    window.addEventListener('ai-settings-updated', handleAISettingsChange)
    return () => window.removeEventListener('ai-settings-updated', handleAISettingsChange)
  }, [])

  // Listen for API settings changes (when user adds/changes API keys)
  useEffect(() => {
    const handleApiSettingsChange = () => {
      console.log('[useDataHeartbeat] API settings changed, triggering immediate data refresh')
      dataHeartbeat.refreshOnApiKeyChange().catch(console.error)
    }

    window.addEventListener('api-settings-updated', handleApiSettingsChange)
    return () => window.removeEventListener('api-settings-updated', handleApiSettingsChange)
  }, [])

  // Subscribe to WebSocket status changes
  useEffect(() => {
    const unsubscribe = websocketService.onStatusChange((status, message) => {
      // Map websocket states to service health states
      const healthStatus: WebSocketStatus =
        status === 'connected' ? 'connected' :
        status === 'connecting' || status === 'authenticating' ? 'connecting' :
        status === 'reconnecting' ? 'reconnecting' :
        status === 'disconnected' ? 'disconnected' : 'failed'

      updateWebSocketStatus(healthStatus, message, websocketService.getReconnectAttempts())
    })

    return unsubscribe
  }, [updateWebSocketStatus])

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
        incrementAIUnread()  // Show notification badge on AI Copilot button
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

      case 'news_intel': {
        // News intelligence report generated
        const report = payload as NewsIntelReport
        console.log('[useDataHeartbeat] News intel report received:', report)

        // Check for new breaking alerts and play sound
        const newAlertCount = report.breakingAlerts.length
        if (newAlertCount > prevAlertCountRef.current && newAlertCount > 0) {
          console.log(`[useDataHeartbeat] New breaking alerts detected: ${newAlertCount - prevAlertCountRef.current}`)
          playSound('breakingNews').catch(console.error)
        }
        prevAlertCountRef.current = newAlertCount

        setNewsIntel(report)
        break
      }

      case 'pattern_scan': {
        // Pattern scan report generated
        const report = payload as PatternScanReport
        setPatternScan(report)
        break
      }
    }
  }

  // Return error state so consumers can display warning if heartbeat failed
  return { heartbeatError }
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
