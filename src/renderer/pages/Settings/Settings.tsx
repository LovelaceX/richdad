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
  Rss,
  BarChart3,
  User,
  Monitor,
  Briefcase,
  Trash2,
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
import { PriceAlertsSection } from './sections/PriceAlertsSection'
import { DangerZoneSection } from './sections/DangerZoneSection'

type SettingsSection =
  | 'style'
  | 'portfolio'
  | 'display'
  | 'risk'
  | 'ai-copilot'
  | 'data-sources'
  | 'sounds'
  | 'traders'
  | 'alerts'
  | 'danger'

const SECTIONS = [
  { id: 'style' as const, label: 'My Profile', icon: User },
  { id: 'portfolio' as const, label: 'Portfolio', icon: Briefcase },
  { id: 'display' as const, label: 'Display', icon: Monitor },
  { id: 'risk' as const, label: 'Risk Management', icon: Shield },
  { id: 'ai-copilot' as const, label: 'AI Copilot', icon: Brain },
  { id: 'data-sources' as const, label: 'API Keys', icon: BarChart3 },
  { id: 'sounds' as const, label: 'Notifications', icon: Volume2 },
  { id: 'traders' as const, label: 'RSS Feeds', icon: Rss },
  { id: 'alerts' as const, label: 'Price Alerts', icon: Bell },
  { id: 'danger' as const, label: 'Danger Zone', icon: Trash2 },
]

export function Settings() {
  // State
  const [activeSection, setActiveSection] = useState<SettingsSection>('style')
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [showSavedMessage, setShowSavedMessage] = useState(false)

  // Load settings on mount
  useEffect(() => {
    getSettings().then(setSettings)
    getAISettings().then(setAiSettings)
  }, [])

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
      case 'sounds':
        return <NotificationsSection settings={settings} onSave={saveSettings} />
      case 'traders':
        return <RSSFeedsSection />
      case 'alerts':
        return <PriceAlertsSection />
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
        <div className="py-2">
          {SECTIONS.map((section) => (
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
