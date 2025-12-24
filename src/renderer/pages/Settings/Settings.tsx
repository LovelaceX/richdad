/**
 * Settings Page
 *
 * Main settings container that routes between section components.
 * Reduced from 3,445 lines to ~200 lines by extracting sections into modules.
 */

import { useState, useEffect } from 'react'
import {
  Settings as SettingsIcon,
  Shield,
  Brain,
  Volume2,
  Bell,
  ChevronRight,
  Check,
  BarChart3,
  User,
  Monitor,
  Briefcase,
  Trash2,
  AlertCircle,
  Search,
  X,
  Newspaper,
} from 'lucide-react'
import {
  getSettings,
  updateSettings,
  getAISettings,
  updateAISettings,
  type UserSettings,
  type AISettings,
} from '../../lib/db'

// Section Components
import { MyProfileSection } from './sections/MyProfileSection'
import { PortfolioSection } from './sections/PortfolioSection'
import { DisplaySection } from './sections/DisplaySection'
import { RiskManagementSection } from './sections/RiskManagementSection'
import { AICopilotSection } from './sections/AICopilotSection'
import { APIKeysSection } from './sections/APIKeysSection'
import { NotificationsSection } from './sections/NotificationsSection'
import { RSSFeedsSection } from './sections/RSSFeedsSection'
import { NewsSourcesSection } from './sections/NewsSourcesSection'
import { PriceAlertsSection } from './sections/PriceAlertsSection'
import { DangerZoneSection } from './sections/DangerZoneSection'
import { ErrorLogSection } from './sections/ErrorLogSection'
import { useErrorLogStore } from '../../stores/errorLogStore'

type SettingsSection =
  | 'style'
  | 'portfolio'
  | 'display'
  | 'risk'
  | 'ai-copilot'
  | 'data-sources'
  | 'news-sources'
  | 'sounds'
  | 'traders'
  | 'alerts'
  | 'error-log'
  | 'danger'

const SECTIONS = [
  { id: 'style' as const, label: 'My Profile', icon: User, keywords: ['name', 'avatar', 'profile', 'account', 'user', 'experience'] },
  { id: 'portfolio' as const, label: 'Portfolio', icon: Briefcase, keywords: ['cash', 'balance', 'capital', 'account', 'money', 'watchlist'] },
  { id: 'display' as const, label: 'Display', icon: Monitor, keywords: ['theme', 'dark', 'light', 'color', 'zoom', 'ticker', 'speed', 'chart', 'appearance'] },
  { id: 'risk' as const, label: 'Risk Management', icon: Shield, keywords: ['stop loss', 'position', 'size', 'risk', 'kelly', 'percentage'] },
  { id: 'ai-copilot' as const, label: 'AI Copilot', icon: Brain, keywords: ['ai', 'openai', 'claude', 'groq', 'copilot', 'pattern', 'scan', 'confidence', 'budget'] },
  { id: 'data-sources' as const, label: 'Market Data', icon: BarChart3, keywords: ['api', 'key', 'polygon', 'twelvedata', 'alpha vantage', 'finnhub', 'provider', 'free', 'data', 'market'] },
  { id: 'news-sources' as const, label: 'News Sources', icon: Newspaper, keywords: ['news', 'rss', 'feed', 'headlines', 'sentiment', 'filter', 'hugging face'] },
  { id: 'error-log' as const, label: 'Activity Log', icon: AlertCircle, keywords: ['activity', 'log', 'history', 'events', 'debug', 'issue', 'troubleshoot'] },
  { id: 'sounds' as const, label: 'Notifications', icon: Volume2, keywords: ['sound', 'audio', 'notification', 'alert', 'beep', 'volume'] },
  { id: 'alerts' as const, label: 'Price Alerts', icon: Bell, keywords: ['alert', 'price', 'notification', 'target', 'watchlist'] },
  { id: 'danger' as const, label: 'Danger Zone', icon: Trash2, keywords: ['reset', 'delete', 'clear', 'data', 'cache', 'factory'] },
]

