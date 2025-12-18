/**
 * Chart Sync Context
 * Provides synchronization between the main chart and indicator panels
 * - Time scale sync (zoom/pan)
 * - Crosshair sync (hover position)
 */

import { createContext, useContext, useCallback, useRef, useState, ReactNode } from 'react'
import type { IChartApi, LogicalRange, Time, MouseEventParams } from 'lightweight-charts'

interface ChartSyncContextType {
  // Register/unregister charts
  registerChart: (id: string, chart: IChartApi) => void
  unregisterChart: (id: string) => void

  // Main chart reference (source of truth for sync)
  mainChartRef: IChartApi | null
  setMainChart: (chart: IChartApi | null) => void

  // Sync handlers
  syncTimeScale: (range: LogicalRange | null, sourceId: string) => void
  syncCrosshair: (time: Time | null, sourceId: string) => void

  // Current crosshair time for all charts to react to
  crosshairTime: Time | null
}

const ChartSyncContext = createContext<ChartSyncContextType | null>(null)

export function ChartSyncProvider({ children }: { children: ReactNode }) {
  const chartsRef = useRef<Map<string, IChartApi>>(new Map())
  const [mainChartRef, setMainChartRefState] = useState<IChartApi | null>(null)
  const [crosshairTime, setCrosshairTime] = useState<Time | null>(null)
  const isSyncing = useRef(false)

  const registerChart = useCallback((id: string, chart: IChartApi) => {
    chartsRef.current.set(id, chart)
  }, [])

  const unregisterChart = useCallback((id: string) => {
    chartsRef.current.delete(id)
  }, [])

  const setMainChart = useCallback((chart: IChartApi | null) => {
    setMainChartRefState(chart)
  }, [])

  const syncTimeScale = useCallback((range: LogicalRange | null, sourceId: string) => {
    if (!range || isSyncing.current) return

    isSyncing.current = true

    try {
      chartsRef.current.forEach((chart, id) => {
        if (id !== sourceId) {
          try {
            chart.timeScale().setVisibleLogicalRange(range)
          } catch {
            // Chart may not be ready
          }
        }
      })
    } finally {
      // Use setTimeout to prevent immediate re-trigger
      setTimeout(() => {
        isSyncing.current = false
      }, 10)
    }
  }, [])

  const syncCrosshair = useCallback((time: Time | null, sourceId: string) => {
    setCrosshairTime(time)

    // Clear crosshair on other charts when time is null
    if (time === null) {
      chartsRef.current.forEach((chart, id) => {
        if (id !== sourceId) {
          try {
            chart.clearCrosshairPosition()
          } catch {
            // Chart may not be ready
          }
        }
      })
    }
  }, [])

  return (
    <ChartSyncContext.Provider
      value={{
        registerChart,
        unregisterChart,
        mainChartRef,
        setMainChart,
        syncTimeScale,
        syncCrosshair,
        crosshairTime
      }}
    >
      {children}
    </ChartSyncContext.Provider>
  )
}

export function useChartSync() {
  const context = useContext(ChartSyncContext)
  if (!context) {
    throw new Error('useChartSync must be used within a ChartSyncProvider')
  }
  return context
}

/**
 * Hook for indicator charts to subscribe to sync events
 */
export function useIndicatorChartSync(chartId: string, chart: IChartApi | null) {
  const { registerChart, unregisterChart, mainChartRef, crosshairTime } = useChartSync()

  // Register chart on mount
  if (chart) {
    registerChart(chartId, chart)
  }

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    unregisterChart(chartId)
  }, [chartId, unregisterChart])

  return {
    mainChartRef,
    crosshairTime,
    cleanup
  }
}

/**
 * Hook for main chart to broadcast sync events
 */
export function useMainChartSync(chart: IChartApi | null) {
  const { setMainChart, syncTimeScale, syncCrosshair, registerChart, unregisterChart } = useChartSync()
  const mainChartId = 'main'

  const setupSync = useCallback(() => {
    if (!chart) return () => {}

    setMainChart(chart)
    registerChart(mainChartId, chart)

    // Subscribe to time scale changes
    const handleTimeScaleChange = (range: LogicalRange | null) => {
      syncTimeScale(range, mainChartId)
    }

    // Subscribe to crosshair moves
    const handleCrosshairMove = (param: MouseEventParams) => {
      syncCrosshair(param.time || null, mainChartId)
    }

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleTimeScaleChange)
    chart.subscribeCrosshairMove(handleCrosshairMove)

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleTimeScaleChange)
      chart.unsubscribeCrosshairMove(handleCrosshairMove)
      unregisterChart(mainChartId)
      setMainChart(null)
    }
  }, [chart, setMainChart, registerChart, unregisterChart, syncTimeScale, syncCrosshair])

  return { setupSync }
}
