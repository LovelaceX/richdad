import { WifiOff } from 'lucide-react'
import { CommandInput } from './CommandInput'
import { NavBar } from '../Navigation/NavBar'
import { APIBudgetAlert } from './APIBudgetAlert'
import { AIBudgetAlert } from './AIBudgetAlert'
import { AICopilotButton } from './AICopilotButton'
import { MarketStatusIndicator } from '../Chart/MarketStatusIndicator'
import { useNetworkStatus } from '../../hooks/useNetworkStatus'

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

        {/* Right: AI Copilot + Market Status */}
        <div className="flex justify-end items-center gap-2 no-drag" style={{ width: '280px' }}>
          <AICopilotButton />
          <MarketStatusIndicator />
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
