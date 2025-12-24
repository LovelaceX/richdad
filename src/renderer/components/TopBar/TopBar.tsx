import { Minus, Plus, WifiOff } from 'lucide-react'
import { CommandInput } from './CommandInput'
import { NavBar } from '../Navigation/NavBar'
import { APIBudgetAlert } from './APIBudgetAlert'
import { AIBudgetAlert } from './AIBudgetAlert'
import { AICopilotButton } from './AICopilotButton'
import { LiveDataToggle } from './LiveDataToggle'
import { ServiceHealthIndicator } from './ServiceHealthIndicator'
import { useSettingsStore } from '../../stores/settingsStore'
import { useNetworkStatus } from '../../hooks/useNetworkStatus'

function ZoomControls() {
  const zoomLevel = useSettingsStore(state => state.zoomLevel)
  const zoomIn = useSettingsStore(state => state.zoomIn)
  const zoomOut = useSettingsStore(state => state.zoomOut)

  return (
    <div className="flex items-center gap-1 no-drag mr-2">
      <button
        onClick={zoomOut}
        disabled={zoomLevel === 90}
        className="p-2 hover:bg-terminal-border rounded transition-colors disabled:opacity-30"
        title="Zoom out (Cmd/Ctrl -)"
      >
        <Minus size={14} className="text-gray-400" />
      </button>

      <span className="text-gray-400 font-mono text-xs min-w-[42px] text-center">
        {zoomLevel}%
      </span>

      <button
        onClick={zoomIn}
        disabled={zoomLevel === 125}
        className="p-2 hover:bg-terminal-border rounded transition-colors disabled:opacity-30"
        title="Zoom in (Cmd/Ctrl +)"
      >
        <Plus size={14} className="text-gray-400" />
      </button>
    </div>
  )
}

export function TopBar() {
  const isOnline = useNetworkStatus()

  return (
    <>
      <div className="h-12 bg-terminal-panel border-b border-terminal-border flex items-center px-2 drag-region">
        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-2 no-drag flex-shrink-0">
          <span className="text-terminal-amber font-bold text-lg tracking-tight">
            RichDad
          </span>
          <div className="border-l border-terminal-border ml-2 pl-2 min-w-fit flex-shrink-0">
            <NavBar />
          </div>
        </div>

        {/* Center: Command Input */}
        <div className="flex-1 flex justify-center px-4">
          <CommandInput />
        </div>

        {/* Right: Live Toggle + Service Health + AI Copilot + Zoom Controls */}
        <div className="flex justify-end items-center gap-2 no-drag" style={{ width: '380px' }}>
          <LiveDataToggle />
          <ServiceHealthIndicator />
          <div className="w-px h-5 bg-terminal-border" />
          <AICopilotButton />
          <div className="w-px h-5 bg-terminal-border" />
          <ZoomControls />
        </div>
      </div>

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="w-full px-4 py-2 bg-yellow-900/30 border-b border-yellow-500/50 flex items-center gap-2">
          <WifiOff size={14} className="text-yellow-400" />
          <span className="text-yellow-400 text-xs">Offline - using cached data</span>
        </div>
      )}

      {/* API Budget Alert */}
      <APIBudgetAlert />

      {/* AI Budget Alert */}
      <AIBudgetAlert />
    </>
  )
}
