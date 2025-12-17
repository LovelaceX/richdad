import { useState, useEffect } from 'react'
import { Minus, Plus, HelpCircle } from 'lucide-react'
import { CommandInput } from './CommandInput'
// import { WindowControls } from './WindowControls' - Disabled: Using native OS window controls
import { NavBar } from '../Navigation/NavBar'
import { HelpModal } from '../Help/HelpModal'
import { APIBudgetAlert } from './APIBudgetAlert'
import { AIBudgetAlert } from './AIBudgetAlert'
import { useSettingsStore } from '../../stores/settingsStore'

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
  const [showHelp, setShowHelp] = useState(false)

  // Keyboard shortcut: Cmd+? to open help
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + / (which is ?)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '/') {
        e.preventDefault()
        setShowHelp(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <div className="h-12 bg-terminal-panel border-b border-terminal-border flex items-center px-2 drag-region">
        {/* Left: Logo + Nav (fixed width for centering) */}
        <div className="flex items-center gap-2 no-drag flex-shrink-0" style={{ width: '300px' }}>
          <span className="text-terminal-amber font-bold text-lg tracking-tight">
            richdad
          </span>
          <div className="border-l border-terminal-border ml-2 pl-2 min-w-fit flex-shrink-0">
            <NavBar />
          </div>
        </div>

        {/* Center: Command Input */}
        <div className="flex-1 flex justify-center px-4">
          <CommandInput />
        </div>

        {/* Right: Help + Zoom Controls + Window Controls */}
        <div className="flex justify-end items-center gap-1" style={{ width: '240px' }}>
          {/* Help Button */}
          <button
            onClick={() => setShowHelp(true)}
            className="p-2 hover:bg-terminal-border rounded transition-colors no-drag"
            title="Help & Documentation (Cmd+?)"
          >
            <HelpCircle size={16} className="text-gray-400 hover:text-terminal-amber" />
          </button>

          <ZoomControls />
          {/* <WindowControls /> - Disabled: Using native OS window controls */}
        </div>
      </div>

      {/* API Budget Alert */}
      <APIBudgetAlert />

      {/* AI Budget Alert */}
      <AIBudgetAlert />

      {/* Help Modal */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </>
  )
}
