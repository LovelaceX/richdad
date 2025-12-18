/**
 * Indicator Panel
 * Generic container for technical indicator charts
 * Creates its own Lightweight Charts instance and syncs with main chart
 */

import { useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { createChart, IChartApi, ColorType, LogicalRange } from 'lightweight-charts'
import { useChartSync } from './ChartSyncContext'
import type { IndicatorConfig } from '../../stores/indicatorStore'

interface IndicatorPanelProps {
  config: IndicatorConfig
  onClose: () => void
  children: (chart: IChartApi | null, containerRef: React.RefObject<HTMLDivElement>) => React.ReactNode
}

const INDICATOR_LABELS: Record<string, string> = {
  macd: 'MACD (12, 26, 9)',
  stochRsi: 'Stoch RSI (14, 14, 3, 3)'
}

export function IndicatorPanel({ config, onClose, children }: IndicatorPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const { registerChart, unregisterChart, mainChartRef, crosshairTime } = useChartSync()

  // Create chart on mount
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#000000' },
        textColor: '#666666',
        fontFamily: 'JetBrains Mono, monospace',
        attributionLogo: false
      },
      grid: {
        vertLines: { color: '#1a1a1a' },
        horzLines: { color: '#1a1a1a' }
      },
      rightPriceScale: {
        borderColor: '#333333',
        scaleMargins: { top: 0.1, bottom: 0.1 },
        autoScale: true
      },
      timeScale: {
        visible: false,  // Hide time axis - main chart shows it
        borderColor: '#333333'
      },
      crosshair: {
        vertLine: {
          color: '#FFB000',
          width: 1,
          style: 3,
          labelVisible: false
        },
        horzLine: {
          color: '#FFB000',
          width: 1,
          style: 3,
          labelBackgroundColor: '#FFB000'
        }
      },
      handleScale: false,  // Disable - controlled by main chart
      handleScroll: false  // Disable - controlled by main chart
    })

    chartRef.current = chart
    registerChart(config.id, chart)

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        })
      }
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      unregisterChart(config.id)
      chart.remove()
      chartRef.current = null
    }
  }, [config.id, registerChart, unregisterChart])

  // Sync time scale with main chart
  useEffect(() => {
    if (!chartRef.current || !mainChartRef) return

    const handleRangeChange = (range: LogicalRange | null) => {
      if (range && chartRef.current) {
        try {
          chartRef.current.timeScale().setVisibleLogicalRange(range)
        } catch {
          // Chart may not be ready
        }
      }
    }

    // Subscribe to main chart time scale changes
    mainChartRef.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange)

    // Initial sync
    const currentRange = mainChartRef.timeScale().getVisibleLogicalRange()
    if (currentRange) {
      handleRangeChange(currentRange)
    }

    return () => {
      mainChartRef.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange)
    }
  }, [mainChartRef])

  // Sync crosshair position
  useEffect(() => {
    if (!chartRef.current || crosshairTime === null) return

    // The crosshair sync is handled by the series in child components
    // They can use crosshairTime to highlight the appropriate data point
  }, [crosshairTime])

  return (
    <div
      className="border-t border-terminal-border bg-terminal-bg relative"
      style={{ height: config.height }}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-2 py-1 bg-terminal-bg/80 backdrop-blur-sm border-b border-terminal-border/50">
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">
          {INDICATOR_LABELS[config.type] || config.type}
        </span>
        <button
          onClick={onClose}
          className="p-0.5 text-gray-500 hover:text-white hover:bg-terminal-border/50 rounded transition-colors"
          title="Close indicator"
        >
          <X size={12} />
        </button>
      </div>

      {/* Chart Container */}
      <div ref={containerRef} className="w-full h-full pt-6" />

      {/* Render children with chart instance */}
      {children(chartRef.current, containerRef)}
    </div>
  )
}
