import { useState, useEffect } from 'react'
import { Minus, Square, X, Maximize2 } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'

// Check if running in Tauri
const isTauri = typeof window !== 'undefined' && '__TAURI__' in window

export function WindowControls() {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    if (!isTauri) return

    // Check initial state
    invoke<boolean>('is_maximized').then(setIsMaximized)
  }, [])

  const handleMinimize = async () => {
    if (isTauri) {
      await invoke('minimize_window')
    }
  }

  const handleMaximize = async () => {
    if (isTauri) {
      await invoke('maximize_window')
      // Update state after maximize/restore
      const maximized = await invoke<boolean>('is_maximized')
      setIsMaximized(maximized)
    }
  }

  const handleClose = async () => {
    if (isTauri) {
      await invoke('close_window')
    }
  }

  // Don't render controls in browser mode
  if (!isTauri) {
    return null
  }

  return (
    <div className="flex items-center gap-1 no-drag">
      <button
        onClick={handleMinimize}
        className="p-2 hover:bg-terminal-border rounded transition-colors"
        title="Minimize"
      >
        <Minus size={14} className="text-gray-400" />
      </button>

      <button
        onClick={handleMaximize}
        className="p-2 hover:bg-terminal-border rounded transition-colors"
        title={isMaximized ? 'Restore' : 'Maximize'}
      >
        {isMaximized ? (
          <Maximize2 size={14} className="text-gray-400" />
        ) : (
          <Square size={12} className="text-gray-400" />
        )}
      </button>

      <button
        onClick={handleClose}
        className="p-2 hover:bg-red-600 rounded transition-colors group"
        title="Close"
      >
        <X size={14} className="text-gray-400 group-hover:text-white" />
      </button>
    </div>
  )
}
