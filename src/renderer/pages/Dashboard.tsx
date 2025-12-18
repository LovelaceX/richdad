import { Panel, PanelGroup } from 'react-resizable-panels'
import { MarketWatch } from '../components/MarketWatch'
import { ChartPanel } from '../components/Chart'
import { AIPanel } from '../components/AIPanel'
import { NewsTicker } from '../components/NewsTicker'
import { EconomicCalendarTicker } from '../components/EconomicCalendarTicker'
import { MarketOverview } from '../components/MarketOverview'
import { useSettingsStore } from '../stores/settingsStore'

export function Dashboard() {
  const { panelSizes, panelVisibility } = useSettingsStore()
  const { leftPanelVisible, rightPanelVisible, chartVisible, newsTickerVisible, economicCalendarTickerVisible } = panelVisibility

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Market Overview Bar */}
      <MarketOverview />

      {/* Main Content - Resizable Panels */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="vertical">
          {/* Top: 3-column layout */}
          <Panel defaultSize={95} minSize={50} maxSize={97}>
            <PanelGroup direction="horizontal">
              {/* Left: Market Watch */}
              {leftPanelVisible && (
                <Panel defaultSize={panelSizes.leftPanel} minSize={15} maxSize={30}>
                  <MarketWatch />
                </Panel>
              )}

              {/* Center: Chart */}
              {chartVisible && (
                <Panel defaultSize={leftPanelVisible && rightPanelVisible ? 55 : leftPanelVisible || rightPanelVisible ? 75 : 100} minSize={30}>
                  <ChartPanel />
                </Panel>
              )}

              {/* Right: AI Copilot */}
              {rightPanelVisible && (
                <Panel defaultSize={panelSizes.rightPanel} minSize={20} maxSize={40}>
                  <AIPanel />
                </Panel>
              )}

            </PanelGroup>
          </Panel>

          {/* Bottom: News Ticker */}
          {newsTickerVisible && (
            <Panel defaultSize={panelSizes.bottomPanel} minSize={3} maxSize={15}>
              <NewsTicker />
            </Panel>
          )}

          {/* Bottom: Economic Calendar Ticker */}
          {economicCalendarTickerVisible && (
            <Panel defaultSize={panelSizes.bottomPanel} minSize={3} maxSize={15}>
              <EconomicCalendarTicker />
            </Panel>
          )}
        </PanelGroup>
      </div>
    </div>
  )
}
