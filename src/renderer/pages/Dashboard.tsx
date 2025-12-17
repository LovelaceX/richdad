import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { MarketWatch } from '../components/MarketWatch'
import { ChartPanel } from '../components/Chart'
import { AIPanel } from '../components/AIPanel'
import { NewsTicker } from '../components/NewsTicker'
import { MarketOverview } from '../components/MarketOverview'
import { AIPerformance } from '../components/AI/AIPerformance'
import { useSettingsStore } from '../stores/settingsStore'

export function Dashboard() {
  const { panelSizes, setPanelSize } = useSettingsStore()

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
              <Panel
                defaultSize={panelSizes.leftPanel}
                minSize={15}
                maxSize={30}
                onResize={(size) => setPanelSize('left', size)}
              >
                <MarketWatch />
              </Panel>

              <PanelResizeHandle className="w-px bg-terminal-border hover:bg-terminal-amber transition-colors" />

              {/* Center: Chart */}
              <Panel defaultSize={55} minSize={30}>
                <ChartPanel />
              </Panel>

              <PanelResizeHandle className="w-px bg-terminal-border hover:bg-terminal-amber transition-colors" />

              {/* Right: AI Copilot + Performance */}
              <Panel
                defaultSize={panelSizes.rightPanel}
                minSize={20}
                maxSize={40}
                onResize={(size) => setPanelSize('right', size)}
              >
                <PanelGroup direction="vertical">
                  {/* AI Copilot Chat */}
                  <Panel defaultSize={60} minSize={40}>
                    <AIPanel />
                  </Panel>

                  <PanelResizeHandle className="h-px bg-terminal-border hover:bg-terminal-amber transition-colors" />

                  {/* AI Performance Stats */}
                  <Panel defaultSize={40} minSize={30}>
                    <AIPerformance />
                  </Panel>
                </PanelGroup>
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="h-px bg-terminal-border hover:bg-terminal-amber transition-colors" />

          {/* Bottom: News Ticker */}
          <Panel
            defaultSize={panelSizes.bottomPanel}
            minSize={3}
            maxSize={15}
            onResize={(size) => {
              setPanelSize('bottom', size)
              // Force chart refresh on resize
              window.dispatchEvent(new Event('resize'))
            }}
          >
            <NewsTicker />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  )
}
