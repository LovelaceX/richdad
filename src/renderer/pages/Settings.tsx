import { useState, useEffect, useRef } from 'react'
import {
  Settings as SettingsIcon,
  Shield,
  Brain,
  Volume2,
  Bell,
  ChevronRight,
  Check,
  Plus,
  Trash2,
  Rss,
  Cpu,
  BarChart3,
  Download,
  ChevronDown,
  Play,
  User,
  Edit,
  Loader2,
  AlertCircle,
  Wifi,
  Monitor,
  TrendingUp,
  ExternalLink
} from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'
import { useProTraderStore } from '../stores/proTraderStore'
import { useAlertStore } from '../stores/alertStore'
import { OnboardingWizard } from '../components/Onboarding/OnboardingWizard'
import {
  getSettings,
  updateSettings,
  getAISettings,
  updateAISettings,
  getProfile,
  updateProfile,
  getTradeDecisions,
  AI_PROVIDERS,
  type UserSettings,
  type AISettings,
  type AIProvider,
  type UserProfile,
  type TradeDecision,
  type RecommendationFormat
} from '../lib/db'
import { exportDecisions } from '../lib/export'
import type { ToneType } from '../types'

type SettingsSection = 'risk' | 'ai-copilot' | 'data-sources' | 'sounds' | 'style' | 'traders' | 'alerts' | 'display'

const TONE_DESCRIPTIONS: Record<ToneType, { label: string; example: string }> = {
  conservative: {
    label: 'Conservative',
    example: '"Consider waiting for confirmation before entering. Risk/reward ratio suggests caution."'
  },
  aggressive: {
    label: 'Aggressive',
    example: '"Strong momentum detected! This could run fast. Consider sizing up on this one."'
  },
  humorous: {
    label: 'Humorous',
    example: '"This stock is looking spicier than my grandma\'s salsa. Might want to take a bite"'
  },
  professional: {
    label: 'Professional',
    example: '"Technical indicators suggest bullish divergence. Volume supports upward movement."'
  }
}

