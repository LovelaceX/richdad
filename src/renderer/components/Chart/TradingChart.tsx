import { useEffect, useRef, useCallback, useState } from 'react'
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, Time, SeriesMarker } from 'lightweight-charts'
import { useMarketStore } from '../../stores/marketStore'
import { usePatternStore } from '../../stores/patternStore'
import { useNewsStore } from '../../stores/newsStore'
import { detectPatterns } from '../../../services/candlestickPatterns'
import { PatternTooltipContainer } from './PatternTooltip'
import { NewsTooltip, matchNewsToCandles, NewsMarker } from './NewsTooltip'
import type { NewsItem } from '../../types'

export function TradingChart() {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)

  const chartData = useMarketStore(state => state.chartData)
  const selectedTicker = useMarketStore(state => state.selectedTicker)

  // Pattern store
  const { patterns, setPatterns, selectPattern, showPatterns, showNews } = usePatternStore()

  // News store
  const headlines = useNewsStore(state => state.headlines)

  // Local state for news tooltip
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null)
  const [newsTooltipPosition, setNewsTooltipPosition] = useState<{ x: number; y: number } | null>(null)

  // Track news markers matched to candles
  const newsMarkersRef = useRef<NewsMarker[]>([])

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

      // Detect patterns on new data
      const detectedPatterns = detectPatterns(chartData)
      setPatterns(detectedPatterns)

      // Match news to candles
      newsMarkersRef.current = matchNewsToCandles(headlines, chartData, 60) // 60 min tolerance
    }
  }, [chartData, selectedTicker, headlines, setPatterns])

  // Update markers when patterns, news, or visibility toggles change
  useEffect(() => {
    if (!seriesRef.current) return

    const markers: SeriesMarker<Time>[] = []

    // Add pattern markers if enabled
    if (showPatterns) {
      patterns.forEach(p => {
        markers.push({
          time: p.time as Time,
          position: p.type === 'bullish' ? 'belowBar' : 'aboveBar',
          shape: 'square',
          color: p.type === 'bullish' ? '#4af6c3' : p.type === 'bearish' ? '#ff433d' : '#888888',
          text: 'P',
          id: `pattern-${p.time}-${p.pattern.replace(/\s+/g, '-')}`,
        })
      })
    }

    // Add news markers if enabled
    if (showNews) {
      newsMarkersRef.current.forEach(nm => {
        markers.push({
          time: nm.candleTime as Time,
          position: 'inBar',
          shape: 'circle',
          color: '#FFB000',
          text: 'N',
          id: `news-${nm.candleTime}-${nm.news.id}`,
        })
      })
    }

    // Sort markers by time to avoid rendering issues
    markers.sort((a, b) => (a.time as number) - (b.time as number))

    seriesRef.current.setMarkers(markers)
  }, [patterns, showPatterns, showNews])

  // Handle marker clicks
  const handleChartClick = useCallback((event: MouseEvent) => {
    if (!chartRef.current || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left

    // Get logical point from chart coordinates
    const timeScale = chartRef.current.timeScale()
    const time = timeScale.coordinateToTime(x)

    if (time === null) return

    const clickTime = time as number
    const tolerance = 60 // seconds tolerance for click detection

    // Check if clicked near a pattern marker
    if (showPatterns) {
      const clickedPattern = patterns.find(p =>
        Math.abs(p.time - clickTime) < tolerance
      )

      if (clickedPattern) {
        selectPattern(clickedPattern, { x: event.clientX, y: event.clientY })
        return
      }
    }

    // Check if clicked near a news marker
    if (showNews) {
      const clickedNews = newsMarkersRef.current.find(nm =>
        Math.abs(nm.candleTime - clickTime) < tolerance
      )

      if (clickedNews) {
        setSelectedNews(clickedNews.news)
        setNewsTooltipPosition({ x: event.clientX, y: event.clientY })
        return
      }
    }
  }, [patterns, showPatterns, showNews, selectPattern])

  // Add click listener to chart
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('click', handleChartClick)

    return () => {
      container.removeEventListener('click', handleChartClick)
    }
  }, [handleChartClick])

  return (
    <>
      <div
        ref={containerRef}
        className="w-full h-full"
      />

      {/* Pattern tooltip portal */}
      <PatternTooltipContainer />

      {/* News tooltip */}
      {selectedNews && newsTooltipPosition && (
        <NewsTooltip
          news={selectedNews}
          position={newsTooltipPosition}
          onClose={() => {
            setSelectedNews(null)
            setNewsTooltipPosition(null)
          }}
        />
      )}
    </>
  )
}
