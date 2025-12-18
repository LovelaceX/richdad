/**
 * Trendline Primitive for Lightweight Charts
 * Draws a line between two price/time points
 */

import type {
  ISeriesPrimitive,
  ISeriesPrimitivePaneView,
  SeriesPrimitivePaneViewZOrder,
  ISeriesPrimitivePaneRenderer,
  Time,
  IChartApi,
  ISeriesApi,
  SeriesType
} from 'lightweight-charts'
import type { CanvasRenderingTarget2D } from 'fancy-canvas'

interface TrendlineOptions {
  startTime: number
  startPrice: number
  endTime: number
  endPrice: number
  color: string
  lineWidth?: number
  id: string
}

interface TrendlineRendererData {
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  lineWidth: number
}

class TrendlineRenderer implements ISeriesPrimitivePaneRenderer {
  private _data: TrendlineRendererData | null = null

  update(data: TrendlineRendererData | null) {
    this._data = data
  }

  draw(target: CanvasRenderingTarget2D) {
    const data = this._data
    if (!data) return

    target.useMediaCoordinateSpace(({ context: ctx }) => {
      const { x1, y1, x2, y2, color, lineWidth } = data

      ctx.save()
      ctx.beginPath()
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.setLineDash([])
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.stroke()

      // Draw small circles at endpoints
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(x1, y1, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x2, y2, 4, 0, Math.PI * 2)
      ctx.fill()

      ctx.restore()
    })
  }
}

class TrendlinePaneView implements ISeriesPrimitivePaneView {
  private _renderer: TrendlineRenderer = new TrendlineRenderer()

  update(data: TrendlineRendererData | null) {
    this._renderer.update(data)
  }

  zOrder(): SeriesPrimitivePaneViewZOrder {
    return 'top'
  }

  renderer(): ISeriesPrimitivePaneRenderer {
    return this._renderer
  }
}

export class TrendlinePrimitive implements ISeriesPrimitive<Time> {
  private _chart: IChartApi
  private _series: ISeriesApi<SeriesType>
  private _options: TrendlineOptions
  private _paneView: TrendlinePaneView
  private _requestUpdate?: () => void

  constructor(
    chart: IChartApi,
    series: ISeriesApi<SeriesType>,
    options: TrendlineOptions
  ) {
    this._chart = chart
    this._series = series
    this._options = options
    this._paneView = new TrendlinePaneView()
  }

  get id(): string {
    return this._options.id
  }

  updateAllViews() {
    const timeScale = this._chart.timeScale()

    const x1 = timeScale.timeToCoordinate(this._options.startTime as Time)
    const y1 = this._series.priceToCoordinate(this._options.startPrice)
    const x2 = timeScale.timeToCoordinate(this._options.endTime as Time)
    const y2 = this._series.priceToCoordinate(this._options.endPrice)

    if (x1 === null || y1 === null || x2 === null || y2 === null) {
      this._paneView.update(null)
      return
    }

    this._paneView.update({
      x1,
      y1,
      x2,
      y2,
      color: this._options.color,
      lineWidth: this._options.lineWidth || 2
    })
  }

  paneViews(): readonly ISeriesPrimitivePaneView[] {
    return [this._paneView]
  }

  attached({ requestUpdate }: { requestUpdate: () => void }) {
    this._requestUpdate = requestUpdate
    this.updateAllViews()
    // Request update when chart scrolls/zooms
    this._chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      this.updateAllViews()
      this._requestUpdate?.()
    })
  }

  detached() {
    this._requestUpdate = undefined
  }
}

/**
 * Creates and attaches a trendline primitive to the chart
 */
export function createTrendline(
  chart: IChartApi,
  series: ISeriesApi<SeriesType>,
  options: TrendlineOptions
): TrendlinePrimitive {
  const primitive = new TrendlinePrimitive(chart, series, options)
  series.attachPrimitive(primitive)
  return primitive
}
