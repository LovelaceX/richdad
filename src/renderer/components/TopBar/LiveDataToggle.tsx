/**
 * Live Data Toggle
 *
 * Manual control to start/pause live data fetching.
 * Displays current state with visual indicator.
 * Shows "No Keys" state when running without API keys configured.
 */

import { useState, useEffect } from 'react'
import { Radio, Pause, KeyRound } from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'
import { getSettings } from '../../lib/db'

type LiveStatus = 'paused' | 'live' | 'no-keys'

export function LiveDataToggle() {
  const isLiveDataEnabled = useSettingsStore(state => state.isLiveDataEnabled)
  const toggleLiveData = useSettingsStore(state => state.toggleLiveData)
  const [hasMarketKeys, setHasMarketKeys] = useState(true) // Assume true initially

  // Check for API keys on mount and when live state changes
  useEffect(() => {
    const checkKeys = async () => {
      const settings = await getSettings()
      const hasKeys = !!(settings?.polygonApiKey || settings?.twelvedataApiKey)
      setHasMarketKeys(hasKeys)
    }
    checkKeys()

    // Re-check when API settings change
    const handleApiChange = () => checkKeys()
    window.addEventListener('api-settings-updated', handleApiChange)
    return () => window.removeEventListener('api-settings-updated', handleApiChange)
  }, [isLiveDataEnabled])

  // Determine display status
  const status: LiveStatus = !isLiveDataEnabled
    ? 'paused'
    : hasMarketKeys
      ? 'live'
      : 'no-keys'

  const statusConfig = {
    paused: {
      bg: 'bg-gray-500/10 hover:bg-gray-500/20',
      text: 'text-gray-400',
      label: 'Go Live',
      title: 'Click to start live data updates.',
      Icon: Pause
    },
    live: {
      bg: 'bg-green-500/10 hover:bg-green-500/20',
      text: 'text-green-400',
      label: 'Live',
      title: 'Live data active. Click to pause.',
      Icon: Radio
    },
    'no-keys': {
      bg: 'bg-orange-500/10 hover:bg-orange-500/20',
      text: 'text-orange-400',
      label: 'No Keys',
      title: 'No market data API keys configured. Add Polygon or TwelveData key in Settings.',
      Icon: KeyRound
    }
  }

  const config = statusConfig[status]
  const Icon = config.Icon

  return (
    <button
      onClick={toggleLiveData}
      className={`flex items-center gap-1.5 px-2 py-1 rounded transition-all ${config.bg}`}
      title={config.title}
    >
      {/* Icon */}
      <Icon size={12} className={config.text} />

      {/* Label */}
      <span className={`text-[10px] font-medium ${config.text}`}>
        {config.label}
      </span>
    </button>
  )
}
