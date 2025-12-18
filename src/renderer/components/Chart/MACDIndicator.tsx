/**
 * MACD Indicator Component
 * Renders MACD line, signal line, and histogram on an indicator panel
 */

import { useRef, useMemo } from 'react'
import { IChartApi, ISeriesApi, LineStyle } from 'lightweight-charts'
import { IndicatorPanel } from './IndicatorPanel'
import { useIndicatorStore, type IndicatorConfig } from '../../stores/indicatorStore'
import { useMarketStore } from '../../stores/marketStore'
import { calculateMACDSeries, type CandleData } from '../../../services/technicalIndicators'

interface MACDIndicatorProps {
  config: IndicatorConfig
}

export function MACDIndicator({ config }: MACDIndicatorProps) {
  const toggleIndicator = useIndicatorStore(state => state.toggleIndicator)
  const chartData = useMarketStore(state => state.chartData)

  const macdSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const signalSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const histogramSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const chartInstanceRef = useRef<IChartApi | null>(null)

  // Calculate MACD data
  const macdData = useMemo(() => {
    if (!chartData || chartData.length === 0) return []

    const candles: CandleData[] = chartData.map(d => ({
      time: typeof d.time === 'number' ? d.time : new Date(d.time as string).getTime() / 1000,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume || 0
    }))

    return calculateMACDSeries(
      candles,
      config.settings.fastPeriod || 12,
      config.settings.slowPeriod || 26,
      config.settings.signalPeriod || 9
    )
  }, [chartData, config.settings])

  const handleClose = () => {
    toggleIndicator('macd')
  }

  return (
    <IndicatorPanel config={config} onClose={handleClose}>
      {(chart) => {
        // Setup series when chart is available
        if (chart && chart !== chartInstanceRef.current) {
          chartInstanceRef.current = chart

          // Create histogram series (must be added first for proper layering)
          histogramSeriesRef.current = chart.addHistogramSeries({
            priceScaleId: 'right',
            color: '#4af6c3',
            priceFormat: {
              type: 'price',
              precision: 4,
              minMove: 0.0001
            }
          })

          // Create MACD line series
          macdSeriesRef.current = chart.addLineSeries({
            color: '#2962FF',
            lineWidth: 1,
            priceScaleId: 'right',
            priceFormat: {
              type: 'price',
              precision: 4,
              minMove: 0.0001
            }
          })

          // Create Signal line series
          signalSeriesRef.current = chart.addLineSeries({
            color: '#FF6D00',
            lineWidth: 1,
            lineStyle: LineStyle.Solid,
            priceScaleId: 'right',
            priceFormat: {
              type: 'price',
              precision: 4,
              minMove: 0.0001
            }
          })

          // Add zero line
          macdSeriesRef.current.createPriceLine({
            price: 0,
            color: '#333333',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: false
          })
        }

        // Update data when macdData changes
        if (macdData.length > 0 && chartInstanceRef.current) {
          // Set MACD line data
          if (macdSeriesRef.current) {
            macdSeriesRef.current.setData(
              macdData.map(d => ({
                time: d.time as any,
                value: d.macd
              }))
            )
          }

          // Set Signal line data
          if (signalSeriesRef.current) {
            signalSeriesRef.current.setData(
              macdData.map(d => ({
                time: d.time as any,
                value: d.signal
              }))
            )
          }

          // Set Histogram data with color based on value
          if (histogramSeriesRef.current) {
            histogramSeriesRef.current.setData(
              macdData.map(d => ({
                time: d.time as any,
                value: d.histogram,
                color: d.histogram >= 0 ? '#4af6c3' : '#ff433d'
              }))
            )
          }

          // Fit content
          chartInstanceRef.current.timeScale().fitContent()
        }

        return null
      }}
    </IndicatorPanel>
  )
}
