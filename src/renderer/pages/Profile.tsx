import { useState, useEffect, useRef } from 'react'
import {
  User,
  Pencil,
  DollarSign,
  Briefcase,
  Shield,
  ExternalLink,
  Plus,
  X
} from 'lucide-react'
import { useProfileStore } from '../stores/profileStore'
import { useNavigationStore } from '../stores/navigationStore'
import { getSettings, type UserSettings } from '../lib/db'

const PLATFORM_SUGGESTIONS = [
  'Robinhood',
  'TD Ameritrade',
  'Fidelity',
  'E*TRADE',
  'Webull',
  'Interactive Brokers',
  'Charles Schwab',
  'Tastytrade',
  'Thinkorswim',
  'TradeStation'
]

export function Profile() {
  const setPage = useNavigationStore(state => state.setPage)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { profile, loading, loadProfile, updateProfile, addPlatform, removePlatform } = useProfileStore()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [newPlatform, setNewPlatform] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [portfolioInput, setPortfolioInput] = useState('')

  useEffect(() => {
    loadProfile()
    getSettings().then(setSettings)
  }, [loadProfile])

  useEffect(() => {
    if (profile.portfolioSize) {
      setPortfolioInput(formatCurrency(profile.portfolioSize))
    }
  }, [profile.portfolioSize])

  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US')
  }

  const parseCurrency = (value: string) => {
    return parseInt(value.replace(/,/g, ''), 10) || 0
  }

  const handlePortfolioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    const num = parseInt(raw, 10) || 0
    setPortfolioInput(formatCurrency(num))
  }

  const handlePortfolioBlur = () => {
    const value = parseCurrency(portfolioInput)
    updateProfile({ portfolioSize: value })
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Compress image before saving to avoid IndexedDB size issues
      const img = new Image()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      img.onload = () => {
        // Resize to max 200x200 for profile picture
        const maxSize = 200
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height
            height = maxSize
          }
        }

        canvas.width = width
        canvas.height = height
        ctx?.drawImage(img, 0, 0, width, height)

        // Convert to compressed JPEG
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8)
        console.log('[Profile] Saving avatar, size:', Math.round(compressedBase64.length / 1024), 'KB')
        updateProfile({ avatarUrl: compressedBase64 })
      }

      img.onerror = () => {
        console.error('[Profile] Failed to load image')
      }

      // Read file as data URL to load into image
      const reader = new FileReader()
      reader.onload = () => {
        img.src = reader.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAddPlatform = (platform: string) => {
    if (platform.trim()) {
      addPlatform(platform.trim())
      setNewPlatform('')
      setShowSuggestions(false)
    }
  }

  const filteredSuggestions = PLATFORM_SUGGESTIONS.filter(
    p => p.toLowerCase().includes(newPlatform.toLowerCase()) && !profile.tradingPlatforms.includes(p)
  )

  if (loading) {
    return (
      <div className="flex-1 bg-terminal-bg flex items-center justify-center">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 bg-terminal-bg overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6">
        {/* Profile Header */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-6 mb-6">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div
              className="relative group cursor-pointer"
              onClick={handleAvatarClick}
            >
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-terminal-amber/20 flex items-center justify-center">
                  <User className="w-10 h-10 text-terminal-amber" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-full transition-opacity">
                <Pencil className="w-5 h-5 text-white" />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="mb-4">
                <label className="text-gray-500 text-xs mb-1 block">Display Name</label>
                <input
                  type="text"
                  value={profile.displayName}
                  onChange={(e) => updateProfile({ displayName: e.target.value })}
                  placeholder="Your Name"
                  className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-white text-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-500 text-xs mb-1 block">Username</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                    <input
                      type="text"
                      value={profile.username}
                      onChange={(e) => updateProfile({ username: e.target.value.replace('@', '') })}
                      placeholder="username"
                      className="w-full bg-terminal-bg border border-terminal-border rounded pl-7 pr-3 py-2 text-white text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-500 text-xs mb-1 block">X (Twitter)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                    <input
                      type="text"
                      value={profile.xHandle || ''}
                      onChange={(e) => updateProfile({ xHandle: e.target.value.replace('@', '') })}
                      placeholder="handle"
                      className="w-full bg-terminal-bg border border-terminal-border rounded pl-7 pr-3 py-2 text-white text-sm"
                    />
                  </div>
                </div>
              </div>

              {profile.xHandle && (
                <a
                  href={`https://x.com/${profile.xHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-terminal-amber text-sm mt-2 hover:underline"
                >
                  View on X <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Portfolio Size */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-terminal-amber" />
            <h2 className="text-white font-medium">Portfolio Size</h2>
          </div>
          <p className="text-gray-500 text-sm mb-4">
            Used by AI for position sizing recommendations
          </p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
            <input
              type="text"
              value={portfolioInput}
              onChange={handlePortfolioChange}
              onBlur={handlePortfolioBlur}
              placeholder="0"
              className="w-full bg-terminal-bg border border-terminal-border rounded pl-7 pr-3 py-3 text-white text-xl font-mono"
            />
          </div>
        </div>

        {/* Trading Platforms */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-5 h-5 text-terminal-amber" />
            <h2 className="text-white font-medium">My Trading Platforms</h2>
          </div>

          {/* Platform chips */}
          <div className="flex flex-wrap gap-2 mb-4">
            {profile.tradingPlatforms.map(platform => (
              <span
                key={platform}
                className="inline-flex items-center gap-1 bg-terminal-amber/20 text-terminal-amber px-3 py-1.5 rounded-full text-sm"
              >
                {platform}
                <button
                  onClick={() => removePlatform(platform)}
                  className="hover:bg-terminal-amber/30 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          {/* Add platform */}
          <div className="relative">
            <div className="flex gap-2">
              <input
                type="text"
                value={newPlatform}
                onChange={(e) => {
                  setNewPlatform(e.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddPlatform(newPlatform)
                  }
                }}
                placeholder="Add trading platform..."
                className="flex-1 bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-white text-sm"
              />
              <button
                onClick={() => handleAddPlatform(newPlatform)}
                disabled={!newPlatform.trim()}
                className="px-4 py-2 bg-terminal-amber text-black rounded text-sm font-medium hover:bg-terminal-amber/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && newPlatform && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-terminal-panel border border-terminal-border rounded-lg overflow-hidden z-10 shadow-lg">
                {filteredSuggestions.slice(0, 5).map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => handleAddPlatform(suggestion)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-terminal-border/50 hover:text-white transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Risk Settings Summary */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-terminal-amber" />
              <h2 className="text-white font-medium">Risk Settings</h2>
            </div>
            <button
              onClick={() => setPage('settings')}
              className="text-terminal-amber text-sm hover:underline"
            >
              Edit in Settings
            </button>
          </div>

          {settings && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-terminal-bg rounded-lg p-4">
                <p className="text-gray-500 text-xs mb-1">Daily Loss Limit</p>
                <p className="text-white text-xl font-mono">{settings.dailyLossLimit}%</p>
              </div>
              <div className="bg-terminal-bg rounded-lg p-4">
                <p className="text-gray-500 text-xs mb-1">Position Size Limit</p>
                <p className="text-white text-xl font-mono">{settings.positionSizeLimit}%</p>
              </div>
              <div className="bg-terminal-bg rounded-lg p-4">
                <p className="text-gray-500 text-xs mb-1">Lookback Period</p>
                <p className="text-white text-xl font-mono">{settings.lookbackDays} days</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
