import { useEffect, useRef, useCallback, useState } from 'react'
import { createChart, ColorType, IChartApi, ISeriesApi, CandlestickData, Time, SeriesMarker, IPriceLine } from 'lightweight-charts'
import { TrendingUp } from 'lucide-react'
import { useMarketStore } from '../../stores/marketStore'
import { usePatternStore } from '../../stores/patternStore'
import { useNewsStore } from '../../stores/newsStore'
import { useDrawingStore } from '../../stores/drawingStore'
import { detectPatterns } from '../../../services/candlestickPatterns'
import { PatternTooltipContainer } from './PatternTooltip'
import { NewsTooltip, matchNewsToCandles, NewsMarker } from './NewsTooltip'
import { TrendlinePrimitive } from './TrendlinePrimitive'
import { SetupPrompt } from '../common/SetupPrompt'
import type { NewsItem } from '../../types'

export function TradingChart() {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const priceLinesRef = useRef<IPriceLine[]>([])

  const chartData = useMarketStore(state => state.chartData)
  const selectedTicker = useMarketStore(state => state.selectedTicker)

  // Pattern store
  const { patterns, setPatterns, selectPattern, showPatterns, showNews } = usePatternStore()

  // News store
  const headlines = useNewsStore(state => state.headlines)

  // Drawing store
  const horizontalLines = useDrawingStore(state => state.horizontalLines)
  const trendlines = useDrawingStore(state => state.trendlines)
  const drawingMode = useDrawingStore(state => state.drawingMode)
  const addHorizontalLine = useDrawingStore(state => state.addHorizontalLine)
  const addTrendline = useDrawingStore(state => state.addTrendline)

  // Trendline drawing state
  const [trendlineStart, setTrendlineStart] = useState<{ time: number; price: number } | null>(null)
  const trendlinePrimitivesRef = useRef<TrendlinePrimitive[]>([])

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

  // Update horizontal price lines
  useEffect(() => {
    if (!seriesRef.current) return

    // Remove old price lines
    priceLinesRef.current.forEach(line => {
      try {
        seriesRef.current?.removePriceLine(line)
      } catch {
        // Line may have already been removed
      }
    })
    priceLinesRef.current = []

    // Create new price lines for current symbol
    const symbolLines = horizontalLines.filter(l => l.symbol === selectedTicker)
    symbolLines.forEach(line => {
      try {
        const priceLine = seriesRef.current!.createPriceLine({
          price: line.price,
          color: line.color,
          lineWidth: 2,
          lineStyle: 0, // Solid
          axisLabelVisible: true,
          title: line.label || `$${line.price.toFixed(2)}`
        })
        priceLinesRef.current.push(priceLine)
      } catch (err) {
        console.warn('[Chart] Failed to create price line:', err)
      }
    })
  }, [horizontalLines, selectedTicker])

  // Update trendlines
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return

    // Remove old trendline primitives
    trendlinePrimitivesRef.current.forEach(primitive => {
      try {
        seriesRef.current?.detachPrimitive(primitive)
      } catch {
        // Primitive may have already been removed
      }
    })
    trendlinePrimitivesRef.current = []

    // Create new trendlines for current symbol
    const symbolTrendlines = trendlines.filter(l => l.symbol === selectedTicker)
    symbolTrendlines.forEach(line => {
      try {
        const primitive = new TrendlinePrimitive(
          chartRef.current!,
          seriesRef.current!,
          {
            startTime: line.startTime,
            startPrice: line.startPrice,
            endTime: line.endTime,
            endPrice: line.endPrice,
            color: line.color,
            id: line.id
          }
        )
        seriesRef.current!.attachPrimitive(primitive)
        trendlinePrimitivesRef.current.push(primitive)
      } catch (err) {
        console.warn('[Chart] Failed to create trendline:', err)
      }
    })
  }, [trendlines, selectedTicker])

  // Reset trendline start point when drawing mode changes
  useEffect(() => {
    if (drawingMode !== 'trendline') {
      setTrendlineStart(null)
    }
  }, [drawingMode])

  // Handle double-click for drawing horizontal lines
  const handleDblClick = useCallback((event: MouseEvent) => {
    if (drawingMode !== 'horizontal' || !seriesRef.current || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const y = event.clientY - rect.top

    // Convert Y coordinate to price
    const price = seriesRef.current.coordinateToPrice(y)
    if (price !== null && price !== undefined) {
      addHorizontalLine(selectedTicker, price as number)
      console.log(`[Chart] Added horizontal line at $${(price as number).toFixed(2)} for ${selectedTicker}`)
    }
  }, [drawingMode, selectedTicker, addHorizontalLine])

  // Add double-click listener for drawing
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('dblclick', handleDblClick)

    return () => {
      container.removeEventListener('dblclick', handleDblClick)
    }
  }, [handleDblClick])

  // Handle marker clicks and trendline drawing
  const handleChartClick = useCallback((event: MouseEvent) => {
    if (!chartRef.current || !containerRef.current || !seriesRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // Get logical point from chart coordinates
    const timeScale = chartRef.current.timeScale()
    const time = timeScale.coordinateToTime(x)
    const price = seriesRef.current.coordinateToPrice(y)

    // Handle trendline drawing (two-click)
    if (drawingMode === 'trendline' && time !== null && price !== null) {
      if (!trendlineStart) {
        // First click - set start point
        setTrendlineStart({ time: time as number, price: price as number })
        console.log(`[Chart] Trendline start: time=${time}, price=$${(price as number).toFixed(2)}`)
      } else {
        // Second click - complete trendline
        addTrendline({
          startTime: trendlineStart.time,
          startPrice: trendlineStart.price,
          endTime: time as number,
          endPrice: price as number,
          color: '#FFB000',
          symbol: selectedTicker
        })
        setTrendlineStart(null)
        console.log(`[Chart] Trendline complete for ${selectedTicker}`)
      }
      return
    }

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
  }, [patterns, showPatterns, showNews, selectPattern, drawingMode, trendlineStart, selectedTicker, addTrendline])

  // Add click listener to chart
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('click', handleChartClick)

    return () => {
      container.removeEventListener('click', handleChartClick)
    }
  }, [handleChartClick])

  // Show empty state when no chart data
  if (chartData.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <SetupPrompt
          icon={<TrendingUp className="w-6 h-6 text-gray-500" />}
          title="No chart data available"
          description="Connect a data source API key to load market data"
          helpSection="api-limits"
          settingsPath="Data Sources"
        />
      </div>
    )
  }

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
