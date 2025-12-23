import { Panel, PanelGroup } from 'react-resizable-panels'
import { MarketWatch } from '../components/MarketWatch'
import { ChartPanel } from '../components/Chart'
import { NewsTicker } from '../components/NewsTicker'
import { MarketOverview } from '../components/MarketOverview'
import { ErrorBoundary } from '../components/ErrorBoundary'
import { useSettingsStore } from '../stores/settingsStore'

export function Dashboard() {
  const { panelSizes, panelVisibility } = useSettingsStore()
  const { leftPanelVisible, chartVisible, newsTickerVisible } = panelVisibility

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Market Overview Bar */}
      <ErrorBoundary fallbackTitle="Market Overview Error">
        <MarketOverview />
      </ErrorBoundary>

      {/* Main Content - Resizable Panels */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="vertical">
          {/* Top: 3-column layout */}
          <Panel defaultSize={95} minSize={50} maxSize={97}>
            <PanelGroup direction="horizontal">
              {/* Left: Market Watch */}
              {leftPanelVisible && (
                <Panel defaultSize={panelSizes.leftPanel} minSize={12} maxSize={30}>
                  <ErrorBoundary fallbackTitle="Watchlist Error">
                    <MarketWatch />
                  </ErrorBoundary>
                </Panel>
              )}

              {/* Center: Chart - now takes up all remaining space */}
              {chartVisible && (
                <Panel defaultSize={leftPanelVisible ? 80 : 100} minSize={50}>
                  <ErrorBoundary fallbackTitle="Chart Error">
                    <ChartPanel />
                  </ErrorBoundary>
                </Panel>
              )}

              {/* AI Copilot is now a modal - see AIModal in App.tsx */}

            </PanelGroup>
          </Panel>

          {/* Bottom: News Ticker */}
          {newsTickerVisible && (
            <Panel defaultSize={panelSizes.bottomPanel} minSize={3} maxSize={15}>
              <ErrorBoundary fallbackTitle="News Ticker Error">
                <NewsTicker />
              </ErrorBoundary>
            </Panel>
          )}
        </PanelGroup>
      </div>
    </div>
  )
}
