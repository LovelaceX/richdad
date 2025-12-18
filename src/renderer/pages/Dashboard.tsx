import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { MarketWatch } from '../components/MarketWatch'
import { ChartPanel } from '../components/Chart'
import { AIPanel } from '../components/AIPanel'
import { NewsTicker } from '../components/NewsTicker'
import { MarketOverview } from '../components/MarketOverview'
import { useSettingsStore } from '../stores/settingsStore'

export function Dashboard() {
  const { panelSizes, setPanelSize, panelVisibility } = useSettingsStore()
  const { leftPanelVisible, rightPanelVisible, chartVisible, newsTickerVisible } = panelVisibility

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
                <>
                  <Panel
                    defaultSize={panelSizes.leftPanel}
                    minSize={15}
                    maxSize={30}
                    onResize={(size) => setPanelSize('left', size)}
                  >
                    <MarketWatch />
                  </Panel>
                  <PanelResizeHandle className="w-px bg-terminal-border hover:bg-terminal-amber transition-colors" />
                </>
              )}

              {/* Center: Chart */}
              {chartVisible && (
                <Panel defaultSize={leftPanelVisible && rightPanelVisible ? 55 : leftPanelVisible || rightPanelVisible ? 75 : 100} minSize={30}>
                  <ChartPanel />
                </Panel>
              )}

              {/* Right: AI Copilot */}
              {rightPanelVisible && (
                <>
                  <PanelResizeHandle className="w-px bg-terminal-border hover:bg-terminal-amber transition-colors" />
                  <Panel
                    defaultSize={panelSizes.rightPanel}
                    minSize={20}
                    maxSize={40}
                    onResize={(size) => setPanelSize('right', size)}
                  >
                    <AIPanel />
                  </Panel>
                </>
              )}

            </PanelGroup>
          </Panel>

          {newsTickerVisible && (
            <>
              <PanelResizeHandle className="h-px bg-terminal-border hover:bg-terminal-amber transition-colors" />

              {/* Bottom: News Ticker */}
              <Panel
                defaultSize={panelSizes.bottomPanel}
                minSize={3}
                maxSize={15}
                onResize={(size) => {
                  setPanelSize('bottom', size)
                  // Force chart refresh on resize - multiple events for reliability
                  window.dispatchEvent(new Event('resize'))
                  setTimeout(() => window.dispatchEvent(new Event('resize')), 100)
                }}
              >
                <NewsTicker />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    </div>
  )
}