const POPULAR_RSS_FEEDS = [
  { name: 'Reuters Markets', url: 'https://www.reuters.com/markets/rss', description: 'Breaking market news from Reuters' },
  { name: 'Bloomberg Markets', url: 'https://www.bloomberg.com/feed/markets', description: 'Global financial market coverage' },
  { name: 'CNBC Top News', url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', description: 'Top business and market stories' },
  { name: 'WSJ Markets', url: 'https://feeds.wsj.com/wsj/xml/rss/3_7031.xml', description: 'Wall Street Journal market updates' },
  { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/rss/', description: 'Stock quotes and financial news' },
  { name: 'Seeking Alpha', url: 'https://seekingalpha.com/market_currents.xml', description: 'Stock analysis and investment ideas' },
  { name: 'Benzinga', url: 'https://www.benzinga.com/feed', description: 'Fast-moving market news' },
  { name: 'MarketWatch', url: 'https://www.marketwatch.com/rss/topstories', description: 'Stock market news and analysis' },
  { name: 'Investopedia', url: 'https://www.investopedia.com/feedbuilder/feed/getfeed?feedName=rss_headline', description: 'Financial education and news' },
  { name: 'The Motley Fool', url: 'https://www.fool.com/feeds/index.aspx', description: 'Investment advice and stock picks' },
  { name: 'TradingView', url: 'https://www.tradingview.com/feed/', description: 'Charts, analysis, and trading ideas' },
  { name: 'Barchart', url: 'https://www.barchart.com/news/authors/rss', description: 'Market data and financial news' }
]

export function Settings() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('style')
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null)
  const [saving, setSaving] = useState(false)
  const [exportStartDate, setExportStartDate] = useState('')
  const [exportEndDate, setExportEndDate] = useState('')
  const [exportPreviewData, setExportPreviewData] = useState<TradeDecision[]>([])
  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const [showFeedDropdown, setShowFeedDropdown] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [lastTrade, setLastTrade] = useState<TradeDecision | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cvdMode = useSettingsStore(state => state.cvdMode)
  const toggleCvdMode = useSettingsStore(state => state.toggleCvdMode)
  const zoomLevel = useSettingsStore(state => state.zoomLevel)
  const setZoomLevel = useSettingsStore(state => state.setZoomLevel)

  // Pro Traders state
  const { traders, loadTraders, addTrader, removeTrader, toggleTrader } = useProTraderStore()
  const [newTraderName, setNewTraderName] = useState('')
  const [newTraderUrl, setNewTraderUrl] = useState('')

  // Price Alerts state
  const { alerts, loadAlerts, addAlert, removeAlert } = useAlertStore()
  const [newAlertSymbol, setNewAlertSymbol] = useState('')
  const [newAlertCondition, setNewAlertCondition] = useState<'above' | 'below' | 'percent_up' | 'percent_down'>('above')
  const [newAlertValue, setNewAlertValue] = useState('')

  // Alpha Vantage connection test state
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'valid' | 'invalid'>('idle')
  const [connectionMessage, setConnectionMessage] = useState('')

  // Finnhub connection test state
  const [testingFinnhub, setTestingFinnhub] = useState(false)
  const [finnhubStatus, setFinnhubStatus] = useState<'idle' | 'valid' | 'invalid'>('idle')

  // API Keys pending changes state
  const [pendingAlphaVantageKey, setPendingAlphaVantageKey] = useState<string>('')
  const [pendingFinnhubKey, setPendingFinnhubKey] = useState<string>('')
  const [hasApiKeyChanges, setHasApiKeyChanges] = useState(false)
  const [savingApiKeys, setSavingApiKeys] = useState(false)
  const [finnhubMessage, setFinnhubMessage] = useState('')

  // Onboarding wizard state
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false)

  // Save feedback state
  const [showSavedMessage, setShowSavedMessage] = useState(false)

  useEffect(() => {
    getSettings().then(setSettings)
    getAISettings().then(setAiSettings)
    // getDecisionStats().then(setStats) // TODO: Display stats in UI
    getProfile().then(setProfile)
    getTradeDecisions(1).then(trades => {
      if (trades.length > 0) {
        setLastTrade(trades[0])
      }
    })
    loadTraders()
    loadAlerts()
  }, [loadTraders, loadAlerts])

  // Load export preview data when dates change
  useEffect(() => {
    const loadExportPreview = async () => {
      if (exportStartDate || exportEndDate) {
        const allTrades = await getTradeDecisions(1000)
        let filtered = allTrades

        if (exportStartDate) {
          const startTime = new Date(exportStartDate).getTime()
          filtered = filtered.filter(t => t.timestamp >= startTime)
        }

        if (exportEndDate) {
          const endTime = new Date(exportEndDate).getTime() + 86400000 // Add 1 day to include end date
          filtered = filtered.filter(t => t.timestamp < endTime)
        }

        setExportPreviewData(filtered)
      } else {
        setExportPreviewData([])
      }
    }

    loadExportPreview()
  }, [exportStartDate, exportEndDate])

  // Initialize pending API keys when settings load
  useEffect(() => {
    if (settings) {
      setPendingAlphaVantageKey(settings.alphaVantageApiKey || '')
      setPendingFinnhubKey(settings.finnhubApiKey || '')
      setHasApiKeyChanges(false)
    }
  }, [settings?.alphaVantageApiKey, settings?.finnhubApiKey])

  const saveSettings = async (updates: Partial<UserSettings>) => {
    if (!settings) return
    setSaving(true)
    const newSettings = { ...settings, ...updates }
    await updateSettings(newSettings)
    setSettings(newSettings)
    setSaving(false)

    // Show saved feedback
    setShowSavedMessage(true)
    setTimeout(() => setShowSavedMessage(false), 2000)
  }

  const saveAISettings = async (updates: Partial<AISettings>) => {
    if (!aiSettings) return
    setSaving(true)
    const newSettings = { ...aiSettings, ...updates }
    await updateAISettings(newSettings)
    setAiSettings(newSettings)
    setSaving(false)

    // Show saved feedback
    setShowSavedMessage(true)
    setTimeout(() => setShowSavedMessage(false), 2000)
  }

  const saveProfile = async (updates: Partial<UserProfile>) => {
    if (!profile) return
    setSaving(true)
    const newProfile = { ...profile, ...updates }
    await updateProfile(newProfile)
    setProfile(newProfile)
    setSaving(false)

    // Show saved feedback
    setShowSavedMessage(true)
    setTimeout(() => setShowSavedMessage(false), 2000)
  }

  // API Keys save/discard handlers
  const handleSaveApiKeys = async () => {
    setSavingApiKeys(true)
    await saveSettings({
      alphaVantageApiKey: pendingAlphaVantageKey,
      finnhubApiKey: pendingFinnhubKey
    })
    setHasApiKeyChanges(false)
    setSavingApiKeys(false)
    // Reset connection status when saving new keys
    setConnectionStatus('idle')
    setConnectionMessage('')
    setFinnhubStatus('idle')
    setFinnhubMessage('')
  }

  const handleDiscardApiKeys = () => {
    setPendingAlphaVantageKey(settings?.alphaVantageApiKey || '')
    setPendingFinnhubKey(settings?.finnhubApiKey || '')
    setHasApiKeyChanges(false)
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result as string
        saveProfile({ avatarUrl: base64 })
      }
      reader.readAsDataURL(file)
    }
  }

  // Sound playback using Web Audio API
  const playSound = (soundType: string, volume: number) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    // Set volume
    gainNode.gain.value = volume / 100

    // Different sound characteristics based on type
    switch (soundType) {
      case 'default':
        oscillator.frequency.value = 800
        oscillator.type = 'sine'
        break
      case 'chime':
        oscillator.frequency.value = 1200
        oscillator.type = 'sine'
        break
      case 'bell':
        oscillator.frequency.value = 1000
        oscillator.type = 'triangle'
        break
      case 'ping':
        oscillator.frequency.value = 1500
        oscillator.type = 'sine'
        break
      case 'cash-register':
        oscillator.frequency.value = 600
        oscillator.type = 'square'
        break
      case 'voice-buy':
        oscillator.frequency.value = 900
        oscillator.type = 'sawtooth'
        break
      case 'voice-sell':
        oscillator.frequency.value = 700
        oscillator.type = 'sawtooth'
        break
      case 'voice-hold':
        oscillator.frequency.value = 800
        oscillator.type = 'sawtooth'
        break
      case 'voice-alert':
        oscillator.frequency.value = 1100
        oscillator.type = 'sawtooth'
        break
      default:
        oscillator.frequency.value = 800
        oscillator.type = 'sine'
    }

    // Play sound
    oscillator.start()

    // Fade out effect
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

    // Stop after 300ms
    setTimeout(() => {
      oscillator.stop()
      audioContext.close()
    }, 300)
  }

  const handleExport = async (format: 'txt' | 'csv') => {
    const startDate = exportStartDate ? new Date(exportStartDate) : undefined
    const endDate = exportEndDate ? new Date(exportEndDate) : undefined
    await exportDecisions(format, startDate, endDate)
    setShowExportDropdown(false)
  }

  const handleAddFeed = (feed: typeof POPULAR_RSS_FEEDS[0]) => {
    addTrader({
      name: feed.name,
      handle: feed.url,
      source: 'rss',
      feedUrl: feed.url,
      enabled: true,
      addedAt: Date.now()
    })
    setShowFeedDropdown(false)
  }

  const handleAddManualFeed = () => {
    if (newTraderName && newTraderUrl) {
      addTrader({
        name: newTraderName,
        handle: newTraderUrl,
        source: 'rss',
        feedUrl: newTraderUrl,
        enabled: true,
        addedAt: Date.now()
      })
      setNewTraderName('')
      setNewTraderUrl('')
    }
  }

  // Budget field helper functions
  const formatCurrency = (value: number) => {
    return value.toLocaleString('en-US')
  }

  const parseCurrency = (value: string) => {
    return parseInt(value.replace(/,/g, ''), 10) || 0
  }

  const handleBudgetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    const num = parseInt(raw, 10) || 0
    e.target.value = formatCurrency(num)
  }

  const handleBudgetBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = parseCurrency(e.target.value)
    saveSettings({ dailyBudget: value })
  }

  const handleTestConnection = async () => {
    if (!settings?.alphaVantageApiKey) {
      setConnectionStatus('invalid')
      setConnectionMessage('No API key entered')
      return
    }

    setTestingConnection(true)
    setConnectionStatus('idle')
    setConnectionMessage('')

    try {
      // Dynamically import the validator to avoid bundling issues
      const { testAlphaVantageKey } = await import('../../services/alphaVantageValidator')
      const result = await testAlphaVantageKey(settings.alphaVantageApiKey)

      if (result.valid) {
        setConnectionStatus('valid')
        setConnectionMessage(result.message)
      } else {
        setConnectionStatus('invalid')
        setConnectionMessage(result.message)
      }
    } catch (error) {
      setConnectionStatus('invalid')
      setConnectionMessage('Connection test failed')
      console.error('[Settings] Connection test error:', error)
    } finally {
      setTestingConnection(false)
    }
  }

  const handleTestFinnhubConnection = async () => {
    if (!settings?.finnhubApiKey) {
      setFinnhubStatus('invalid')
      setFinnhubMessage('No API key entered')
      return
    }

    setTestingFinnhub(true)
    setFinnhubStatus('idle')
    setFinnhubMessage('')

    try {
      // Dynamically import the validator to avoid bundling issues
      const { testFinnhubKey } = await import('../../services/finnhubValidator')
      const result = await testFinnhubKey(settings.finnhubApiKey)

      if (result.valid) {
        setFinnhubStatus('valid')
        setFinnhubMessage(result.message)
      } else {
        setFinnhubStatus('invalid')
        setFinnhubMessage(result.message)
      }
    } catch (error) {
      setFinnhubStatus('invalid')
      setFinnhubMessage('Connection test failed')
      console.error('[Settings] Finnhub connection test error:', error)
    } finally {
      setTestingFinnhub(false)
    }
  }

  const sections = [
    { id: 'style' as const, label: 'My Profile', icon: User },
    { id: 'display' as const, label: 'Display', icon: Monitor },
    { id: 'risk' as const, label: 'Risk Management', icon: Shield },
    { id: 'ai-copilot' as const, label: 'AI Copilot', icon: Brain },
    { id: 'data-sources' as const, label: 'API Keys', icon: BarChart3 },
    { id: 'sounds' as const, label: 'Notifications', icon: Volume2 },
    { id: 'traders' as const, label: 'RSS Feeds', icon: Rss },
    { id: 'alerts' as const, label: 'Price Alerts', icon: Bell },
  ]

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
        <div className="fixed top-4 right-4 z-50 bg-terminal-amber text-black px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
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
          {sections.map(section => (
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
        <div className="max-w-2xl">
          {/* Risk Management */}
          {activeSection === 'risk' && (
            <div>
              <h2 className="text-white text-lg font-medium mb-1">Risk Management</h2>
              <p className="text-gray-500 text-sm mb-6">Set your trading limits and risk parameters</p>

              <div className="space-y-6">
                {/* Daily Budget */}
                <div>
                  <label className="text-white text-sm mb-3 block">Daily Budget</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="text"
                      value={formatCurrency(settings.dailyBudget || 1000)}
                      onChange={(e) => handleBudgetChange(e)}
                      onBlur={(e) => handleBudgetBlur(e)}
                      placeholder="0"
                      className="w-full bg-terminal-bg border border-terminal-border rounded pl-7 pr-3 py-2 text-white font-mono"
                    />
                  </div>
                  <p className="text-gray-600 text-xs mt-2">Maximum amount to risk per day</p>
                </div>

                {/* Daily Loss Limit */}
                <div>
                  <label className="text-white text-sm mb-3 block">Daily Loss Limit</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={settings.dailyLossLimit}
                      onChange={(e) => saveSettings({ dailyLossLimit: Number(e.target.value) })}
                      className="flex-1 h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-terminal-amber"
                    />
                    <span className="text-terminal-amber font-mono w-12 text-right">{settings.dailyLossLimit}%</span>
                  </div>
                  <p className="text-gray-600 text-xs mt-2">
                    Maximum loss: ${formatCurrency(Math.round((settings.dailyBudget || 1000) * settings.dailyLossLimit / 100))}
                    {settings.dailyLossLimit > 10 && <span className="text-orange-500 ml-2">⚠️ Most traders use 2-5%</span>}
                  </p>
                </div>

                <div>
                  <label className="text-white text-sm mb-3 block">Position Size Limit</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="25"
                      value={settings.positionSizeLimit}
                      onChange={(e) => saveSettings({ positionSizeLimit: Number(e.target.value) })}
                      className="flex-1 h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-terminal-amber"
                    />
                    <span className="text-terminal-amber font-mono w-12 text-right">{settings.positionSizeLimit}%</span>
                  </div>
                  <p className="text-gray-600 text-xs mt-2">Maximum portfolio allocation per position</p>
                </div>

                <div>
                  <label className="text-white text-sm mb-3 block">Pattern Lookback Period</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="90"
                      max="365"
                      step="1"
                      value={settings.lookbackDays}
                      onChange={(e) => saveSettings({ lookbackDays: Number(e.target.value) })}
                      className="flex-1 h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-terminal-amber"
                    />
                    <span className="text-terminal-amber font-mono w-20 text-right">{settings.lookbackDays} days</span>
                  </div>
                  <p className="text-gray-600 text-xs mt-2">How far back AI analyzes historical patterns</p>
                </div>
              </div>
            </div>
          )}

          {/* AI Copilot */}
          {activeSection === 'ai-copilot' && (
            <div>
              <h2 className="text-white text-lg font-medium mb-1">AI Copilot</h2>
              <p className="text-gray-500 text-sm mb-6">Configure your AI provider, model, and communication style</p>

              <div className="space-y-8">
                {/* Provider Selection */}
                <div>
                  <h3 className="text-white text-sm font-medium mb-3">AI Provider</h3>
                  <p className="text-gray-400 text-xs mb-4">
                    Choose your AI provider. Bring Your Own Key (BYOK) - your API key stays on your device.
                  </p>
                  <select
                    value={aiSettings.provider}
                    onChange={(e) => saveAISettings({ provider: e.target.value as AIProvider, model: AI_PROVIDERS[e.target.value as AIProvider].models[0] })}
                    className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-4 py-3 text-white text-sm hover:border-terminal-amber/50 transition-colors focus:outline-none focus:border-terminal-amber cursor-pointer"
                  >
                    {(Object.keys(AI_PROVIDERS) as AIProvider[]).map(provider => (
                      <option key={provider} value={provider}>
                        {AI_PROVIDERS[provider].name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="border-t border-terminal-border" />

                {/* Model & API Key Configuration */}
                <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Cpu className="w-4 h-4 text-terminal-amber" />
                    <span className="text-white text-sm font-medium">{AI_PROVIDERS[aiSettings.provider].name} Setup</span>
                  </div>

                  <p className="text-gray-400 text-xs mb-4">
                    {AI_PROVIDERS[aiSettings.provider].instructions}
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Model</label>
                      <select
                        value={aiSettings.model || AI_PROVIDERS[aiSettings.provider].models[0]}
                        onChange={(e) => saveAISettings({ model: e.target.value })}
                        className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-white"
                      >
                        {AI_PROVIDERS[aiSettings.provider].models.map(model => (
                          <option key={model} value={model}>{model}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">API Key</label>
                      <input
                        type="password"
                        value={aiSettings.apiKey}
                        onChange={(e) => saveAISettings({ apiKey: e.target.value })}
                        placeholder={AI_PROVIDERS[aiSettings.provider].keyPlaceholder}
                        className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-white placeholder:text-gray-600 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Recommendation Format</label>
                      <select
                        value={aiSettings.recommendationFormat || 'standard'}
                        onChange={(e) => saveAISettings({ recommendationFormat: e.target.value as RecommendationFormat })}
                        className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-white"
                      >
                        <option value="standard">Standard (With Sources)</option>
                        <option value="concise">Concise (No Sources)</option>
                        <option value="detailed">Detailed Analysis</option>
                      </select>
                      <p className="text-gray-600 text-xs mt-1">
                        Control how AI recommendations are formatted and presented
                      </p>
                    </div>
                  </div>

                  {aiSettings.apiKey && (
                    <div className="mt-4 flex items-center gap-2 text-terminal-up text-xs">
                      <Check className="w-3 h-3" />
                      API key configured
                    </div>
                  )}
                </div>

                <div className="border-t border-terminal-border" />

                {/* Response Style / Personality */}
                <div>
                  <h3 className="text-white text-sm font-medium mb-3">Response Style</h3>
                  <p className="text-gray-400 text-xs mb-4">
                    Choose how your AI co-pilot communicates with you
                  </p>
                  <div className="space-y-3">
                    {(Object.keys(TONE_DESCRIPTIONS) as ToneType[]).map(tone => (
                      <button
                        key={tone}
                        onClick={() => saveSettings({ tone })}
                        className={`w-full p-4 rounded-lg border text-left transition-colors ${
                          settings.tone === tone
                            ? 'border-terminal-amber bg-terminal-amber/10'
                            : 'border-terminal-border hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium">{TONE_DESCRIPTIONS[tone].label}</span>
                          {settings.tone === tone && (
                            <Check className="w-4 h-4 text-terminal-amber" />
                          )}
                        </div>
                        <p className="text-gray-500 text-sm italic">
                          {TONE_DESCRIPTIONS[tone].example}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Local AI Models */}
                <div className="border-t border-terminal-border" />
                <div>
                  <div className="mb-4">
                    <span className="text-white text-sm font-medium block mb-2">Local AI Models</span>
                    <p className="text-gray-500 text-xs">
                      Run AI models on your device for privacy and offline analysis
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border border-terminal-border mb-4">
                    <div>
                      <span className="text-white">Enable Local Models</span>
                      <p className="text-gray-500 text-xs mt-0.5">Use on-device AI instead of cloud APIs</p>
                    </div>
                    <button
                      onClick={() => saveSettings({ useLocalLLM: !settings.useLocalLLM })}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        settings.useLocalLLM ? 'bg-terminal-amber' : 'bg-terminal-border'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        settings.useLocalLLM ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  {settings.useLocalLLM && (
                    <div>
                      <label className="text-gray-400 text-xs mb-2 block">Select Model</label>
                      <select
                        value={settings.selectedLocalModel || ''}
                        onChange={(e) => saveSettings({ selectedLocalModel: e.target.value })}
                        className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-white"
                      >
                        <option value="">Choose a model...</option>
                        <option value="llama-3.2-1b">Llama 3.2 1B (Fast, ~1GB)</option>
                        <option value="llama-3.2-3b">Llama 3.2 3B (Balanced, ~2GB)</option>
                        <option value="phi-3-mini">Phi-3 Mini (Efficient, ~2GB)</option>
                        <option value="gemma-2b">Gemma 2B (Quality, ~2GB)</option>
                      </select>
                      <p className="text-gray-500 text-xs mt-2">
                        Local models will be downloaded and run on your device when needed
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* API Keys */}
          {activeSection === 'data-sources' && (
            <div>
              <h2 className="text-white text-lg font-medium mb-1">API Keys</h2>
              <p className="text-gray-500 text-sm mb-6">Configure API keys for market data and news sources</p>

              {/* Launch Setup Wizard Button */}
              <button
                onClick={() => setShowOnboardingWizard(true)}
                className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-4 py-3 text-white hover:border-terminal-amber transition-colors mb-6 flex items-center justify-center gap-2"
              >
                <BarChart3 className="w-4 h-4 text-terminal-amber" />
                <span className="text-sm font-medium">Launch Setup Wizard</span>
              </button>

              <div className="space-y-6">
                {/* Alpha Vantage API */}
                <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="w-4 h-4 text-terminal-amber" />
                    <span className="text-white text-sm font-medium">Alpha Vantage (Market Data)</span>
                  </div>

                  <p className="text-gray-400 text-xs mb-4">
                    Free API for real-time stock quotes. Get your key at{' '}
                    <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noopener noreferrer" className="text-terminal-amber hover:underline">
                      alphavantage.co
                    </a>
                  </p>

                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">API Key</label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={pendingAlphaVantageKey}
                        onChange={(e) => {
                          setPendingAlphaVantageKey(e.target.value)
                          setHasApiKeyChanges(true)
                          // Reset connection status when key changes
                          setConnectionStatus('idle')
                          setConnectionMessage('')
                        }}
                        placeholder="e.g., KXZZ8Y7YJAZMNA41"
                        className="flex-1 bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-white placeholder:text-gray-600 font-mono"
                      />
                      <button
                        onClick={handleTestConnection}
                        disabled={!settings.alphaVantageApiKey || testingConnection}
                        className="px-4 py-2 bg-terminal-panel border border-terminal-border rounded text-sm text-white hover:bg-terminal-border/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {testingConnection ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <Wifi className="w-4 h-4" />
                            Test
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-gray-600 text-xs mt-2">
                      Free tier: 25 calls/day • We cache data for 1 hour to stay within limits
                    </p>
                  </div>

                  {/* Status Indicators */}
                  {!settings.alphaVantageApiKey && (
                    <div className="mt-4 flex items-center gap-2 text-gray-500 text-xs">
                      <AlertCircle className="w-3 h-3" />
                      No API key configured - using mock data
                    </div>
                  )}

                  {settings.alphaVantageApiKey && connectionStatus === 'idle' && (
                    <div className="mt-4 flex items-center gap-2 text-terminal-amber text-xs">
                      <Check className="w-3 h-3" />
                      API key saved (click "Test" to verify)
                    </div>
                  )}

                  {connectionStatus === 'valid' && (
                    <div className="mt-4 flex items-center gap-2 text-terminal-up text-xs">
                      <Check className="w-3 h-3" />
                      {connectionMessage}
                    </div>
                  )}

                  {connectionStatus === 'invalid' && (
                    <div className="mt-4 flex items-center gap-2 text-terminal-down text-xs">
                      <AlertCircle className="w-3 h-3" />
                      {connectionMessage}
                    </div>
                  )}
                </div>

                <div className="border-t border-terminal-border" />

                {/* Finnhub */}
                <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-terminal-amber" />
                    <span className="text-white text-sm font-medium">Finnhub</span>
                  </div>

                  <p className="text-gray-400 text-xs mb-4">
                    Alternative market data provider. Free tier: 60 calls/minute.
                  </p>

                  {/* API Key Input */}
                  <div className="mb-4">
                    <label className="text-gray-400 text-xs mb-1 block">API Key</label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={pendingFinnhubKey}
                        onChange={(e) => {
                          setPendingFinnhubKey(e.target.value)
                          setHasApiKeyChanges(true)
                          setFinnhubStatus('idle')
                          setFinnhubMessage('')
                        }}
                        placeholder="e.g., abc123xyz456"
                        className="flex-1 bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-white placeholder:text-gray-600 font-mono focus:outline-none focus:border-terminal-amber/50"
                      />
                      <button
                        onClick={handleTestFinnhubConnection}
                        disabled={!settings.finnhubApiKey || testingFinnhub}
                        className="px-4 py-2 bg-terminal-panel border border-terminal-border rounded text-sm text-white hover:bg-terminal-border/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {testingFinnhub ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <Wifi className="w-4 h-4" />
                            Test
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-gray-600 text-xs mt-2">
                      Free tier: 60 calls/minute • Automatic fallback when Alpha Vantage exhausted
                    </p>
                  </div>

                  {/* Signup Link */}
                  <a
                    href="https://finnhub.io/register"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-terminal-amber hover:underline text-xs"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Get free Finnhub API key
                  </a>

                  {/* Status Indicators */}
                  {!settings.finnhubApiKey && (
                    <div className="mt-4 flex items-center gap-2 text-gray-500 text-xs">
                      <AlertCircle className="w-3 h-3" />
                      No API key configured - Alpha Vantage used as primary
                    </div>
                  )}

                  {settings.finnhubApiKey && finnhubStatus === 'idle' && (
                    <div className="mt-4 flex items-center gap-2 text-terminal-amber text-xs">
                      <Check className="w-3 h-3" />
                      API key saved (click "Test" to verify)
                    </div>
                  )}

                  {finnhubStatus === 'valid' && (
                    <div className="mt-4 flex items-center gap-2 text-terminal-up text-xs">
                      <Check className="w-3 h-3" />
                      {finnhubMessage}
                    </div>
                  )}

                  {finnhubStatus === 'invalid' && (
                    <div className="mt-4 flex items-center gap-2 text-terminal-down text-xs">
                      <AlertCircle className="w-3 h-3" />
                      {finnhubMessage}
                    </div>
                  )}
                </div>

                {/* Save/Discard Buttons for API Keys */}
                {hasApiKeyChanges && (
                  <div className="flex gap-2 p-4 bg-terminal-bg border border-terminal-amber/30 rounded-lg">
                    <button
                      onClick={handleSaveApiKeys}
                      disabled={savingApiKeys}
                      className="flex-1 px-4 py-2 bg-terminal-amber text-black rounded font-medium hover:bg-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingApiKeys ? 'Saving...' : 'Save API Key Changes'}
                    </button>
                    <button
                      onClick={handleDiscardApiKeys}
                      className="px-4 py-2 bg-terminal-panel border border-terminal-border rounded text-white hover:bg-terminal-border/50 transition-colors"
                    >
                      Discard Changes
                    </button>
                  </div>
                )}

                <div className="border-t border-terminal-border" />

                {/* News Source Preference */}
                <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Rss className="w-4 h-4 text-terminal-amber" />
                    <span className="text-white text-sm font-medium">News Source Preference</span>
                  </div>

                  <p className="text-gray-400 text-xs mb-4">
                    Choose which news source to prioritize. Both sources have automatic fallback.
                  </p>

                  {/* Toggle Switch */}
                  <div className="flex items-center justify-between p-3 rounded border border-terminal-border mb-3">
                    <div>
                      <span className="text-white text-sm">Prefer Alpha Vantage News</span>
                      <p className="text-gray-500 text-xs mt-0.5">
                        Uses 1 API call per day, includes sentiment analysis
                      </p>
                    </div>
                    <button
                      onClick={() => saveSettings({ useAlphaVantageForNews: !settings.useAlphaVantageForNews })}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        settings.useAlphaVantageForNews ? 'bg-terminal-amber' : 'bg-terminal-border'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        settings.useAlphaVantageForNews ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  {/* Status Text */}
                  <div className="text-xs text-gray-400">
                    {settings.useAlphaVantageForNews ? (
                      <div className="flex items-center gap-2">
                        <span>⚡</span>
                        <span>Alpha Vantage priority mode - fetches news with built-in sentiment, falls back to RSS if unavailable</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>📡</span>
                        <span>RSS priority mode - free and unlimited, uses FinBERT for sentiment analysis</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* My Profile */}
          {activeSection === 'style' && profile && (
            <div>
              <h2 className="text-white text-lg font-medium mb-1">My Profile</h2>
              <p className="text-gray-500 text-sm mb-6">Manage your profile and export trading data</p>

              {/* Profile Information - UNIFIED */}
              <div className="bg-terminal-panel border border-terminal-border rounded-lg p-6 mb-6">
                <h3 className="text-white font-medium mb-4">Profile Information</h3>

                <div className="flex items-start gap-6">
                  {/* Left: Photo */}
                  <div className="flex-shrink-0">
                    <div
                      className="relative group cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {profile.avatarUrl ? (
                        <img
                          src={profile.avatarUrl}
                          alt="Profile"
                          className="w-24 h-24 rounded-full object-cover border-2 border-terminal-border"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-terminal-amber/20 border-2 border-terminal-border flex items-center justify-center">
                          <User className="w-12 h-12 text-terminal-amber" />
                        </div>
                      )}

                      {/* Edit overlay on hover */}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-full transition-opacity">
                        <Edit className="w-6 h-6 text-white" />
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Right: User Info */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="text-gray-400 text-xs mb-1 block">Username</label>
                      <input
                        type="text"
                        value={profile.username || ''}
                        onChange={(e) => saveProfile({ username: e.target.value })}
                        placeholder="Enter your username"
                        className="w-full bg-terminal-bg border border-terminal-border rounded px-4 py-2.5 text-white text-sm focus:outline-none focus:border-terminal-amber"
                      />
                      <p className="text-gray-500 text-xs mt-1">
                        Used for the trading community
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Last Trade */}
              <div className="bg-terminal-panel border border-terminal-border rounded-lg p-6 mb-6">
                <h3 className="text-white font-medium mb-4">Last Trade</h3>

                {lastTrade ? (
                  <div className="bg-terminal-bg rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-terminal-amber font-medium text-lg">
                        {lastTrade.symbol}
                      </span>
                      <span className={`font-medium ${
                        lastTrade.action === 'BUY' ? 'text-terminal-up' :
                        lastTrade.action === 'SELL' ? 'text-terminal-down' :
                        'text-gray-400'
                      }`}>
                        {lastTrade.action}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Decision: </span>
                        <span className={`capitalize ${
                          lastTrade.decision === 'execute' ? 'text-terminal-up' : 'text-gray-400'
                        }`}>
                          {lastTrade.decision}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Confidence: </span>
                        <span className="text-white">{lastTrade.confidence}%</span>
                      </div>
                      {lastTrade.priceAtDecision && (
                        <div>
                          <span className="text-gray-500">Price: </span>
                          <span className="text-white font-mono">${lastTrade.priceAtDecision.toFixed(2)}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500">Date: </span>
                        <span className="text-white">
                          {new Date(lastTrade.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No trades yet</p>
                )}
              </div>

              {/* Export Section */}
              <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Download className="w-4 h-4 text-terminal-amber" />
                  <span className="text-white text-sm font-medium">Export Decisions</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">From Date</label>
                    <input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 text-xs mb-1 block">To Date</label>
                    <input
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                      className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-white"
                    />
                  </div>
                </div>

                {/* Preview Table */}
                {exportPreviewData.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-gray-400 text-xs font-medium">Preview</h4>
                      <span className="text-terminal-amber text-xs">
                        {exportPreviewData.length} trade{exportPreviewData.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="bg-terminal-bg border border-terminal-border rounded overflow-hidden">
                      <div className="overflow-x-auto max-h-64 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-terminal-panel sticky top-0">
                            <tr className="border-b border-terminal-border">
                              <th className="text-left p-2 text-gray-400 font-medium">Date</th>
                              <th className="text-left p-2 text-gray-400 font-medium">Symbol</th>
                              <th className="text-left p-2 text-gray-400 font-medium">Action</th>
                              <th className="text-left p-2 text-gray-400 font-medium">Decision</th>
                              <th className="text-left p-2 text-gray-400 font-medium">Confidence</th>
                            </tr>
                          </thead>
                          <tbody>
                            {exportPreviewData.slice(0, 5).map((trade, idx) => (
                              <tr key={idx} className="border-b border-terminal-border/50 hover:bg-terminal-panel/30">
                                <td className="p-2 text-gray-300 font-mono">
                                  {new Date(trade.timestamp).toLocaleDateString()}
                                </td>
                                <td className="p-2 text-terminal-amber font-medium">{trade.symbol}</td>
                                <td className={`p-2 font-medium ${
                                  trade.action === 'BUY' ? 'text-terminal-up' :
                                  trade.action === 'SELL' ? 'text-terminal-down' :
                                  'text-gray-400'
                                }`}>
                                  {trade.action}
                                </td>
                                <td className={`p-2 capitalize ${
                                  trade.decision === 'execute' ? 'text-terminal-up' : 'text-gray-400'
                                }`}>
                                  {trade.decision}
                                </td>
                                <td className="p-2 text-white">{trade.confidence}%</td>
                              </tr>
                            ))}
                            {exportPreviewData.length > 5 && (
                              <tr>
                                <td colSpan={5} className="p-2 text-center text-gray-500 text-xs bg-terminal-panel/30">
                                  +{exportPreviewData.length - 5} more trade{exportPreviewData.length - 5 !== 1 ? 's' : ''}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                <div className="relative">
                  <button
                    onClick={() => setShowExportDropdown(!showExportDropdown)}
                    className="w-full py-2 bg-terminal-amber text-black font-medium rounded text-sm hover:bg-terminal-amber/80 flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export {exportPreviewData.length > 0 ? `(${exportPreviewData.length})` : ''}
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {showExportDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-terminal-panel border border-terminal-border rounded-lg overflow-hidden z-10">
                      <button
                        onClick={() => handleExport('txt')}
                        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-terminal-border/50"
                      >
                        Export as TXT
                      </button>
                      <button
                        onClick={() => handleExport('csv')}
                        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-terminal-border/50"
                      >
                        Export as CSV
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Display */}
          {activeSection === 'display' && (
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
                    {[90, 100, 110, 125].map(level => (
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

                {/* High-Contrast Color Scheme */}
                <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-white text-sm font-medium">High-Contrast Color Scheme</span>
                      <p className="text-gray-500 text-xs mt-1">
                        Optimizes colors for color vision deficiency. Changes green/red to blue/orange.
                      </p>
                    </div>
                    <button
                      onClick={toggleCvdMode}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        cvdMode ? 'bg-terminal-amber' : 'bg-terminal-border'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        cvdMode ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  {/* Color Preview */}
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="bg-terminal-bg rounded p-2 border border-terminal-border">
                      <p className="text-gray-500 text-xs mb-2">Standard:</p>
                      <div className="flex gap-2">
                        <span className="text-semantic-up text-sm">▲ Buy</span>
                        <span className="text-semantic-down text-sm">▼ Sell</span>
                      </div>
                    </div>
                    <div className="bg-terminal-bg rounded p-2 border border-terminal-border">
                      <p className="text-gray-500 text-xs mb-2">CVD Mode:</p>
                      <div className="flex gap-2">
                        <span className="text-semantic-up-cvd text-sm">▲ Buy</span>
                        <span className="text-semantic-down-cvd text-sm">▼ Sell</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Mode */}
                <div className="border-t border-terminal-border" />
                <div className="flex items-center justify-between p-4 rounded-lg border border-terminal-border">
                  <div>
                    <span className="text-white">Performance Mode</span>
                    <p className="text-gray-500 text-xs mt-0.5">Reduce animations and visual effects</p>
                  </div>
                  <button
                    onClick={() => saveSettings({ performanceMode: !settings.performanceMode })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.performanceMode ? 'bg-terminal-amber' : 'bg-terminal-border'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      settings.performanceMode ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeSection === 'sounds' && (
            <div>
              <h2 className="text-white text-lg font-medium mb-1">Notifications</h2>
              <p className="text-gray-500 text-sm mb-6">Configure sound alerts</p>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg border border-terminal-border">
                  <div>
                    <span className="text-white">Sound Notifications</span>
                    <p className="text-gray-500 text-xs mt-0.5">Play sounds for AI alerts</p>
                  </div>
                  <button
                    onClick={() => saveSettings({ soundEnabled: !settings.soundEnabled })}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      settings.soundEnabled ? 'bg-terminal-amber' : 'bg-terminal-border'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      settings.soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                {settings.soundEnabled && (
                  <>
                    <div>
                      <label className="text-white text-sm mb-3 block">Volume</label>
                      <div className="flex items-center gap-4">
                        <Volume2 className="w-4 h-4 text-gray-500" />
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={settings.soundVolume}
                          onChange={(e) => saveSettings({ soundVolume: Number(e.target.value) })}
                          className="flex-1 h-2 bg-terminal-border rounded-lg appearance-none cursor-pointer accent-terminal-amber"
                        />
                        <span className="text-terminal-amber font-mono w-12 text-right">{settings.soundVolume}%</span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-white text-sm block">Sound per Action</label>
                      {(['buy', 'sell', 'hold', 'alert'] as const).map(action => (
                        <div key={action} className="flex items-center gap-3 p-3 rounded border border-terminal-border">
                          <span className={`text-sm capitalize w-16 ${
                            action === 'buy' ? 'text-terminal-up' :
                            action === 'sell' ? 'text-terminal-down' :
                            'text-gray-400'
                          }`}>
                            {action}
                          </span>
                          <select
                            value={settings.sounds[action]}
                            onChange={(e) => saveSettings({
                              sounds: { ...settings.sounds, [action]: e.target.value }
                            })}
                            className="flex-1 bg-terminal-bg border border-terminal-border rounded px-3 py-1 text-sm text-white"
                          >
                            <option value="default">Default Beep</option>
                            <option value="chime">Chime</option>
                            <option value="bell">Bell</option>
                            <option value="ping">Ping</option>
                            <option value="cash-register">Cash Register</option>
                            <option value="voice-buy">Voice: Buy</option>
                            <option value="voice-sell">Voice: Sell</option>
                            <option value="voice-hold">Voice: Hold</option>
                            <option value="voice-alert">Voice: Alert</option>
                            <option value="none">None</option>
                          </select>
                          <button
                            onClick={() => {
                              const soundFile = settings.sounds[action]
                              if (soundFile && soundFile !== 'none') {
                                playSound(soundFile, settings.soundVolume)
                              }
                            }}
                            className="px-3 py-1 bg-terminal-panel border border-terminal-border rounded hover:bg-terminal-border/50 text-white text-sm flex items-center gap-1.5 flex-shrink-0"
                            title="Preview sound"
                          >
                            <Play className="w-3 h-3" />
                            Play
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* RSS Feeds (Pro Traders) */}
          {activeSection === 'traders' && (
            <div>
              <h2 className="text-white text-lg font-medium mb-1">RSS Feeds</h2>
              <p className="text-gray-500 text-sm mb-6">Follow market news and analysis via RSS feeds</p>

              {/* Add Feed */}
              <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 mb-6">
                <h3 className="text-white text-sm font-medium mb-4">Add RSS Feed</h3>

                {/* Popular Feeds Dropdown */}
                <div className="relative mb-4">
                  <button
                    onClick={() => setShowFeedDropdown(!showFeedDropdown)}
                    className="w-full py-2.5 px-3 bg-terminal-bg border border-terminal-border rounded text-sm text-left flex items-center justify-between hover:border-terminal-amber/50 transition-colors"
                  >
                    <span className="text-gray-400">Select popular feed...</span>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showFeedDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showFeedDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-terminal-panel border border-terminal-border rounded-lg overflow-hidden z-10 max-h-64 overflow-y-auto">
                      {POPULAR_RSS_FEEDS.map(feed => (
                        <button
                          key={feed.name}
                          onClick={() => handleAddFeed(feed)}
                          className="w-full px-4 py-3 text-left hover:bg-terminal-border/50 transition-colors border-b border-terminal-border last:border-0"
                        >
                          <div className="text-white text-sm font-medium">{feed.name}</div>
                          <div className="text-gray-500 text-xs">{feed.description}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="text-gray-500 text-xs text-center mb-4">or add manually</div>

                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Feed name"
                    value={newTraderName}
                    onChange={(e) => setNewTraderName(e.target.value)}
                    className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-white placeholder:text-gray-600"
                  />

                  <input
                    type="text"
                    placeholder="https://example.com/feed/rss"
                    value={newTraderUrl}
                    onChange={(e) => setNewTraderUrl(e.target.value)}
                    className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-white placeholder:text-gray-600"
                  />

                  <button
                    onClick={handleAddManualFeed}
                    disabled={!newTraderName || !newTraderUrl}
                    className="w-full py-2 bg-terminal-amber text-black font-medium rounded text-sm hover:bg-terminal-amber/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Feed
                  </button>
                </div>
              </div>

              {/* Feeds List */}
              {traders.length === 0 ? (
                <div className="text-gray-500 text-sm p-8 text-center border border-dashed border-terminal-border rounded-lg">
                  No RSS feeds added yet.
                  <br />
                  <span className="text-gray-600 text-xs">Select from popular feeds or add manually above</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {traders.map(trader => (
                    <div
                      key={trader.id}
                      className="flex items-center justify-between p-3 bg-terminal-panel border border-terminal-border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Rss className="w-4 h-4 text-orange-400" />
                        <div>
                          <p className="text-white text-sm">{trader.name}</p>
                          <p className="text-gray-500 text-xs truncate max-w-xs">{trader.handle}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => trader.id && toggleTrader(trader.id)}
                          className={`w-10 h-5 rounded-full transition-colors ${
                            trader.enabled ? 'bg-terminal-amber' : 'bg-terminal-border'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full transition-transform ${
                            trader.enabled ? 'translate-x-5 bg-yellow-900' : 'translate-x-0.5 bg-white'
                          }`} />
                        </button>

                        <button
                          onClick={() => trader.id && removeTrader(trader.id)}
                          className="p-1.5 text-gray-500 hover:text-terminal-down hover:bg-terminal-down/10 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Price Alerts */}
          {activeSection === 'alerts' && (
            <div>
              <h2 className="text-white text-lg font-medium mb-1">Price Alerts</h2>
              <p className="text-gray-500 text-sm mb-6">Set alerts for price movements</p>

              {/* Add New Alert Form */}
              <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 mb-6">
                <h3 className="text-white text-sm font-medium mb-4">Add Alert</h3>

                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Symbol (e.g., AAPL)"
                    value={newAlertSymbol}
                    onChange={(e) => setNewAlertSymbol(e.target.value.toUpperCase())}
                    className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-white placeholder:text-gray-600 font-mono"
                  />

                  <div className="flex gap-2">
                    {(['above', 'below', 'percent_up', 'percent_down'] as const).map(condition => (
                      <button
                        key={condition}
                        onClick={() => setNewAlertCondition(condition)}
                        className={`flex-1 py-2 px-3 rounded text-sm transition-colors ${
                          newAlertCondition === condition
                            ? 'bg-terminal-amber/20 text-terminal-amber border border-terminal-amber'
                            : 'bg-terminal-border text-gray-400 border border-transparent'
                        }`}
                      >
                        {condition === 'above' ? 'Above' : condition === 'below' ? 'Below' : condition === 'percent_up' ? '+%' : '-%'}
                      </button>
                    ))}
                  </div>

                  <input
                    type="number"
                    placeholder={newAlertCondition.startsWith('percent') ? 'Percent (e.g., 5)' : 'Price (e.g., 150.00)'}
                    value={newAlertValue}
                    onChange={(e) => setNewAlertValue(e.target.value)}
                    className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-white placeholder:text-gray-600 font-mono"
                  />

                  <button
                    onClick={async () => {
                      if (newAlertSymbol && newAlertValue) {
                        await addAlert({
                          symbol: newAlertSymbol,
                          condition: newAlertCondition,
                          value: parseFloat(newAlertValue),
                        })
                        setNewAlertSymbol('')
                        setNewAlertValue('')
                      }
                    }}
                    disabled={!newAlertSymbol || !newAlertValue}
                    className="w-full py-2 bg-terminal-amber text-black font-medium rounded text-sm hover:bg-terminal-amber/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Alert
                  </button>
                </div>
              </div>

              {/* Alerts List */}
              {alerts.length === 0 ? (
                <div className="text-gray-500 text-sm p-8 text-center border border-dashed border-terminal-border rounded-lg">
                  No alerts set.
                  <br />
                  <span className="text-gray-600 text-xs">Add price alerts above to get notified</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.map(alert => (
                    <div
                      key={alert.id}
                      className={`flex items-center justify-between p-3 border rounded-lg ${
                        alert.triggered
                          ? 'bg-terminal-amber/10 border-terminal-amber'
                          : 'bg-terminal-panel border-terminal-border'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Bell className={`w-4 h-4 ${alert.triggered ? 'text-terminal-amber' : 'text-gray-500'}`} />
                        <div>
                          <p className="text-white text-sm font-mono">
                            {alert.symbol}
                            <span className="text-gray-500 mx-2">
                              {alert.condition === 'above' ? '>' : alert.condition === 'below' ? '<' : alert.condition === 'percent_up' ? '+' : '-'}
                            </span>
                            <span className={alert.condition.startsWith('percent') ? 'text-blue-400' : 'text-terminal-amber'}>
                              {alert.condition.startsWith('percent') ? `${alert.value}%` : `$${alert.value.toFixed(2)}`}
                            </span>
                          </p>
                          <p className="text-gray-500 text-xs">
                            {alert.triggered ? 'Triggered' : 'Active'} • Created {new Date(alert.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => alert.id && removeAlert(alert.id)}
                        className="p-1.5 text-gray-500 hover:text-terminal-down hover:bg-terminal-down/10 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {saving && (
            <div className="fixed bottom-4 right-4 bg-terminal-amber text-black px-4 py-2 rounded-lg text-sm">
              Saving...
            </div>
          )}
        </div>
      </div>

      {/* Onboarding Wizard */}
      <OnboardingWizard
        isOpen={showOnboardingWizard}
        onClose={() => setShowOnboardingWizard(false)}
      />
    </div>
  )
}
