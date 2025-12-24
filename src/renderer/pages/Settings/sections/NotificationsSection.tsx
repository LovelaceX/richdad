/**
 * NotificationsSection
 *
 * Settings section for sound alerts and notification preferences.
 */

import { useState } from 'react'
import { Play } from 'lucide-react'
import type { UserSettings } from '../../../lib/db'
import { previewSound, SOUND_DISPLAY_NAMES } from '../../../lib/sounds'
import { HelpTooltip } from '../../../components/common'

interface NotificationsSectionProps {
  settings: UserSettings
  onSave: (updates: Partial<UserSettings>) => Promise<void>
}

interface SoundOption {
  key: keyof UserSettings['sounds']
  label: string
  description: string
}

const SOUND_OPTIONS: SoundOption[] = [
  { key: 'buy', label: 'BUY Recommendations', description: 'Sound when AI recommends buying' },
  { key: 'sell', label: 'SELL Recommendations', description: 'Sound when AI recommends selling' },
  { key: 'hold', label: 'HOLD Recommendations', description: 'Sound when AI recommends holding' },
  { key: 'alert', label: 'General Alerts', description: 'Sound for general notifications' },
  { key: 'analysis', label: 'Analysis Updates', description: 'Sound for market analysis alerts' },
  {
    key: 'tradeExecuted',
    label: 'Trade Executed',
    description: 'Sound when a trade is completed',
  },
]

export function NotificationsSection({ settings, onSave }: NotificationsSectionProps) {
  // Local volume state for immediate UI feedback
  const [localVolume, setLocalVolume] = useState<number | null>(null)

  const handleVolumeChange = (newVolume: number) => {
    setLocalVolume(newVolume)
    onSave({ soundVolume: newVolume })
  }

  const handleSoundChange = (key: keyof UserSettings['sounds'], value: string) => {
    onSave({ sounds: { ...settings.sounds, [key]: value } })
  }

  const handlePreview = (soundKey: string) => {
    previewSound(soundKey, localVolume ?? settings.soundVolume)
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-white text-lg font-semibold">Notifications</h3>
          <HelpTooltip content="Audio alerts for trading events. Choose different sounds for buy/sell/hold signals and trade confirmations." />
        </div>
        <p className="text-gray-400 text-sm">
          Configure sound alerts for AI recommendations, news, and trades
        </p>
      </div>

      {/* Master Toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg border border-terminal-border">
        <div>
          <span className="text-white">Sound Notifications</span>
          <p className="text-gray-500 text-xs mt-0.5">Play sounds for AI alerts and events</p>
        </div>
        <button
          onClick={() => onSave({ soundEnabled: !settings.soundEnabled })}
          className={`w-12 h-6 rounded-full transition-colors ${
            settings.soundEnabled ? 'bg-terminal-amber' : 'bg-terminal-border'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white transition-transform ${
              settings.soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Volume Control */}
      <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white text-sm">Volume</span>
          <span className="text-terminal-amber font-mono">
            {localVolume ?? settings.soundVolume}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={localVolume ?? settings.soundVolume}
          onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
          className="w-full accent-terminal-amber"
          disabled={!settings.soundEnabled}
        />
      </div>

      {/* Sound Selection */}
      <div className="border-t border-terminal-border" />
      <div className="space-y-4">
        <h4 className="text-white text-sm font-medium">Sound Selection</h4>
        <p className="text-gray-500 text-xs -mt-2">
          Choose which sound plays for each event type
        </p>

        {SOUND_OPTIONS.map((option) => (
          <SoundSelector
            key={option.key}
            label={option.label}
            description={option.description}
            value={settings.sounds[option.key]}
            onChange={(value) => handleSoundChange(option.key, value)}
            onPreview={() => handlePreview(settings.sounds[option.key])}
            disabled={!settings.soundEnabled}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Sound selector row component
 */
function SoundSelector({
  label,
  description,
  value,
  onChange,
  onPreview,
  disabled,
}: {
  label: string
  description: string
  value: string
  onChange: (value: string) => void
  onPreview: () => void
  disabled: boolean
}) {
  return (
    <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <label className="text-white text-sm">{label}</label>
          <p className="text-gray-500 text-xs mt-0.5">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="bg-terminal-bg border border-terminal-border text-white px-3 py-1.5 rounded text-sm"
            disabled={disabled}
          >
            {Object.entries(SOUND_DISPLAY_NAMES).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
          <button
            onClick={onPreview}
            className="p-2 bg-terminal-border hover:bg-terminal-amber/20 rounded text-xs text-white transition-colors flex items-center gap-1"
            disabled={disabled}
          >
            <Play className="w-3 h-3" />
            Preview
          </button>
        </div>
      </div>
    </div>
  )
}
