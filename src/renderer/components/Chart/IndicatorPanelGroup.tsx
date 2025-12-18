/**
 * Indicator Panel Group
 * Renders and manages multiple indicator panels
 */

import { useIndicatorStore } from '../../stores/indicatorStore'
import { MACDIndicator } from './MACDIndicator'
import { StochRSIIndicator } from './StochRSIIndicator'

export function IndicatorPanelGroup() {
  const indicators = useIndicatorStore(state => state.indicators)
  const visibleIndicators = indicators.filter(i => i.visible)

  if (visibleIndicators.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col">
      {visibleIndicators.map(config => {
        switch (config.type) {
          case 'macd':
            return <MACDIndicator key={config.id} config={config} />
          case 'stochRsi':
            return <StochRSIIndicator key={config.id} config={config} />
          default:
            return null
        }
      })}
    </div>
  )
}
