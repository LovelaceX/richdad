/**
 * DisplaySection
 *
 * Settings section for visual accessibility and interface scaling.
 */

// React import not needed for JSX in modern TypeScript
import { Monitor, LayoutGrid, Eye } from 'lucide-react'
import { useSettingsStore } from '../../../stores/settingsStore'

export function DisplaySection() {
  // Get state and actions from Zustand store
  const cvdMode = useSettingsStore((state) => state.cvdMode)
  const toggleCvdMode = useSettingsStore((state) => state.toggleCvdMode)
  const zoomLevel = useSettingsStore((state) => state.zoomLevel)
  const setZoomLevel = useSettingsStore((state) => state.setZoomLevel)
  const tickerSpeed = useSettingsStore((state) => state.tickerSpeed)
  const setTickerSpeed = useSettingsStore((state) => state.setTickerSpeed)
  const panelVisibility = useSettingsStore((state) => state.panelVisibility)
  const toggleLeftPanel = useSettingsStore((state) => state.toggleLeftPanel)
  const toggleRightPanel = useSettingsStore((state) => state.toggleRightPanel)
  const toggleChart = useSettingsStore((state) => state.toggleChart)
  const toggleNewsTicker = useSettingsStore((state) => state.toggleNewsTicker)
  const toggleAIPerformance = useSettingsStore((state) => state.toggleAIPerformance)
  const toggleEconomicCalendarTicker = useSettingsStore((state) => state.toggleEconomicCalendarTicker)

  return (
    <div>
      <h2 className="text-white text-lg font-medium mb-1">Display</h2>
      <p className="text-gray-500 text-sm mb-6">Visual accessibility and interface scaling</p>

      <div className="space-y-6">
        {/* Interface Zoom */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Monitor className="w-4 h-4 text-terminal-amber" />
            <span className="text-white text-sm font-medium">Interface Zoom</span>
          </div>

          <p className="text-gray-400 text-xs mb-4">
            Scale the entire interface for better readability. You can also use keyboard shortcuts.
          </p>

          {/* Zoom Level Buttons */}
          <div className="flex gap-2 mb-4">
            {[90, 100, 110, 125].map((level) => (
              <button
                key={level}
                onClick={() => setZoomLevel(level)}
                className={`flex-1 py-2.5 px-4 rounded font-mono text-sm transition-colors ${
                  zoomLevel === level
                    ? 'bg-terminal-amber text-black font-semibold'
                    : 'bg-terminal-bg border border-terminal-border text-white hover:border-terminal-amber/50'
                }`}
              >
                {level}%
              </button>
            ))}
          </div>

          {/* Keyboard Shortcuts */}
          <div className="bg-terminal-bg rounded border border-terminal-border p-3">
            <p className="text-gray-500 text-xs mb-2">Keyboard shortcuts:</p>
            <div className="space-y-1 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-gray-400">Zoom in</span>
                <span className="text-terminal-amber">Cmd/Ctrl +</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Zoom out</span>
                <span className="text-terminal-amber">Cmd/Ctrl -</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Reset to 100%</span>
                <span className="text-terminal-amber">Cmd/Ctrl 0</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-terminal-border" />

        {/* Panel Visibility */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <LayoutGrid className="w-4 h-4 text-terminal-amber" />
            <span className="text-white text-sm font-medium">Panel Visibility</span>
          </div>

          <p className="text-gray-400 text-xs mb-4">
            Choose which panels to display on the dashboard.
          </p>

          <div className="space-y-3">
            {/* Market Watch */}
            <ToggleRow
              label="Market Watch"
              enabled={panelVisibility.leftPanelVisible}
              onToggle={toggleLeftPanel}
            />

            {/* Live Chart */}
            <ToggleRow
              label="Live Chart"
              enabled={panelVisibility.chartVisible}
              onToggle={toggleChart}
            />

            {/* AI Copilot */}
            <ToggleRow
              label="AI Copilot"
              enabled={panelVisibility.rightPanelVisible}
              onToggle={toggleRightPanel}
            />

            {/* News Ticker */}
            <ToggleRow
              label="News Ticker"
              enabled={panelVisibility.newsTickerVisible}
              onToggle={toggleNewsTicker}
            />

            {/* Economic Calendar Ticker */}
            <ToggleRow
              label="Economic Calendar Ticker"
              enabled={panelVisibility.economicCalendarTickerVisible}
              onToggle={toggleEconomicCalendarTicker}
            />

            {/* AI Performance */}
            <ToggleRow
              label="AI Performance (in AI Panel)"
              enabled={panelVisibility.aiPerformanceVisible}
              onToggle={toggleAIPerformance}
            />
          </div>
        </div>

        <div className="border-t border-terminal-border" />

        {/* Ticker Speed */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Monitor className="w-4 h-4 text-terminal-amber" />
            <span className="text-white text-sm font-medium">Ticker Speed</span>
          </div>

          <p className="text-gray-400 text-xs mb-4">
            Adjust the scrolling speed of the news and economic calendar tickers.
          </p>

          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-xs">Slow</span>
            <input
              type="range"
              min="10"
              max="60"
              value={tickerSpeed}
              onChange={(e) => setTickerSpeed(Number(e.target.value))}
              className="flex-1 h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-terminal-amber"
            />
            <span className="text-gray-400 text-xs">Fast</span>
            <span className="text-terminal-amber font-mono text-sm w-8">{tickerSpeed}</span>
          </div>
        </div>

        <div className="border-t border-terminal-border" />

        {/* Color Vision Deficiency Mode */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-terminal-amber" />
            <span className="text-white text-sm font-medium">Accessibility</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-gray-300 text-sm">Color Vision Deficiency Mode</span>
              <p className="text-gray-500 text-xs mt-1">
                Use patterns and shapes instead of red/green for price changes
              </p>
            </div>
            <button
              onClick={toggleCvdMode}
              className={`w-12 h-6 rounded-full transition-colors ${
                cvdMode ? 'bg-terminal-amber' : 'bg-terminal-border'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  cvdMode ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Toggle switch row component
 */
function ToggleRow({
  label,
  enabled,
  onToggle,
}: {
  label: string
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-300 text-sm">{label}</span>
      <button
        onClick={onToggle}
        className={`w-12 h-6 rounded-full transition-colors ${
          enabled ? 'bg-terminal-amber' : 'bg-terminal-border'
        }`}
      >
        <div
          className={`w-5 h-5 rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  )
}
