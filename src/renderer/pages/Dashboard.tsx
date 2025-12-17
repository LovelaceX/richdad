import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { PanelLeftClose, PanelRightClose, PanelLeft, PanelRight } from 'lucide-react'
import { MarketWatch } from '../components/MarketWatch'
import { ChartPanel } from '../components/Chart'
import { AIPanel } from '../components/AIPanel'
import { NewsTicker } from '../components/NewsTicker'
import { MarketOverview } from '../components/MarketOverview'
import { useSettingsStore } from '../stores/settingsStore'

export function Dashboard() {
  const { panelSizes, setPanelSize, panelVisibility, toggleLeftPanel, toggleRightPanel } = useSettingsStore()
  const { leftPanelVisible, rightPanelVisible } = panelVisibility

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
              {/* Left Panel Toggle (when collapsed) */}
              {!leftPanelVisible && (
                <div className="flex items-center border-r border-terminal-border bg-terminal-panel">
                  <button
                    onClick={toggleLeftPanel}
                    className="p-2 text-gray-400 hover:text-terminal-amber transition-colors"
                    title="Show Market Watch"
                  >
                    <PanelLeft size={16} />
                  </button>
                </div>
              )}

              {/* Left: Market Watch */}
              {leftPanelVisible && (
                <>
                  <Panel
                    defaultSize={panelSizes.leftPanel}
                    minSize={15}
                    maxSize={30}
                    onResize={(size) => setPanelSize('left', size)}
                  >
                    <div className="h-full flex flex-col">
                      {/* Collapse button in header area */}
                      <div className="absolute top-1 right-1 z-10">
                        <button
                          onClick={toggleLeftPanel}
                          className="p-1 text-gray-500 hover:text-terminal-amber transition-colors"
                          title="Hide Market Watch"
                        >
                          <PanelLeftClose size={14} />
                        </button>
                      </div>
                      <MarketWatch />
                    </div>
                  </Panel>
                  <PanelResizeHandle className="w-px bg-terminal-border hover:bg-terminal-amber transition-colors" />
                </>
              )}

              {/* Center: Chart */}
              <Panel defaultSize={leftPanelVisible && rightPanelVisible ? 55 : leftPanelVisible || rightPanelVisible ? 75 : 100} minSize={30}>
                <ChartPanel />
              </Panel>

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
                    <div className="h-full flex flex-col">
                      {/* Collapse button in header area */}
                      <div className="absolute top-1 left-1 z-10">
                        <button
                          onClick={toggleRightPanel}
                          className="p-1 text-gray-500 hover:text-terminal-amber transition-colors"
                          title="Hide AI Copilot"
                        >
                          <PanelRightClose size={14} />
                        </button>
                      </div>
                      <AIPanel />
                    </div>
                  </Panel>
                </>
              )}

              {/* Right Panel Toggle (when collapsed) */}
              {!rightPanelVisible && (
                <div className="flex items-center border-l border-terminal-border bg-terminal-panel">
                  <button
                    onClick={toggleRightPanel}
                    className="p-2 text-gray-400 hover:text-terminal-amber transition-colors"
                    title="Show AI Copilot"
                  >
                    <PanelRight size={16} />
                  </button>
                </div>
              )}
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
