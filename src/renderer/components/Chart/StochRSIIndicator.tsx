/**
 * Stochastic RSI Indicator Component
 * Renders %K and %D lines with overbought/oversold zones
 */

import { useRef, useMemo } from 'react'
import { IChartApi, ISeriesApi, LineStyle } from 'lightweight-charts'
import { IndicatorPanel } from './IndicatorPanel'
import { useIndicatorStore, type IndicatorConfig } from '../../stores/indicatorStore'
import { useMarketStore } from '../../stores/marketStore'
import { calculateStochRSISeries, type CandleData } from '../../../services/technicalIndicators'

interface StochRSIIndicatorProps {
  config: IndicatorConfig
}

export function StochRSIIndicator({ config }: StochRSIIndicatorProps) {
  const toggleIndicator = useIndicatorStore(state => state.toggleIndicator)
  const chartData = useMarketStore(state => state.chartData)

  const kSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const dSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const chartInstanceRef = useRef<IChartApi | null>(null)

  // Calculate Stochastic RSI data
  const stochRsiData = useMemo(() => {
    if (!chartData || chartData.length === 0) return []

    const candles: CandleData[] = chartData.map(d => ({
      time: typeof d.time === 'number' ? d.time : new Date(d.time as string).getTime() / 1000,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume || 0
    }))

    return calculateStochRSISeries(
      candles,
      config.settings.rsiPeriod || 14,
      config.settings.stochPeriod || 14,
      config.settings.kSmooth || 3,
      config.settings.dSmooth || 3
    )
  }, [chartData, config.settings])

  const handleClose = () => {
    toggleIndicator('stochRsi')
  }

  return (
    <IndicatorPanel config={config} onClose={handleClose}>
      {(chart) => {
        // Setup series when chart is available
        if (chart && chart !== chartInstanceRef.current) {
          chartInstanceRef.current = chart

          // Set price scale to 0-100 range
          chart.priceScale('right').applyOptions({
            autoScale: false,
            scaleMargins: { top: 0.05, bottom: 0.05 }
          })

          // Create %K line (fast, blue)
          kSeriesRef.current = chart.addLineSeries({
            color: '#2962FF',
            lineWidth: 1,
            priceScaleId: 'right',
            priceFormat: {
              type: 'price',
              precision: 2,
              minMove: 0.01
            }
          })

          // Create %D line (slow, orange)
          dSeriesRef.current = chart.addLineSeries({
            color: '#FF6D00',
            lineWidth: 1,
            lineStyle: LineStyle.Solid,
            priceScaleId: 'right',
            priceFormat: {
              type: 'price',
              precision: 2,
              minMove: 0.01
            }
          })

          // Add overbought line (80)
          kSeriesRef.current.createPriceLine({
            price: 80,
            color: '#ff433d',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: 'OB'
          })

          // Add oversold line (20)
          kSeriesRef.current.createPriceLine({
            price: 20,
            color: '#4af6c3',
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            axisLabelVisible: true,
            title: 'OS'
          })

          // Add middle line (50)
          kSeriesRef.current.createPriceLine({
            price: 50,
            color: '#333333',
            lineWidth: 1,
            lineStyle: LineStyle.Dotted,
            axisLabelVisible: false
          })
        }

        // Update data when stochRsiData changes
        if (stochRsiData.length > 0 && chartInstanceRef.current) {
          // Set %K line data
          if (kSeriesRef.current) {
            kSeriesRef.current.setData(
              stochRsiData.map(d => ({
                time: d.time as any,
                value: d.k
              }))
            )
          }

          // Set %D line data
          if (dSeriesRef.current) {
            dSeriesRef.current.setData(
              stochRsiData.map(d => ({
                time: d.time as any,
                value: d.d
              }))
            )
          }

          // Fit content but maintain 0-100 scale
          chartInstanceRef.current.timeScale().fitContent()
        }

        return null
      }}
    </IndicatorPanel>
  )
}
