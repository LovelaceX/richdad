import { useEffect, useRef } from 'react'
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts'
import { useMarketStore } from '../../stores/marketStore'

export function TradingChart() {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)

  const chartData = useMarketStore(state => state.chartData)
  const selectedTicker = useMarketStore(state => state.selectedTicker)

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#000000' },
        textColor: '#888888',
        fontFamily: 'JetBrains Mono',
        attributionLogo: false,  // Hide TradingView logo
      },
      grid: {
        vertLines: { color: '#1a1a1a' },
        horzLines: { color: '#1a1a1a' },
      },
      crosshair: {
        vertLine: {
          color: '#FFB000',
          width: 1,
          style: 2,
          labelBackgroundColor: '#FFB000',
        },
        horzLine: {
          color: '#FFB000',
          width: 1,
          style: 2,
          labelBackgroundColor: '#FFB000',
        },
      },
      rightPriceScale: {
        borderColor: '#333333',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: '#333333',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScale: {
        axisPressedMouseMove: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
    })

    chartRef.current = chart

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#4af6c3',
      downColor: '#ff433d',
      borderUpColor: '#4af6c3',
      borderDownColor: '#ff433d',
      wickUpColor: '#4af6c3',
      wickDownColor: '#ff433d',
    })

    seriesRef.current = candlestickSeries

    // Handle resize
    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        })
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(containerRef.current)

    return () => {
      window.removeEventListener('resize', handleResize)
      resizeObserver.disconnect()
      chart.remove()
    }
  }, [])

  // Update data when chartData changes
  useEffect(() => {
    if (seriesRef.current && chartData.length > 0) {
      const formattedData: CandlestickData<Time>[] = chartData.map(d => ({
        time: d.time as Time,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }))

      seriesRef.current.setData(formattedData)
      chartRef.current?.timeScale().fitContent()
    }
  }, [chartData, selectedTicker])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
    />
  )
}