export function Settings() {
  // State
  const [activeSection, setActiveSection] = useState<SettingsSection>('style')
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [showSavedMessage, setShowSavedMessage] = useState(false)
  const [errorCount, setErrorCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const getUnresolvedCount = useErrorLogStore((s) => s.getUnresolvedCount)
  const errorLogErrors = useErrorLogStore((s) => s.errors)

  // Filter sections based on search query
  const filteredSections = searchQuery.trim()
    ? SECTIONS.filter((section) => {
        const query = searchQuery.toLowerCase()
        return (
          section.label.toLowerCase().includes(query) ||
          section.keywords.some((keyword) => keyword.toLowerCase().includes(query))
        )
      })
    : SECTIONS

  // Load settings on mount
  useEffect(() => {
    getSettings().then(setSettings)
    getAISettings().then(setAiSettings)
    getUnresolvedCount().then(setErrorCount)
  }, [getUnresolvedCount])

  // Refresh error count when error log changes
  useEffect(() => {
    getUnresolvedCount().then(setErrorCount)
  }, [errorLogErrors, getUnresolvedCount])

  // Save settings with feedback
  const saveSettings = async (updates: Partial<UserSettings>) => {
    if (!settings) return
    setSaving(true)
    const newSettings = { ...settings, ...updates }
    await updateSettings(newSettings)
    setSettings(newSettings)
    setSaving(false)
    showSavedFeedback()
  }

  // Save AI settings with feedback
  const saveAISettings = async (updates: Partial<AISettings>) => {
    if (!aiSettings) return
    setSaving(true)
    const newSettings = { ...aiSettings, ...updates }
    await updateAISettings(newSettings)
    setAiSettings(newSettings)
    setSaving(false)

    // Notify DataHeartbeatService of AI settings change
    window.dispatchEvent(new Event('ai-settings-updated'))

    showSavedFeedback()
  }

  // Show saved feedback
  const showSavedFeedback = () => {
    setShowSavedMessage(true)
    setTimeout(() => setShowSavedMessage(false), 3000)
  }

  // Render active section
  const renderSection = () => {
    if (!settings || !aiSettings) return null

    switch (activeSection) {
      case 'style':
        return <MyProfileSection />
      case 'portfolio':
        return <PortfolioSection />
      case 'display':
        return <DisplaySection />
      case 'risk':
        return <RiskManagementSection settings={settings} onSave={saveSettings} />
      case 'ai-copilot':
        return (
          <AICopilotSection
            settings={settings}
            aiSettings={aiSettings}
            onSaveSettings={saveSettings}
            onSaveAISettings={saveAISettings}
          />
        )
      case 'data-sources':
        return <APIKeysSection settings={settings} onSave={saveSettings} />
      case 'news-sources':
        return <NewsSourcesSection />
      case 'sounds':
        return <NotificationsSection settings={settings} onSave={saveSettings} />
      case 'traders':
        return <RSSFeedsSection />
      case 'alerts':
        return <PriceAlertsSection />
      case 'error-log':
        return <ErrorLogSection />
      case 'danger':
        return <DangerZoneSection />
      default:
        return null
    }
  }

  // Loading state
  if (!settings || !aiSettings) {
    return (
      <div className="flex-1 bg-terminal-bg flex items-center justify-center">
        <div className="text-gray-500">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex bg-terminal-bg overflow-hidden">
      {/* Save Feedback Toast */}
      {showSavedMessage && (
        <div className="fixed top-20 right-4 z-50 bg-terminal-amber text-black px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <Check className="w-4 h-4" />
          <span className="font-medium">Saved!</span>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-56 border-r border-terminal-border bg-terminal-panel">
        <div className="p-4 border-b border-terminal-border">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-terminal-amber" />
            <span className="text-white font-medium">Settings</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-2 border-b border-terminal-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search settings..."
              className="w-full pl-8 pr-8 py-1.5 bg-terminal-bg border border-terminal-border rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-terminal-amber"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="py-2">
          {filteredSections.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-500 text-sm">
              No matching settings
            </div>
          ) : filteredSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`w-full px-4 py-2.5 flex items-center gap-3 transition-colors ${
                activeSection === section.id
                  ? 'bg-terminal-amber/10 text-terminal-amber border-r-2 border-terminal-amber'
                  : 'text-gray-400 hover:text-white hover:bg-terminal-border/30'
              }`}
            >
              <section.icon className="w-4 h-4" />
              <span className="text-sm">{section.label}</span>
              {section.id === 'error-log' && errorCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {errorCount > 99 ? '99+' : errorCount}
                </span>
              )}
              <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl">{renderSection()}</div>
      </div>

      {/* Saving Indicator */}
      {saving && (
        <div className="fixed bottom-4 right-4 bg-terminal-amber text-black px-4 py-2 rounded-lg text-sm">
          Saving...
        </div>
      )}
    </div>
  )
}
