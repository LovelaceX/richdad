import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, BookOpen, Zap, BarChart3, Keyboard, HelpCircle, Shield, FileText, Mail,
  Search, Gauge, AlertTriangle, Database, TrendingUp, Bell, Eye, Check, ExternalLink, Bug, Sparkles, Activity,
  Crown, Leaf, Heart, ClipboardCheck, Square, CheckSquare, Settings,
  BarChart2, Target, Microscope
} from 'lucide-react'
import { openUrl } from '@tauri-apps/plugin-opener'

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
  initialSection?: string
}

type Section =
  | 'get-started'
  | 'verify-setup'
  | 'whats-new'
  | 'tiers'
  | 'dashboard'
  | 'watchlist'
  | 'news'
  | 'intel-panel'
  | 'price-alerts'
  | 'chart-guide'
  | 'settings-guide'
  | 'ai-copilot'
  | 'ollama-setup'
  | 'api-limits'
  | 'shortcuts'
  | 'troubleshooting'
  | 'faq'
  | 'terms'
  | 'privacy'
  | 'security'
  | 'about'
  | 'report-issue'
  | 'support'

// Searchable content for each section - includes all important words and phrases
const sectionContent: Record<Section, { title: string; searchableText: string }> = {
  'get-started': {
    title: 'Get Started',
    searchableText: 'setup api key configure begin first install openai claude gemini grok deepseek llama groq settings dashboard news watchlist price alerts chart controls keyboard shortcuts api limits troubleshooting quick links step by step guide free account paste copy tiingo'
  },
  'verify-setup': {
    title: 'Verify Your Setup',
    searchableText: 'verify check test working setup complete checklist confirmation api key data news ai sentiment market prices onboarding validate confirm everything working chart loading prices updating news scrolling ai responding'
  },
  'whats-new': {
    title: "What's New",
    searchableText: 'new features update release latest backtest macd stochastic indicators v7.0.0 v6.1.0 v6.0.0 v5.5.2 v5.5.1 v5.5.0 v5.2.0 v5.1.0 v5.0.0 local-first ai ollama sentiment keywords privacy huggingface removed cloud ai removed simplified architecture stability fixes ai copilot crash react error 185 ticker speed websocket status tiingo service health rate limit overhaul error log api key encryption watchlist news lru cache websocket reconnect jitter data freshness badges hover tooltips request cancellation loading state error state empty state race condition vti smh vxx market indices type safe event system crash isolation ai copilot backtesting historical data win rate profit factor sharpe ratio csv export technical indicator panels momentum trend direction rsi oscillator volume profile'
  },
  'tiers': {
    title: 'Pricing Tiers',
    searchableText: 'tier tiers free pro pricing cost plan subscription upgrade downgrade tiingo groq openai claude anthropic intraday data market history real-time rss news sources ai provider llama gpt-4 budget calls per hour historical backtest'
  },
  'dashboard': {
    title: 'Dashboard',
    searchableText: 'home main overview layout panels chart watchlist news ticker ai panel market data live prices real-time trading view candlestick technical analysis top bar navigation sidebar default index spy qqq dia iwm vti smh vxx startup launch open'
  },
  'watchlist': {
    title: 'Watchlist',
    searchableText: 'market watch stocks symbols add remove track ticker price change percent volume favorite save delete edit search filter sort'
  },
  'news': {
    title: 'Market News',
    searchableText: 'headlines feed sentiment filter rss sources breaking news articles positive negative neutral bullish bearish market sentiment analysis ticker relevance ollama ai keywords fallback headline limit news sources'
  },
  'intel-panel': {
    title: 'Intelligence Panel',
    searchableText: 'intel pattern scanner news sentiment breaking alerts bullish bearish setup engulfing doji hammer shooting star morning star evening star three white soldiers technical patterns candlestick patterns chart patterns automatic pattern scan auto scan manual scan api calls per symbol watchlist scan 15 minutes free tier paid tier tiingo starter power'
  },
  'price-alerts': {
    title: 'Price Alerts',
    searchableText: 'notification alert trigger above below target price stop loss take profit sound notification push alert email sms crosses reaches hits'
  },
  'chart-guide': {
    title: 'Chart Controls',
    searchableText: 'candlestick timeframe zoom pan daily intraday weekly monthly 1 minute 5 minute 15 minute 1 hour 4 hour drawing tools trendline support resistance fibonacci moving average bollinger bands volume indicator overlay'
  },
  'settings-guide': {
    title: 'Settings Guide',
    searchableText: 'settings configuration preferences my profile portfolio display risk management ai copilot market data news sources activity log notifications price alerts danger zone trading style experience level cash balance position size stop loss kelly criterion zoom ticker speed cvd mode color vision api key provider tier rss feed ollama sentiment sound volume reset clear cache factory reset export backup'
  },
  'ai-copilot': {
    title: 'AI Copilot',
    searchableText: 'ollama local ai recommendation chat provider thinking animation phases rss news buy sell hold confidence technical analysis sentiment market regime risk management position size stop loss take profit price target rationale explanation ai analysis automatic manual trigger chat interface conversation history performance tracking win rate accuracy batting average outcome win loss neutral executed skipped 30 days monitoring persona personality sterling analyst jax veteran trader cipher tech wiz formal professional direct pragmatic energetic nerdy calm philosophical patient communication style voice character traits'
  },
  'ollama-setup': {
    title: 'Ollama Setup Guide',
    searchableText: 'ollama local ai install download setup configure run free private offline model llama mistral codellama phi neural chat localhost port 11434 pull serve terminal command line homebrew macos windows docker no api key unlimited requests privacy on device machine learning inference'
  },
  'api-limits': {
    title: 'API Limits & Usage',
    searchableText: 'rate limit quota calls hourly budget tiingo fallback free tier pro 50 tickers per hour 5000 tickers per hour usage tracking budget warning exceeded throttle'
  },
  'shortcuts': {
    title: 'Keyboard Shortcuts',
    searchableText: 'hotkey cmd ctrl key command control alt shift meta keyboard navigation dashboard news settings backtest zoom in zoom out reset new window find search focus'
  },
  'troubleshooting': {
    title: 'Troubleshooting',
    searchableText: 'error fix problem not working issue help debug crash freeze slow loading blank screen no data connection failed timeout api error rate limit exceeded invalid key authentication failed network error clear cache reset refresh restart reinstall activity log service health data freshness stale cached fresh live news sentiment keywords ollama verify api key'
  },
  'faq': {
    title: 'FAQ',
    searchableText: 'question answer common frequently asked questions how do i what is why does can i should i when will how to onboarding wizard first launch rate limit win rate batting average outcome win loss neutral skipped executed performance tracking 30 days monitoring'
  },
  'terms': {
    title: 'Terms of Service',
    searchableText: 'legal tos agreement terms conditions acceptance investment disclaimer risk acknowledgment limitation liability license updates changes api keys privacy trading software warranty financial advice educational purposes'
  },
  'privacy': {
    title: 'Privacy Policy',
    searchableText: 'data collection storage local first indexeddb no cloud no server no tracking no ads no telemetry privacy promise your data stays on your machine'
  },
  'security': {
    title: 'Security',
    searchableText: 'safe key protection encryption encrypted secure api key keychain local storage aes-256 web crypto api session storage never transmitted secure storage password protect secrets credentials'
  },
  'about': {
    title: 'About RichDad',
    searchableText: 'version developer contact lovelacex trading intelligence tauri react typescript mit license open source desktop application'
  },
  'report-issue': {
    title: 'Report Issue',
    searchableText: 'bug problem feedback github issue report feature request enhancement suggestion error message screenshot steps to reproduce expected behavior actual behavior'
  },
  'support': {
    title: 'Support Development',
    searchableText: 'tip donate support developer lovelacex paypal contribution thank you appreciation funding open source free software'
  },
}

// Setup Verification Checklist types and defaults
interface SetupChecklist {
  marketData: {
    chartLoads: boolean
    pricesUpdate: boolean
    dataSourceVisible: boolean
  }
  news: {
    tickerScrolling: boolean
    sentimentColors: boolean
  }
  aiCopilot: {
    ollamaRunning: boolean
    personaSelected: boolean
    chatResponds: boolean
    analyzeWorks: boolean
    recommendationsAppear: boolean
  }
}

const defaultChecklist: SetupChecklist = {
  marketData: {
    chartLoads: false,
    pricesUpdate: false,
    dataSourceVisible: false
  },
  news: {
    tickerScrolling: false,
    sentimentColors: false
  },
  aiCopilot: {
    ollamaRunning: false,
    personaSelected: false,
    chatResponds: false,
    analyzeWorks: false,
    recommendationsAppear: false
  }
}

const CHECKLIST_STORAGE_KEY = 'richdad-setup-checklist'

export function HelpModal({ isOpen, onClose, initialSection }: HelpModalProps) {
  const [activeSection, setActiveSection] = useState<Section>((initialSection as Section) || 'get-started')
  const [searchQuery, setSearchQuery] = useState('')

  // Update section when initialSection changes
  useEffect(() => {
    if (initialSection && isOpen) {
      setActiveSection(initialSection as Section)
    }
  }, [initialSection, isOpen])

  const sections: { id: Section; label: string; icon: any }[] = [
    { id: 'get-started', label: 'Get Started', icon: BookOpen },
    { id: 'verify-setup', label: 'Verify Setup', icon: ClipboardCheck },
    { id: 'whats-new', label: "What's New", icon: Sparkles },
    { id: 'tiers', label: 'Pricing Tiers', icon: Crown },
    { id: 'dashboard', label: 'Dashboard', icon: Eye },
    { id: 'watchlist', label: 'Watchlist', icon: TrendingUp },
    { id: 'news', label: 'Market News', icon: FileText },
    { id: 'intel-panel', label: 'Intelligence Panel', icon: Activity },
    { id: 'price-alerts', label: 'Price Alerts', icon: Bell },
    { id: 'chart-guide', label: 'Chart Controls', icon: BarChart3 },
    { id: 'settings-guide', label: 'Settings Guide', icon: Settings },
    { id: 'ai-copilot', label: 'AI Copilot', icon: Zap },
    { id: 'ollama-setup', label: 'Ollama Setup', icon: Database },
    { id: 'api-limits', label: 'API Limits & Usage', icon: Gauge },
    { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
    { id: 'troubleshooting', label: 'Troubleshooting', icon: AlertTriangle },
    { id: 'report-issue', label: 'Report Issue', icon: Bug },
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
    { id: 'terms', label: 'Terms of Service', icon: FileText },
    { id: 'privacy', label: 'Privacy Policy', icon: Shield },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'about', label: 'About', icon: Mail },
    { id: 'support', label: 'Support Us', icon: Heart },
  ]

  // Filter sections based on search - searches title, label, and full content text
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections
    const query = searchQuery.toLowerCase().trim()
    // Split query into words for better matching (e.g., "buy call" matches "buy call")
    const queryWords = query.split(/\s+/)
    return sections.filter(section => {
      const content = sectionContent[section.id]
      const searchText = `${content.title} ${section.label} ${content.searchableText}`.toLowerCase()
      // Match if ALL query words are found (for multi-word searches like "buy call")
      return queryWords.every(word => searchText.includes(word))
    })
  }, [searchQuery, sections])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-terminal-panel border border-terminal-border rounded-lg shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-terminal-border">
            <div className="flex items-center gap-3">
              <BookOpen size={22} className="text-terminal-amber" />
              <h2 className="text-white text-lg font-semibold">Reference Guide</h2>
              <span className="text-gray-500 text-sm">v7.0.0</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-terminal-border rounded transition-colors"
            >
              <X size={18} className="text-gray-400 hover:text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 border-r border-terminal-border bg-terminal-bg p-4 overflow-y-auto">
              {/* Search */}
              <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full bg-terminal-panel border border-terminal-border rounded-lg pl-9 pr-8 py-2 text-white placeholder-gray-500 text-xs focus:border-terminal-amber focus:outline-none"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="space-y-1">
                {filteredSections.map(section => {
                  const Icon = section.icon
                  return (
                    <button
                      key={section.id}
                      onClick={() => {
                        setActiveSection(section.id)
                        setSearchQuery('')
                      }}
                      className={`
                        w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-colors
                        ${activeSection === section.id
                          ? 'bg-terminal-amber/10 text-terminal-amber border border-terminal-amber/30'
                          : 'text-gray-400 hover:bg-terminal-border hover:text-white'
                        }
                      `}
                    >
                      <Icon size={16} />
                      <span className="text-sm">{section.label}</span>
                    </button>
                  )
                })}
                {filteredSections.length === 0 && (
                  <p className="text-gray-500 text-sm px-4 py-2">No results found</p>
                )}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8">
              <HelpContent section={activeSection} onNavigate={setActiveSection} />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

interface HelpContentProps {
  section: Section
  onNavigate: (section: Section) => void
}

function HelpContent({ section, onNavigate }: HelpContentProps) {
  // Setup verification checklist state (persisted to localStorage)
  const [checklist, setChecklist] = useState<SetupChecklist>(() => {
    try {
      const saved = localStorage.getItem(CHECKLIST_STORAGE_KEY)
      return saved ? JSON.parse(saved) : defaultChecklist
    } catch {
      return defaultChecklist
    }
  })

  // Save checklist to localStorage on change
  useEffect(() => {
    localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(checklist))
  }, [checklist])

  // Toggle checklist item
  const toggleChecklistItem = (sectionKey: keyof SetupChecklist, item: string) => {
    setChecklist(prev => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        [item]: !prev[sectionKey][item as keyof typeof prev[typeof sectionKey]]
      }
    }))
  }

  // Reset checklist
  const resetChecklist = () => {
    setChecklist(defaultChecklist)
    localStorage.removeItem(CHECKLIST_STORAGE_KEY)
  }

  // Count helpers
  const getCompletedCount = () => {
    let count = 0
    Object.values(checklist).forEach(sec => {
      Object.values(sec).forEach(value => {
        if (value) count++
      })
    })
    return count
  }

  const getTotalCount = () => {
    let count = 0
    Object.values(checklist).forEach(sec => {
      count += Object.keys(sec).length
    })
    return count
  }

  const QuickLink = ({ to, children }: { to: Section; children: React.ReactNode }) => (
    <button
      onClick={() => onNavigate(to)}
      className="text-terminal-amber hover:underline text-left"
    >
      {children}
    </button>
  )

  const SectionDivider = () => (
    <div className="border-t border-terminal-border my-8" />
  )

  const Step = ({ children }: { children: React.ReactNode }) => (
    <div className="flex items-start gap-3 py-2">
      <span className="text-terminal-amber mt-0.5">→</span>
      <span>{children}</span>
    </div>
  )

  switch (section) {
    case 'get-started':
      return (
        <div className="space-y-8">
          <div>
            <h2 className="text-terminal-amber text-2xl font-bold mb-2">Get Started</h2>
            <p className="text-gray-400">Everything you need to know to start using RichDad</p>
          </div>

          {/* Quick Links Index */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-6">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <BookOpen size={18} className="text-terminal-amber" />
              Quick Links
            </h3>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              <Step><QuickLink to="ai-copilot">Setting Up AI Copilot (Ollama)</QuickLink></Step>
              <Step><QuickLink to="dashboard">Understanding the Dashboard</QuickLink></Step>
              <Step><QuickLink to="watchlist">Managing Your Watchlist</QuickLink></Step>
              <Step><QuickLink to="news">Reading Market News</QuickLink></Step>
              <Step><QuickLink to="price-alerts">Using Price Alerts</QuickLink></Step>
              <Step><QuickLink to="chart-guide">Chart Controls & Timeframes</QuickLink></Step>
              <Step><QuickLink to="shortcuts">Keyboard Shortcuts</QuickLink></Step>
              <Step><QuickLink to="api-limits">API Limits & Usage</QuickLink></Step>
              <Step><QuickLink to="troubleshooting">Troubleshooting</QuickLink></Step>
            </div>
          </div>

          <SectionDivider />

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Step 1: Choose Your Path</h3>
            <p className="text-gray-300 mb-4">Use the Setup Wizard in Settings → API Keys to get started quickly.</p>

            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5 space-y-4">
              <div>
                <p className="text-green-400 font-medium mb-2 flex items-center gap-2">
                  <Leaf size={16} />
                  Free Path ($0/month)
                </p>
                <Step><span className="text-white">Tiingo Starter</span> - 50 tickers/hour free tier</Step>
                <Step><span className="text-white">Ollama (Local AI)</span> - Free, runs on your computer</Step>
                <Step>RSS news feeds included</Step>
              </div>

              <div className="border-t border-terminal-border pt-4">
                <p className="text-terminal-amber font-medium mb-2 flex items-center gap-2">
                  <Crown size={16} />
                  Pro Path (More Data)
                </p>
                <Step><span className="text-white">Tiingo Power</span> - 5,000 tickers/hour ($10/mo)</Step>
                <Step><span className="text-white">Same Ollama AI</span> - No API costs for AI</Step>
                <Step>Unlimited RSS feeds</Step>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Step 2: Configure Settings</h3>
            <div className="space-y-1">
              <Step>Press <kbd className="bg-terminal-border px-2 py-1 rounded text-xs mx-1">Cmd/Ctrl+3</kbd> to open Settings</Step>
              <Step>Click <span className="text-terminal-amber font-medium">Setup Wizard</span> button in API Keys section</Step>
              <Step>Follow the wizard to select your path and enter API keys</Step>
              <Step>Or manually: Navigate to <span className="text-white font-medium">API Keys</span> → enter your market data key</Step>
              <Step>Then: Navigate to <span className="text-white font-medium">AI Copilot</span> → verify Ollama is running</Step>
              <Step>Settings auto-save when changed</Step>
            </div>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Step 3: Start Using RichDad</h3>
            <div className="space-y-1">
              <Step><span className="text-white font-medium">Dashboard</span> (<kbd className="bg-terminal-border px-2 py-1 rounded text-xs mx-1">Cmd/Ctrl+1</kbd>): View live prices, charts, and AI recommendations</Step>
              <Step><span className="text-white font-medium">News</span> (<kbd className="bg-terminal-border px-2 py-1 rounded text-xs mx-1">Cmd/Ctrl+2</kbd>): Read latest market headlines with sentiment</Step>
              <Step><span className="text-white font-medium">AI Panel</span>: Chat with your AI copilot or wait for automatic analysis</Step>
              <Step><span className="text-white font-medium">Watchlist</span>: Track your favorite stocks in real-time</Step>
            </div>
          </div>
        </div>
      )

    case 'verify-setup': {
      const completedCount = getCompletedCount()
      const totalCount = getTotalCount()
      const isAllComplete = completedCount === totalCount

      // Checklist item component
      const ChecklistItem = ({
        id,
        sectionKey,
        title,
        hint,
        checked
      }: {
        id: string
        sectionKey: keyof SetupChecklist
        title: string
        hint: string
        checked: boolean
      }) => (
        <div
          className="flex items-start gap-3 py-2 cursor-pointer group"
          onClick={() => toggleChecklistItem(sectionKey, id)}
        >
          {checked ? (
            <CheckSquare className="w-5 h-5 text-terminal-up flex-shrink-0" />
          ) : (
            <Square className="w-5 h-5 text-gray-500 group-hover:text-gray-400 flex-shrink-0" />
          )}
          <div>
            <p className={`text-sm ${checked ? 'text-terminal-up line-through' : 'text-white'}`}>
              {title}
            </p>
            <p className="text-gray-500 text-xs">{hint}</p>
          </div>
        </div>
      )

      // Section header component
      const SectionLabel = ({ label }: { label: string }) => (
        <div className="mt-6 mb-3">
          <p className="text-gray-400 text-xs font-semibold tracking-wider uppercase">{label}</p>
          <div className="border-b border-terminal-border mt-1" />
        </div>
      )

      return (
        <div className="space-y-6">
          <div>
            <h2 className="text-terminal-amber text-2xl font-bold mb-2">Verify Your Setup</h2>
            <p className="text-gray-400">Use this checklist to confirm everything is working correctly</p>
          </div>

          {/* Progress Counter */}
          <div className={`rounded-lg p-4 ${isAllComplete ? 'bg-terminal-up/20 border border-terminal-up/30' : 'bg-terminal-bg border border-terminal-border'}`}>
            {/* Progress dots */}
            <div className="flex gap-1.5 mb-2">
              {Array.from({ length: totalCount }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    i < completedCount ? 'bg-terminal-up' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
            {/* Counter text */}
            <p className={`text-sm font-medium ${isAllComplete ? 'text-terminal-up' : 'text-white'}`}>
              {isAllComplete
                ? `✓ ${completedCount} of ${totalCount} completed — Setup Complete!`
                : `${completedCount} of ${totalCount} completed`}
            </p>
            {isAllComplete && (
              <p className="text-gray-400 text-xs mt-1">All checks passed. RichDad is ready to use.</p>
            )}
          </div>

          {/* Market Data Section */}
          <div>
            <SectionLabel label="Market Data" />
            <div className="space-y-1">
              <ChecklistItem
                id="chartLoads"
                sectionKey="marketData"
                title="Chart is loading"
                hint="Look at main chart — candles should appear within ~5 seconds"
                checked={checklist.marketData.chartLoads}
              />
              <ChecklistItem
                id="pricesUpdate"
                sectionKey="marketData"
                title="Prices are updating"
                hint="Check watchlist for green/red colors + 'Live' or 'Fresh' badge"
                checked={checklist.marketData.pricesUpdate}
              />
              <ChecklistItem
                id="dataSourceVisible"
                sectionKey="marketData"
                title="Data source visible"
                hint="Look for 'Tiingo' badge near chart"
                checked={checklist.marketData.dataSourceVisible}
              />
            </div>
          </div>

          {/* News Feed Section */}
          <div>
            <SectionLabel label="News Feed" />
            <div className="space-y-1">
              <ChecklistItem
                id="tickerScrolling"
                sectionKey="news"
                title="News ticker scrolling"
                hint="Headlines at bottom of screen. If empty → Settings → News Sources"
                checked={checklist.news.tickerScrolling}
              />
              <ChecklistItem
                id="sentimentColors"
                sectionKey="news"
                title="Sentiment colors appear"
                hint="Click News panel to see green/red/gray indicators per headline"
                checked={checklist.news.sentimentColors}
              />
            </div>
          </div>

          {/* AI Copilot Section */}
          <div>
            <SectionLabel label="AI Copilot" />
            <div className="space-y-1">
              <ChecklistItem
                id="ollamaRunning"
                sectionKey="aiCopilot"
                title="Ollama is running"
                hint="Settings → AI Copilot should show green 'Running' status"
                checked={checklist.aiCopilot.ollamaRunning}
              />
              <ChecklistItem
                id="personaSelected"
                sectionKey="aiCopilot"
                title="AI persona selected"
                hint="Choose Jax, Sterling, or Cipher in Settings → AI Copilot"
                checked={checklist.aiCopilot.personaSelected}
              />
              <ChecklistItem
                id="chatResponds"
                sectionKey="aiCopilot"
                title="AI chat responds"
                hint="Type 'Hello' in AI Panel, wait for response"
                checked={checklist.aiCopilot.chatResponds}
              />
              <ChecklistItem
                id="analyzeWorks"
                sectionKey="aiCopilot"
                title="Analyze shows progress"
                hint="Click analyze icon, watch 6-step progress animation"
                checked={checklist.aiCopilot.analyzeWorks}
              />
              <ChecklistItem
                id="recommendationsAppear"
                sectionKey="aiCopilot"
                title="Recommendations appear"
                hint="BUY/SELL/HOLD with confidence %. Check Activity Log if not"
                checked={checklist.aiCopilot.recommendationsAppear}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-terminal-border">
            <p className="text-gray-500 text-xs">
              {isAllComplete ? 'You\'re all set!' : 'Click items to mark them complete'}
            </p>
            <button
              onClick={resetChecklist}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Reset Checklist
            </button>
          </div>
        </div>
      )
    }

    case 'whats-new':
      return (
        <div className="space-y-8">
          <div>
            <h2 className="text-terminal-amber text-2xl font-bold mb-2">What's New</h2>
            <p className="text-gray-400">Latest features and improvements in RichDad</p>
          </div>

          {/* Feature List */}
          <div className="space-y-6">
            {/* v8.1.0 */}
            <div className="bg-terminal-bg border border-green-500/30 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded">v8.1.0</span>
                <h3 className="text-white font-semibold">On-Demand AI Analysis</h3>
              </div>
              <p className="text-gray-300 text-sm mb-3">
                AI can now analyze any stock, not just your watchlist. Full technical analysis on demand.
              </p>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• <span className="text-terminal-up">New</span> Analyze any ticker - Tiingo data fetched on-demand</li>
                <li>• <span className="text-terminal-up">New</span> Full technicals for non-watchlist stocks (RSI, MACD, Bollinger, ATR)</li>
                <li>• <span className="text-terminal-up">New</span> Budget-aware - respects API limits (50/hr free, 5K/hr pro)</li>
                <li>• <span className="text-terminal-up">New</span> Dynamic benchmark - relative strength uses your selected market index</li>
                <li>• <span className="text-blue-400">Improved</span> Historical queries use free web search (not API budget)</li>
              </ul>
            </div>

            {/* v7.0.0 */}
            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded">v7.0.0</span>
                <h3 className="text-white font-semibold">Local-First AI</h3>
              </div>
              <p className="text-gray-300 text-sm mb-3">
                100% local, 100% free, 100% private. No external APIs needed for AI features.
              </p>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• <span className="text-terminal-up">New</span> Simplified Sentiment - Ollama AI + keyword fallback</li>
                <li>• <span className="text-red-400">Removed</span> HuggingFace API dependency</li>
                <li>• <span className="text-red-400">Removed</span> Cloud AI APIs (OpenAI, Claude, Groq)</li>
                <li>• <span className="text-terminal-up">Enhanced</span> Privacy - Headlines never leave your machine</li>
                <li>• <span className="text-terminal-up">Faster</span> Sentiment analysis with no rate limits</li>
                <li>• <span className="text-blue-400">Added</span> Performance tracking documentation</li>
              </ul>
            </div>

            {/* v6.1.0 */}
            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded">v6.1.0</span>
                <h3 className="text-white font-semibold">Simplified Architecture + Stability</h3>
              </div>
              <p className="text-gray-300 text-sm mb-3">
                Streamlined codebase with removed unused features and critical bug fixes.
              </p>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• <span className="text-red-400">Removed</span> Economic Calendar - Simplified navigation</li>
                <li>• <span className="text-red-400">Removed</span> FRED API integration - Reduced complexity</li>
                <li>• <span className="text-terminal-amber">Fixed</span> AI Copilot crash (React Error #185)</li>
                <li>• <span className="text-terminal-amber">Fixed</span> Ticker speed defaults now readable (60s)</li>
                <li>• <span className="text-terminal-amber">Fixed</span> Filter logic bug in news watchlist filtering</li>
                <li>• <span className="text-blue-400">Improved</span> Service Health indicators</li>
                <li>• Simplified data provider architecture</li>
              </ul>
            </div>

            {/* v5.5.0 */}
            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded">v5.5.0</span>
                <h3 className="text-white font-semibold">Service Health & Rate Limit Overhaul</h3>
              </div>
              <p className="text-gray-300 text-sm mb-3">
                Enhanced service monitoring with real-time status indicators and toast notifications.
              </p>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• Real-time service health monitoring for all data sources</li>
                <li>• Toast notifications with contextual help links</li>
                <li>• Improved rate limit handling and error messages</li>
                <li>• Better API tier detection and guidance</li>
              </ul>
            </div>

            {/* v5.2.0 */}
            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded">v5.2.0</span>
                <h3 className="text-white font-semibold">Self-Service & Security</h3>
              </div>
              <p className="text-gray-300 text-sm mb-3">
                New error troubleshooting tools, service monitoring, and enhanced security for API keys.
              </p>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• <span className="text-terminal-amber">Error Log</span> - View and resolve errors in Settings with actionable hints</li>
                <li>• <span className="text-blue-400">Service Health</span> - Real-time status indicator for all background services</li>
                <li>• <span className="text-green-400">API Key Encryption</span> - Keys now encrypted at rest using AES-256</li>
                <li>• <span className="text-purple-400">Watchlist News</span> - News feed now filters by your watchlist symbols</li>
                <li>• LRU cache limits prevent memory leaks in long sessions</li>
                <li>• WebSocket reconnect with jitter for better reliability</li>
              </ul>
              <p className="text-gray-500 text-xs mt-3">Access Error Log: Settings → Error Log</p>
            </div>

            {/* v5.1.0 */}
            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded">v5.1.0</span>
                <h3 className="text-white font-semibold">UX Polish Sprint</h3>
              </div>
              <p className="text-gray-300 text-sm mb-3">
                User experience improvements with data freshness visibility and reusable components.
              </p>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• Data freshness badges on watchlist items (green/yellow/red indicators)</li>
                <li>• Hover tooltips showing "Updated Xm ago" for each price</li>
                <li>• Request cancellation for rapid ticker switching</li>
                <li>• Reusable LoadingState, ErrorState, EmptyState components</li>
                <li>• Reduced wasted API calls during fast navigation</li>
              </ul>
            </div>

            {/* v5.0.0 */}
            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded">v5.0.0</span>
                <h3 className="text-white font-semibold">Code Quality & Reliability</h3>
              </div>
              <p className="text-gray-300 text-sm mb-3">
                Major reliability improvements with type safety enhancements and bug fixes.
              </p>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• Fixed race condition in chart loading</li>
                <li>• Added VTI, SMH, VXX to market indices selector</li>
                <li>• Dynamic Top 10 holdings based on selected market index</li>
                <li>• Type-safe event system (12 discriminated union types)</li>
                <li>• Better error handling with crash isolation</li>
              </ul>
            </div>

            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded">NEW</span>
                <h3 className="text-white font-semibold">AI Copilot Backtesting</h3>
              </div>
              <p className="text-gray-300 text-sm mb-3">
                Test AI recommendations against historical data to validate performance before live trading.
              </p>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• Replay historical market conditions</li>
                <li>• Track win rates, profit factor, Sharpe ratio</li>
                <li>• Generate optimization suggestions</li>
                <li>• Export results to CSV for analysis</li>
              </ul>
              <p className="text-gray-500 text-xs mt-3">Access: Press <kbd className="bg-terminal-border px-1.5 py-0.5 rounded">Cmd/Ctrl+4</kbd> or navigate to Backtest</p>
            </div>

            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded">NEW</span>
                <h3 className="text-white font-semibold">Technical Indicator Panels</h3>
              </div>
              <p className="text-gray-300 text-sm mb-3">
                Stackable indicator panels below the main chart for advanced analysis.
              </p>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• <span className="text-blue-400">MACD</span> - Momentum and trend direction</li>
                <li>• Synchronized crosshair with main chart</li>
                <li>• Toggle visibility via chart header</li>
              </ul>
            </div>

            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded">IMPROVED</span>
                <h3 className="text-white font-semibold">Data Source Transparency</h3>
              </div>
              <p className="text-gray-300 text-sm mb-3">
                See exactly where your chart data comes from with the new provider indicator.
              </p>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• Provider badge shows data source (Tiingo)</li>
                <li>• Timestamp shows when data was last refreshed</li>
                <li>• Delay indicator for free tier data (15-min)</li>
                <li>• Hover for detailed source info</li>
              </ul>
            </div>

            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded">NEW</span>
                <h3 className="text-white font-semibold">Intelligence Panel</h3>
              </div>
              <p className="text-gray-300 text-sm mb-3">
                Real-time market intelligence from automated background agents.
              </p>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• <span className="text-blue-400">News Intel</span> - Sentiment analysis across watchlist</li>
                <li>• <span className="text-purple-400">Pattern Scanner</span> - Detects candlestick patterns automatically</li>
                <li>• Breaking news alerts and velocity spike detection</li>
                <li>• Urgency indicators (High/Medium/Low)</li>
              </ul>
            </div>

            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded">NEW</span>
                <h3 className="text-white font-semibold">Universal API Budget System</h3>
              </div>
              <p className="text-gray-300 text-sm mb-3">
                Transparent API usage tracking across all providers with tier-aware limits.
              </p>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• Select your tier (Free/Paid) for each provider in Settings</li>
                <li>• Budget meter shows hourly usage for Tiingo</li>
                <li>• Toast notifications when limits are reached</li>
                <li>• Automatic fallback to cached or mock data</li>
              </ul>
            </div>

            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded">NEW</span>
                <h3 className="text-white font-semibold">Market View Selector</h3>
              </div>
              <p className="text-gray-300 text-sm mb-3">
                Quick switch between major market indices from the top bar.
              </p>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• S&P 500 (SPY), NASDAQ-100 (QQQ), Dow Jones (DIA), Russell 2000 (IWM)</li>
                <li>• Dashboard chart updates to selected market ETF</li>
                <li>• AI context adapts to selected market</li>
              </ul>
            </div>

            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded">NEW</span>
                <h3 className="text-white font-semibold">Options-Aware AI</h3>
              </div>
              <p className="text-gray-300 text-sm mb-3">
                AI recommendations can now include options trading suggestions.
              </p>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• Enable in Settings → AI Copilot → Include Options Suggestions</li>
                <li>• High-confidence BUY → "BUY (or Buy Call for leverage)"</li>
                <li>• High-confidence SELL → "SELL (or Buy Put for protection)"</li>
              </ul>
            </div>
          </div>
        </div>
      )

    case 'dashboard':
      return (
        <div className="space-y-8">
          <div>
            <h2 className="text-terminal-amber text-2xl font-bold mb-2">Dashboard</h2>
            <p className="text-gray-400">Your trading command center</p>
          </div>

          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white font-semibold mb-4">Layout Overview</h3>
            <div className="space-y-3 text-gray-300 text-sm">
              <div className="flex gap-4">
                <span className="text-terminal-amber w-24 flex-shrink-0">Top Bar</span>
                <span>Market indices, search, profile, settings</span>
              </div>
              <div className="flex gap-4">
                <span className="text-terminal-amber w-24 flex-shrink-0">Left Panel</span>
                <span>Watchlist with live prices</span>
              </div>
              <div className="flex gap-4">
                <span className="text-terminal-amber w-24 flex-shrink-0">Center</span>
                <span>Chart with timeframe controls</span>
              </div>
              <div className="flex gap-4">
                <span className="text-terminal-amber w-24 flex-shrink-0">Right Panel</span>
                <span>AI Copilot and recommendations</span>
              </div>
              <div className="flex gap-4">
                <span className="text-terminal-amber w-24 flex-shrink-0">Bottom</span>
                <span>News ticker with headlines</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Market Overview Bar</h3>
            <p className="text-gray-300 mb-3">The top bar displays key market indices:</p>
            <div className="space-y-1">
              <Step><span className="text-white font-medium">S&P 500 (SPY)</span> - Broad market benchmark</Step>
              <Step><span className="text-white font-medium">NASDAQ (QQQ)</span> - Tech-heavy index</Step>
              <Step><span className="text-white font-medium">Russell 2000 (IWM)</span> - Small-cap stocks</Step>
              <Step><span className="text-white font-medium">Total Market (VTI)</span> - Full US market exposure</Step>
              <Step><span className="text-white font-medium">Semiconductors (SMH)</span> - Chip sector ETF</Step>
              <Step><span className="text-white font-medium">VIX (VXX)</span> - Volatility tracker</Step>
              <Step><span className="text-white font-medium">AI Win Rate</span> - Your AI's performance record</Step>
            </div>
          </div>

          <div className="bg-terminal-amber/10 border border-terminal-amber/30 rounded-lg p-5">
            <h3 className="text-terminal-amber font-semibold mb-4 flex items-center gap-2">
              <BarChart3 size={18} />
              Default Index
            </h3>
            <p className="text-gray-300 mb-3">
              Choose which market index loads when you open RichDad. This sets your primary chart and watchlist constituents.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex gap-2 items-start">
                <span className="text-terminal-amber">→</span>
                <span className="text-gray-300">Go to <span className="text-white font-medium">Settings → Display → Default Index</span></span>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-terminal-amber">→</span>
                <span className="text-gray-300">Select from: SPY, QQQ, DIA, IWM, VTI, SMH, or VXX</span>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-terminal-amber">→</span>
                <span className="text-gray-300">Your chart and Market Watch update immediately</span>
              </div>
            </div>
            <p className="text-gray-500 text-xs mt-3">
              Default: S&P 500 (SPY). Change this to focus on tech (QQQ), small caps (IWM), or volatility (VXX).
            </p>
          </div>
        </div>
      )

    case 'watchlist':
      return (
        <div className="space-y-8">
          <div>
            <h2 className="text-terminal-amber text-2xl font-bold mb-2">Watchlist</h2>
            <p className="text-gray-400">Track your favorite stocks in real-time</p>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Adding Stocks</h3>
            <div className="space-y-1">
              <Step>Click the <span className="text-terminal-amber font-medium">+</span> button in the Market Watch header</Step>
              <Step>Type a stock symbol (e.g., AAPL) or company name</Step>
              <Step>Select from autocomplete suggestions (S&P 500 + news tickers)</Step>
              <Step>Press Enter or click <span className="text-terminal-amber">Add</span></Step>
            </div>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Removing Stocks</h3>
            <div className="space-y-1">
              <Step>Hover over any stock in your watchlist</Step>
              <Step>Click the <span className="text-red-400">X</span> button that appears on hover</Step>
            </div>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Viewing Charts</h3>
            <div className="space-y-1">
              <Step>Click any symbol in your watchlist</Step>
              <Step>The main chart updates to show that stock</Step>
              <Step>Selected stock is highlighted in the watchlist</Step>
            </div>
          </div>

          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white font-semibold mb-3">Data Display</h3>
            <div className="space-y-2 text-gray-300 text-sm">
              <div className="flex gap-4">
                <span className="text-terminal-amber w-20">Symbol</span>
                <span>Stock ticker</span>
              </div>
              <div className="flex gap-4">
                <span className="text-terminal-amber w-20">Price</span>
                <span>Current price (cached 1 hour)</span>
              </div>
              <div className="flex gap-4">
                <span className="text-terminal-amber w-20">Change</span>
                <span>Dollar change from previous close</span>
              </div>
              <div className="flex gap-4">
                <span className="text-terminal-amber w-20">% Change</span>
                <span>Percentage change (green/red)</span>
              </div>
            </div>
          </div>
        </div>
      )

    case 'news':
      return (
        <div className="space-y-8">
          <div>
            <h2 className="text-terminal-amber text-2xl font-bold mb-2">Market News</h2>
            <p className="text-gray-400">Stay informed with real-time market headlines</p>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">News Sources</h3>
            <div className="space-y-1">
              <Step><span className="text-white font-medium">RSS Feeds</span> - Free, unlimited (CNBC, MarketWatch, Bloomberg, etc.)</Step>
            </div>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Filtering News</h3>
            <p className="text-gray-300 mb-3">Use the filter buttons next to the funnel icon:</p>
            <div className="space-y-1">
              <Step><span className="text-white font-medium">All</span> - Show all headlines</Step>
              <Step><span className="text-white font-medium">Watchlist</span> - Headlines mentioning tickers in your watchlist</Step>
              <Step><span className="text-terminal-up font-medium">Positive</span> - Bullish sentiment</Step>
              <Step><span className="text-terminal-down font-medium">Negative</span> - Bearish sentiment</Step>
              <Step><span className="text-gray-400 font-medium">Neutral</span> - Neutral sentiment</Step>
            </div>
            <p className="text-gray-500 text-xs mt-3">
              Watchlist matching: RichDad extracts ticker symbols from headlines (e.g., $AAPL, TSLA) and matches them against your watchlist.
            </p>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Sentiment Analysis</h3>
            <p className="text-gray-300 mb-3">Headlines are analyzed for market sentiment using a three-tier system:</p>
            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5 space-y-3">
              <div className="flex items-center gap-3">
                <TrendingUp size={16} className="text-terminal-up" />
                <span className="text-gray-300">Positive - Bullish news, earnings beats, upgrades</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-0.5 bg-gray-500"></div>
                <span className="text-gray-300">Neutral - Informational, no clear direction</span>
              </div>
              <div className="flex items-center gap-3">
                <TrendingUp size={16} className="text-terminal-down rotate-180" />
                <span className="text-gray-300">Negative - Bearish news, misses, downgrades</span>
              </div>
            </div>
          </div>

          {/* Sentiment Fallback Chain */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-5">
            <h3 className="text-blue-400 font-semibold mb-3">How Sentiment Works</h3>
            <p className="text-gray-300 text-sm mb-3">
              RichDad uses a two-tier local system for sentiment analysis:
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <span className="text-white font-medium w-20">Primary</span>
                <span className="text-gray-400">→</span>
                <span className="text-gray-300">Ollama (local AI) - Dolphin model, 100% free</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white font-medium w-20">Fallback</span>
                <span className="text-gray-400">→</span>
                <span className="text-gray-300">Keyword matching (always works)</span>
              </div>
            </div>
            <p className="text-gray-500 text-xs mt-3">
              Works automatically. No API keys or external services needed - everything runs locally on your machine.
            </p>
          </div>

          {/* News Sources Settings */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white font-semibold mb-3">News Sources Settings</h3>
            <p className="text-gray-300 text-sm mb-3">
              Configure your news feed in Settings → News Sources:
            </p>
            <div className="space-y-1">
              <Step><span className="text-white font-medium">Headline Limit</span> - Max headlines per hour (5-50)</Step>
              <Step><span className="text-white font-medium">AI Filtering</span> - Only show news for your watchlist</Step>
              <Step><span className="text-white font-medium">RSS Feeds</span> - Select sources (Bloomberg, CNBC, etc.)</Step>
            </div>
          </div>
        </div>
      )

    case 'intel-panel':
      return (
        <div className="space-y-8">
          <div>
            <h2 className="text-terminal-amber text-2xl font-bold mb-2">Intelligence Panel</h2>
            <p className="text-gray-400">Real-time market intelligence from automated agents</p>
          </div>

          {/* News Intel */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span className="text-blue-400">News Intel</span>
            </h3>
            <p className="text-gray-300 text-sm mb-3">
              Aggregates news sentiment across your watchlist with real-time analysis.
            </p>
            <ul className="text-gray-400 text-sm space-y-1">
              <li>• <span className="text-green-400">Bullish/Bearish/Neutral</span> sentiment breakdown</li>
              <li>• <span className="text-red-400">Breaking alerts</span> for news less than 1 hour old</li>
              <li>• <span className="text-yellow-400">Velocity spikes</span> when a symbol gets unusual coverage</li>
              <li>• Symbol-by-symbol sentiment overview</li>
            </ul>
          </div>

          {/* Pattern Scanner */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span className="text-purple-400">Pattern Scanner</span>
            </h3>
            <p className="text-gray-300 text-sm mb-3">
              Scans your watchlist for candlestick patterns. Automatic scanning is disabled by default
              to conserve API calls. Use the manual scan button or enable auto-scan in Settings if you have a paid API tier.
            </p>
            <ul className="text-gray-400 text-sm space-y-1">
              <li>• Detects 18+ candlestick patterns (Engulfing, Hammer, Doji, etc.)</li>
              <li>• <span className="text-green-400">Bullish</span> and <span className="text-red-400">Bearish</span> setup tabs</li>
              <li>• Reliability scores based on historical accuracy</li>
              <li>• Volume confirmation indicators</li>
              <li>• Only runs during market hours</li>
            </ul>

            {/* API Cost Breakdown */}
            <div className="mt-4 pt-4 border-t border-terminal-border">
              <h4 className="text-terminal-amber text-sm font-medium mb-2">API Usage</h4>
              <p className="text-gray-400 text-xs mb-2">
                Pattern scanning uses <strong className="text-white">1 API call per symbol</strong>.
                Automatic scanning every 15 minutes would use 4 scans/hour.
              </p>
              <div className="bg-terminal-panel rounded p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">5 symbols × 4/hour =</span>
                  <span className="text-terminal-amber">20 calls/hour</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">15 symbols × 4/hour =</span>
                  <span className="text-red-400">60 calls/hour (exceeds free limits)</span>
                </div>
              </div>
              <p className="text-gray-500 text-xs mt-2">
                Free tier limit: Tiingo Starter 50/hour. Enable auto-scan in Settings → AI Copilot only with Power tier.
              </p>
            </div>
          </div>

          {/* Configuring News Sources */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span className="text-blue-400">Configuring News Sources</span>
            </h3>
            <p className="text-gray-300 text-sm mb-3">
              Customize which news sources appear in your feed.
            </p>
            <ol className="text-gray-400 text-sm space-y-2 list-decimal list-inside">
              <li>Go to <span className="text-terminal-amber">Settings → RSS Feeds</span></li>
              <li>Toggle sources ON/OFF to customize your feed</li>
              <li>Add custom RSS feed URLs (e.g., Yahoo Finance, Seeking Alpha)</li>
              <li>News updates every 5 minutes when Live Data is ON</li>
            </ol>
            <p className="text-gray-500 text-xs mt-3">
              Default sources include TradingView Ideas, Bloomberg, and Investing.com. All sources are free.
            </p>
          </div>

          {/* Urgency Indicators */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white font-semibold mb-3">Urgency Indicators</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-red-900/30 text-red-400 text-xs">High</span>
                <span className="text-gray-300">Breaking news or high-reliability patterns detected</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-yellow-900/30 text-yellow-400 text-xs">Medium</span>
                <span className="text-gray-300">Notable sentiment shifts or moderate setups</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-gray-900/30 text-gray-400 text-xs">Low</span>
                <span className="text-gray-300">Normal market activity</span>
              </div>
            </div>
          </div>

          {/* Data Freshness */}
          <div className="bg-terminal-amber/10 border border-terminal-amber/30 rounded-lg p-4">
            <h4 className="text-terminal-amber font-medium mb-2">Data Freshness</h4>
            <p className="text-gray-300 text-sm">
              The panel shows timestamps for last update. A <span className="text-yellow-400">"Cached"</span> badge
              appears when data is stale (news: &gt;10 min, patterns: &gt;30 min). This helps you know if you're
              viewing fresh or cached data due to API limits.
            </p>
          </div>
        </div>
      )

    case 'price-alerts':
      return (
        <div className="space-y-8">
          <div>
            <h2 className="text-terminal-amber text-2xl font-bold mb-2">Price Alerts</h2>
            <p className="text-gray-400">Get notified when stocks hit your target prices</p>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Creating Alerts</h3>
            <div className="space-y-1">
              <Step>Go to <span className="text-white font-medium">Settings</span> → <span className="text-white font-medium">Price Alerts</span></Step>
              <Step>Click <span className="text-terminal-amber">Add Alert</span></Step>
              <Step>Enter the stock symbol (e.g., AAPL)</Step>
              <Step>Choose condition: <span className="text-white">Above</span> or <span className="text-white">Below</span></Step>
              <Step>Enter your target price</Step>
              <Step>Click <span className="text-terminal-amber">Save</span></Step>
            </div>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Alert Conditions</h3>
            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5 space-y-3">
              <div className="flex gap-4">
                <span className="text-terminal-amber w-28">Above</span>
                <span className="text-gray-300">Triggers when price rises above target</span>
              </div>
              <div className="flex gap-4">
                <span className="text-terminal-amber w-28">Below</span>
                <span className="text-gray-300">Triggers when price falls below target</span>
              </div>
              <div className="flex gap-4">
                <span className="text-terminal-amber w-28">% Up</span>
                <span className="text-gray-300">Triggers on percentage gain</span>
              </div>
              <div className="flex gap-4">
                <span className="text-terminal-amber w-28">% Down</span>
                <span className="text-gray-300">Triggers on percentage drop</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">How Alerts Work</h3>
            <div className="space-y-1">
              <Step>Prices are checked every minute (with 1-hour cache)</Step>
              <Step>When triggered, you'll see a notification</Step>
              <Step>Alert is marked as "triggered" and won't fire again</Step>
              <Step>Delete triggered alerts to clean up your list</Step>
            </div>
          </div>
        </div>
      )

    case 'chart-guide':
      return (
        <div className="space-y-8">
          <div>
            <h2 className="text-terminal-amber text-2xl font-bold mb-2">Chart Controls</h2>
            <p className="text-gray-400">Master the trading chart</p>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Timeframes</h3>
            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5 space-y-3">
              <p className="text-gray-400 text-sm mb-2">Available timeframes depend on your selected symbol:</p>
              <div className="flex gap-4">
                <span className="text-terminal-amber w-24">SPY Only</span>
                <span className="text-gray-300">1M, 5M, 15M, 30M, 1H, Daily</span>
              </div>
              <div className="flex gap-4">
                <span className="text-terminal-amber w-24">Other Stocks</span>
                <span className="text-gray-300">5M, Daily (API conservation)</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Data Availability</h3>
            <div className="space-y-1">
              <Step><span className="text-white font-medium">Intraday (1M-1H)</span> - Last ~8 hours of trading</Step>
              <Step><span className="text-white font-medium">Daily</span> - Up to 2 years of history (Pro plan)</Step>
              <Step>Data is cached for 24 hours to save API calls</Step>
            </div>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Navigation</h3>
            <div className="space-y-1">
              <Step><span className="text-white font-medium">Zoom</span> - Scroll wheel or pinch gesture</Step>
              <Step><span className="text-white font-medium">Pan</span> - Click and drag left/right</Step>
              <Step><span className="text-white font-medium">Reset</span> - Double-click to reset view</Step>
            </div>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Candlestick Colors</h3>
            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-6 bg-terminal-up rounded-sm"></div>
                <span className="text-gray-300">Green - Price closed higher (bullish)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-6 bg-terminal-down rounded-sm"></div>
                <span className="text-gray-300">Red - Price closed lower (bearish)</span>
              </div>
            </div>
          </div>
        </div>
      )

    case 'settings-guide':
      return (
        <div className="space-y-8">
          <div>
            <h2 className="text-terminal-amber text-2xl font-bold mb-2">Settings Guide</h2>
            <p className="text-gray-400">Complete reference for all settings tabs</p>
          </div>

          {/* My Profile */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-terminal-amber/20 flex items-center justify-center text-terminal-amber text-xs">1</span>
              My Profile
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">Performance</span>
                <span className="text-gray-400">View your AI trading stats: batting average, win/loss record, and total trades executed.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">Export Trades</span>
                <span className="text-gray-400">Export your trade decisions to CSV or TXT. Filter by date range before exporting.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">Date Filters</span>
                <span className="text-gray-400">Select a time period to preview matching trades before export.</span>
              </div>
            </div>
          </div>

          {/* Portfolio */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-terminal-amber/20 flex items-center justify-center text-terminal-amber text-xs">2</span>
              Portfolio
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">Cash Balance</span>
                <span className="text-gray-400">Your starting capital. Used for position sizing calculations and simulated P&L.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">Watchlist</span>
                <span className="text-gray-400">Stocks you're tracking. Add symbols to monitor prices and get AI analysis.</span>
              </div>
            </div>
          </div>

          {/* Display */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-terminal-amber/20 flex items-center justify-center text-terminal-amber text-xs">3</span>
              Display
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">Interface Zoom</span>
                <span className="text-gray-400">Scale the UI from 90% to 125%. Use Cmd/Ctrl +/- to adjust quickly.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">Panel Visibility</span>
                <span className="text-gray-400">Show/hide Market Watch, Live Chart, and News Ticker panels.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">Market Symbols</span>
                <span className="text-gray-400">Customize which symbols appear in the top market overview bar.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">Ticker Speed</span>
                <span className="text-gray-400">How fast news headlines scroll (30-120 seconds per cycle).</span>
              </div>
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">CVD Mode</span>
                <span className="text-gray-400">Color Vision Deficiency mode. Uses patterns instead of red/green.</span>
              </div>
            </div>
          </div>

          {/* Risk Management */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-terminal-amber/20 flex items-center justify-center text-terminal-amber text-xs">4</span>
              Risk Management
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">Default Stop Loss</span>
                <span className="text-gray-400">Percentage below entry price for automatic stop loss suggestions.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">Max Position Size</span>
                <span className="text-gray-400">Maximum percentage of portfolio for any single trade.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">Kelly Criterion</span>
                <span className="text-gray-400">Enable mathematical position sizing based on win rate and risk/reward.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">Risk Per Trade</span>
                <span className="text-gray-400">Maximum amount you're willing to lose on a single trade.</span>
              </div>
            </div>
          </div>

          {/* AI Copilot */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-terminal-amber/20 flex items-center justify-center text-terminal-amber text-xs">5</span>
              AI Copilot
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">Provider</span>
                <span className="text-gray-400">Ollama (Local AI) - runs on your computer, free, private, uncensored.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">Model</span>
                <span className="text-gray-400">dolphin-llama3:8b - optimized for trading analysis with strong reasoning.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">Status</span>
                <span className="text-gray-400">Shows if Ollama is running and the model is installed.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">Options Language</span>
                <span className="text-gray-400">Enable to get options trading suggestions (Buy Call, Buy Put) in analysis.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">Output Format</span>
                <span className="text-gray-400">Standard (with sources), Concise (brief), or Detailed (full breakdown).</span>
              </div>
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">Show HOLDs</span>
                <span className="text-gray-400">Toggle to hide HOLD recommendations and only see BUY/SELL signals.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">AI Persona</span>
                <span className="text-gray-400">Choose your co-pilot's personality: Jax, Sterling, or Cipher.</span>
              </div>
            </div>
          </div>

          {/* Market Data */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-terminal-amber/20 flex items-center justify-center text-terminal-amber text-xs">6</span>
              Market Data (API Keys)
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">Setup Wizard</span>
                <span className="text-gray-400">Guided setup to get API keys from free providers.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">Tiingo Key</span>
                <span className="text-gray-400">Enter your Tiingo API token (signup → confirm email → click username → Token).</span>
              </div>
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">Plan Selection</span>
                <span className="text-gray-400">Select Free (Starter) or Pro (Power) tier. Affects rate limits.</span>
              </div>
            </div>
          </div>

          {/* News Sources */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-terminal-amber/20 flex items-center justify-center text-terminal-amber text-xs">7</span>
              News Sources
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">RSS Feeds</span>
                <span className="text-gray-400">Enable/disable individual news sources. Add custom RSS feeds.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">Categories</span>
                <span className="text-gray-400">Filter news by category: Stock Market, Economic, Crypto, etc.</span>
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-terminal-amber/20 flex items-center justify-center text-terminal-amber text-xs">8</span>
              Activity Log
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">Error Tracking</span>
                <span className="text-gray-400">View all errors with timestamps and actionable hints to fix them.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">Resolve/Dismiss</span>
                <span className="text-gray-400">Mark errors as resolved or dismiss them to clear the list.</span>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-terminal-amber/20 flex items-center justify-center text-terminal-amber text-xs">9</span>
              Notifications
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">Sound Effects</span>
                <span className="text-gray-400">Enable/disable notification sounds for alerts and events.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">Volume</span>
                <span className="text-gray-400">Adjust the volume of notification sounds.</span>
              </div>
            </div>
          </div>

          {/* Price Alerts */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-terminal-amber/20 flex items-center justify-center text-terminal-amber text-xs">10</span>
              Price Alerts
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">Create Alert</span>
                <span className="text-gray-400">Set alerts for when a stock goes above or below a target price.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">Alert Types</span>
                <span className="text-gray-400">"Crosses Above" and "Crosses Below" trigger when price passes target.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-terminal-amber w-32 flex-shrink-0">Notifications</span>
                <span className="text-gray-400">Alerts show as toast notifications and optional sound.</span>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-terminal-bg border border-red-500/30 rounded-lg p-5">
            <h3 className="text-white text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-red-500/20 flex items-center justify-center text-red-400 text-xs">11</span>
              <span className="text-red-400">Danger Zone</span>
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex gap-3">
                <span className="text-red-400 w-36 flex-shrink-0">Clear API Budget</span>
                <span className="text-gray-400">Resets API call counters. Preserves all settings and API keys.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-red-400 w-36 flex-shrink-0">Clear AI History</span>
                <span className="text-gray-400">Deletes all trade decisions and AI recommendations.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-red-400 w-36 flex-shrink-0">Clear P&L History</span>
                <span className="text-gray-400">Deletes profit/loss tracking entries.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-red-400 w-36 flex-shrink-0">Clear Price Alerts</span>
                <span className="text-gray-400">Deletes all price alerts.</span>
              </div>
              <div className="flex gap-3">
                <span className="text-red-400 w-36 flex-shrink-0">Factory Reset</span>
                <span className="text-gray-400">Deletes everything. App restarts as if newly installed.</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-terminal-border">
              <p className="text-white text-sm font-medium mb-2">Backup & Restore</p>
              <div className="space-y-2 text-sm">
                <div className="flex gap-3">
                  <span className="text-terminal-amber w-36 flex-shrink-0">Create Backup</span>
                  <span className="text-gray-400">Export all data (settings, trades, holdings, alerts) to JSON.</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-terminal-amber w-36 flex-shrink-0">Restore Backup</span>
                  <span className="text-gray-400">Import a previously exported backup file.</span>
                </div>
              </div>
            </div>
            <p className="text-red-400/70 text-xs mt-3">Clear actions cannot be undone. Always create a backup first.</p>
          </div>
        </div>
      )

    case 'ai-copilot':
      return (
        <div className="space-y-8">
          <div>
            <h2 className="text-terminal-amber text-2xl font-bold mb-2">AI Copilot</h2>
            <p className="text-gray-400">Your AI-powered trading assistant</p>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Local AI with Ollama</h3>
            <div className="bg-terminal-amber/10 border border-terminal-amber/30 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-terminal-amber/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-terminal-amber text-xl">🦙</span>
                </div>
                <div>
                  <p className="text-white font-medium">Ollama (dolphin-llama3:8b)</p>
                  <p className="text-gray-400 text-sm mt-1">Free, private, uncensored local AI</p>
                </div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-300">
                <span className="text-terminal-up">✓</span>
                <span><span className="text-white">No API costs</span> - runs entirely on your computer</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <span className="text-terminal-up">✓</span>
                <span><span className="text-white">Private</span> - your data never leaves your machine</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <span className="text-terminal-up">✓</span>
                <span><span className="text-white">Uncensored</span> - gives direct trading recommendations</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <span className="text-terminal-up">✓</span>
                <span><span className="text-white">No rate limits</span> - unlimited analysis</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Quick Setup</h3>
            <div className="space-y-1">
              <Step><span className="text-white font-medium">1.</span> Install Ollama from <span className="text-terminal-amber">ollama.com</span></Step>
              <Step><span className="text-white font-medium">2.</span> Run: <code className="bg-terminal-bg px-2 py-0.5 rounded text-terminal-amber">ollama pull dolphin-llama3:8b</code></Step>
              <Step><span className="text-white font-medium">3.</span> Keep Ollama running in the background</Step>
            </div>
            <p className="text-gray-500 text-xs mt-3">
              ~5GB download (one-time). Check status in Settings → AI Copilot
            </p>
          </div>

          {/* Why Local AI */}
          <div className="bg-terminal-up/10 border border-terminal-up/30 rounded-lg p-5">
            <h3 className="text-terminal-up font-semibold mb-3">Why Local AI?</h3>
            <p className="text-gray-300 text-sm mb-3">
              Cloud AI providers (OpenAI, Claude, etc.) have guardrails that prevent them from giving direct stock recommendations. The dolphin-llama3 model is fine-tuned to be helpful without excessive disclaimers.
            </p>
            <p className="text-gray-400 text-xs">
              Model: dolphin-llama3:8b - Strong reasoning + 8k context window
            </p>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Automatic Recommendations</h3>
            <div className="space-y-1">
              <Step>AI analyzes your selected ticker every 15 minutes during market hours</Step>
              <Step>Only shows recommendations above your confidence threshold</Step>
              <Step>Includes: Action (BUY/SELL/HOLD), confidence %, rationale</Step>
            </div>
          </div>

          {/* NEW: AI Thinking Animation */}
          <div className="bg-terminal-amber/10 border border-terminal-amber/30 rounded-lg p-5">
            <h3 className="text-terminal-amber font-semibold mb-3">AI Thinking Animation</h3>
            <p className="text-gray-300 text-sm mb-3">
              When AI analyzes a ticker, you'll see a step-by-step breakdown:
            </p>
            <div className="space-y-1 text-sm">
              <Step><span className="text-white">Checking Market Regime</span> - VIX + SPY trend</Step>
              <Step><span className="text-white">Fetching Price Data</span> - Current quote</Step>
              <Step><span className="text-white">Calculating Indicators</span> - RSI, MACD, MAs</Step>
              <Step><span className="text-white">Detecting Patterns</span> - Candlesticks</Step>
              <Step><span className="text-white">Gathering News</span> - RSS headlines</Step>
              <Step><span className="text-white">Generating Recommendation</span> - AI synthesis</Step>
            </div>
          </div>

          {/* Analyzing Any Stock */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-5">
            <h3 className="text-green-400 font-semibold mb-3">Analyzing Any Stock</h3>
            <p className="text-gray-300 text-sm mb-3">
              The AI can analyze <span className="text-terminal-amber font-medium">any stock</span>, not just your watchlist.
              When you ask about a stock not in your watchlist:
            </p>
            <ol className="text-gray-300 text-sm space-y-1 list-decimal list-inside">
              <li>Real-time quote fetched from Tiingo</li>
              <li>90 days of historical data retrieved</li>
              <li>Full technical analysis calculated (RSI, MACD, Bollinger, ATR)</li>
              <li>Same quality analysis as watchlist stocks</li>
            </ol>
            <div className="mt-3 pt-3 border-t border-green-500/20">
              <p className="text-gray-400 text-xs">
                <span className="text-green-400">Budget:</span> Uses 2 API calls per stock lookup.
                Free tier: 50 calls/hour (~20 lookups). Pro tier: 5,000 calls/hour.
              </p>
              <p className="text-gray-400 text-xs mt-1">
                <span className="text-green-400">Tip:</span> For stocks you check frequently, add them to your watchlist for cached access.
              </p>
            </div>
          </div>

          {/* Options-Aware AI */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-5">
            <h3 className="text-purple-400 font-semibold mb-3">Options-Aware Mode</h3>
            <p className="text-gray-300 text-sm mb-3">
              When enabled, AI recommendations include options trading suggestions for high-confidence signals:
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <span className="text-terminal-up font-medium w-24">BUY Signal</span>
                <span className="text-gray-400">→</span>
                <span className="text-gray-300">"BUY (or Buy Call for leverage)"</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-terminal-down font-medium w-24">SELL Signal</span>
                <span className="text-gray-400">→</span>
                <span className="text-gray-300">"SELL (or Buy Put for protection)"</span>
              </div>
            </div>
            <p className="text-gray-500 text-xs mt-3">
              Enable in Settings → AI Copilot → Include Options Suggestions
            </p>
          </div>

          {/* How Confidence is Calculated */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-5">
            <h3 className="text-blue-400 font-semibold mb-3">How Confidence is Calculated</h3>
            <p className="text-gray-300 text-sm mb-4">
              The AI synthesizes multiple data points to generate a confidence score (0-100%):
            </p>
            <div className="space-y-3 text-sm">
              <div className="bg-terminal-bg/50 rounded p-3">
                <p className="text-white font-medium mb-1">Technical Indicators (40%)</p>
                <p className="text-gray-400 text-xs">RSI, MACD, Moving Averages, Bollinger Bands alignment</p>
              </div>
              <div className="bg-terminal-bg/50 rounded p-3">
                <p className="text-white font-medium mb-1">Market Regime (25%)</p>
                <p className="text-gray-400 text-xs">VIX level, SPY trend, overall market direction</p>
              </div>
              <div className="bg-terminal-bg/50 rounded p-3">
                <p className="text-white font-medium mb-1">Relative Strength vs Benchmark</p>
                <p className="text-gray-400 text-xs">
                  Compares the stock's RSI to your selected market index (SPY, QQQ, DIA, etc.).
                  Labels as "outperforming" (+10 differential), "underperforming" (-10), or "neutral"
                  to identify stocks stronger than your chosen benchmark.
                </p>
              </div>
              <div className="bg-terminal-bg/50 rounded p-3">
                <p className="text-white font-medium mb-1">Candlestick Patterns (20%)</p>
                <p className="text-gray-400 text-xs">Engulfing, Doji, Hammer, Star patterns detected</p>
              </div>
              <div className="bg-terminal-bg/50 rounded p-3">
                <p className="text-white font-medium mb-1">News Sentiment (15%)</p>
                <p className="text-gray-400 text-xs">Recent news sentiment for the ticker (bullish/bearish/neutral)</p>
              </div>
            </div>
            <p className="text-gray-500 text-xs mt-4">
              Higher confidence = more indicators align in the same direction. Default threshold is 80%.
            </p>
          </div>

          {/* Smart Position Sizing */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-5">
            <h3 className="text-green-400 font-semibold mb-3">Smart Position Sizing</h3>
            <p className="text-gray-300 text-sm mb-4">
              AI recommendations include personalized position sizing based on your risk settings:
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex gap-3">
                <span className="text-terminal-amber w-40 flex-shrink-0">Suggested Shares</span>
                <span className="text-gray-400">Number of shares based on your position size limit</span>
              </div>
              <div className="flex gap-3">
                <span className="text-terminal-amber w-40 flex-shrink-0">Dollar Amount</span>
                <span className="text-gray-400">Total investment amount respecting your daily budget</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-terminal-bg/50 rounded">
              <p className="text-gray-400 text-xs">
                <strong className="text-white">Example:</strong> With $1,000 daily budget and 5% max position size,
                AI will suggest ~$50 positions. In high volatility regimes, this is reduced by 50%.
              </p>
            </div>
            <p className="text-gray-500 text-xs mt-3">
              Configure in Settings → Portfolio → Risk Management
            </p>
          </div>

          {/* Historical Memory */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-5">
            <h3 className="text-purple-400 font-semibold mb-3">Historical Memory</h3>
            <p className="text-gray-300 text-sm mb-4">
              AI learns from past recommendations in similar market conditions:
            </p>
            <ul className="text-gray-400 text-sm space-y-2">
              <li>• Finds past trades with similar RSI, MACD, patterns, and regime</li>
              <li>• Shows historical win rate in similar conditions</li>
              <li>• <strong className="text-white">Regime matching:</strong> Past trades from different market regimes
                are weighted 50% less (bull market history is less relevant in bear markets)</li>
            </ul>
            <p className="text-gray-500 text-xs mt-4">
              The more you trade, the smarter the AI becomes at recognizing profitable setups.
            </p>
          </div>

          {/* Web Search for Historical Data */}
          <div className="bg-terminal-bg/50 border border-terminal-border rounded-lg p-5">
            <h3 className="text-white font-semibold mb-3">Historical Web Search</h3>
            <p className="text-gray-300 text-sm mb-4">
              Ask AI about historical market events beyond chart data:
            </p>
            <div className="space-y-3 text-sm">
              <div className="bg-terminal-panel rounded p-3">
                <p className="text-gray-400 text-xs mb-2">Example questions:</p>
                <ul className="text-gray-300 space-y-1">
                  <li>• "What happened to AAPL 10 years ago?"</li>
                  <li>• "Tell me about the 2020 crash"</li>
                  <li>• "How did Tesla perform during the 2022 bear market?"</li>
                </ul>
              </div>
              <p className="text-gray-400 text-xs">
                <strong className="text-white">How it works:</strong> When you ask about historical events,
                AI automatically searches the web and includes sources in its response.
              </p>
              <div className="bg-terminal-up/10 border border-terminal-up/30 rounded p-2 text-terminal-up text-xs">
                Works automatically - no setup needed!
              </div>
            </div>
          </div>

          {/* Acting on Recommendations */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Acting on Recommendations</h3>
            <p className="text-gray-300 text-sm mb-4">
              When an AI recommendation appears, you have three choices:
            </p>

            {/* Execute */}
            <div className="bg-semantic-up/10 border border-semantic-up/30 rounded-lg p-4 mb-3">
              <div className="flex items-center gap-3 mb-2">
                <kbd className="bg-terminal-border px-3 py-1 rounded text-white font-mono">E</kbd>
                <span className="text-semantic-up font-semibold">Execute</span>
              </div>
              <p className="text-gray-300 text-sm">
                Logs the trade to your decision history with "Executed" status. The system will:
              </p>
              <ul className="text-gray-400 text-sm mt-2 space-y-1">
                <li>• Track the price at decision time</li>
                <li>• Monitor price target and stop loss</li>
                <li>• Calculate profit/loss when targets hit</li>
                <li>• Update your AI win rate in Performance Summary</li>
              </ul>
            </div>

            {/* Skip */}
            <div className="bg-terminal-border/30 border border-terminal-border rounded-lg p-4 mb-3">
              <div className="flex items-center gap-3 mb-2">
                <kbd className="bg-terminal-border px-3 py-1 rounded text-white font-mono">S</kbd>
                <span className="text-gray-300 font-semibold">Skip</span>
              </div>
              <p className="text-gray-300 text-sm">
                Logs the trade as "Skipped" (you chose not to act). Useful for:
              </p>
              <ul className="text-gray-400 text-sm mt-2 space-y-1">
                <li>• Tracking recommendations you disagreed with</li>
                <li>• Comparing "what if I had executed" scenarios</li>
                <li>• Learning from trades you passed on</li>
              </ul>
            </div>

            {/* X / Esc - Dismiss */}
            <div className="bg-terminal-amber/10 border border-terminal-amber/30 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <kbd className="bg-terminal-border px-3 py-1 rounded text-white font-mono">Esc</kbd>
                <span className="text-gray-400 mx-1">or</span>
                <kbd className="bg-terminal-border px-3 py-1 rounded text-white font-mono">X</kbd>
                <span className="text-terminal-amber font-semibold">Dismiss (Save for Later)</span>
              </div>
              <p className="text-gray-300 text-sm">
                Closes the modal without logging. The recommendation is <span className="text-white">saved to your Notification Bell</span>:
              </p>
              <ul className="text-gray-400 text-sm mt-2 space-y-1">
                <li>• Click the bell icon in the top bar to review later</li>
                <li>• Bulk "Execute All" or "Skip All" from the panel</li>
                <li>• Individual recommendations can still be acted upon</li>
                <li>• Cleared when you make a decision or manually remove</li>
              </ul>
            </div>
          </div>

          {/* Performance Tracking / Batting Average */}
          <div className="bg-terminal-amber/10 border border-terminal-amber/30 rounded-lg p-5">
            <h3 className="text-terminal-amber font-semibold mb-4">Performance Tracking (Batting Average)</h3>

            <div className="mb-5">
              <p className="text-white font-medium mb-2">What Counts Toward Your Win Rate?</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-terminal-up">✓</span>
                  <span><span className="text-white">Executed trades</span> - Count toward batting average</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-red-400">✗</span>
                  <span><span className="text-white">Skipped trades</span> - Logged but DON'T affect win rate</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <span className="text-gray-500">○</span>
                  <span><span className="text-white">HOLD recommendations</span> - Become "neutral" (don't count)</span>
                </div>
              </div>
            </div>

            <div className="mb-5">
              <p className="text-white font-medium mb-2">How Outcomes Are Determined</p>
              <div className="bg-terminal-bg/50 rounded p-3 text-sm">
                <div className="grid grid-cols-3 gap-2 mb-2 text-xs font-medium">
                  <span className="text-gray-400">Trade</span>
                  <span className="text-terminal-up">WIN</span>
                  <span className="text-terminal-down">LOSS</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-300 border-t border-terminal-border pt-2">
                  <span>BUY</span>
                  <span className="text-gray-400">Price hits target ↑</span>
                  <span className="text-gray-400">Price hits stop ↓</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-300 mt-1">
                  <span>SELL</span>
                  <span className="text-gray-400">Price hits target ↓</span>
                  <span className="text-gray-400">Price hits stop ↑</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-gray-300 mt-1">
                  <span>HOLD</span>
                  <span className="text-gray-400 col-span-2">Always neutral (doesn't count)</span>
                </div>
              </div>
            </div>

            <div className="mb-5">
              <p className="text-white font-medium mb-2">Monitoring Window</p>
              <div className="space-y-1 text-sm text-gray-300">
                <Step>Trades are monitored for up to <span className="text-white">30 days</span></Step>
                <Step>After 30 days with no target hit → marked "neutral"</Step>
                <Step>Neutral trades don't affect your batting average</Step>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-white font-medium mb-2">Win Rate Formula</p>
              <div className="bg-terminal-bg/50 rounded p-3">
                <code className="text-terminal-amber text-sm">Win Rate = Wins ÷ (Wins + Losses) × 100%</code>
                <p className="text-gray-500 text-xs mt-2">Pending and neutral trades are excluded from calculation</p>
              </div>
            </div>

            <div>
              <p className="text-white font-medium mb-2">Where to View</p>
              <div className="space-y-1 text-sm text-gray-300">
                <Step><span className="text-white">AI Panel footer</span> - Quick summary (e.g., "AI accuracy: 71% (5W-2L)")</Step>
                <Step><span className="text-white">Settings → Performance</span> - Detailed Human vs AI comparison</Step>
              </div>
            </div>
          </div>

          {/* AI Personas */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">AI Personas</h3>
            <p className="text-gray-300 text-sm mb-5">
              Choose your AI co-pilot's personality in Settings. Each persona analyzes the same data but communicates in their unique style.
            </p>

            {/* Sterling */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-5 mb-4">
              <div className="flex items-center gap-2.5 mb-3">
                <BarChart2 className="w-5 h-5 text-blue-400" />
                <span className="text-blue-400 font-semibold">Sterling - The Analyst</span>
              </div>
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                Sterling is a former quantitative analyst from a top-tier hedge fund. He communicates with the precision of a Bloomberg terminal, always backing recommendations with specific data points and risk metrics. His responses are structured with clear bullet points and never include casual language.
              </p>
              <div className="bg-black/30 rounded-md p-3.5 mb-3">
                <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-2">Sample Recommendation</p>
                <div className="text-gray-200 text-sm leading-relaxed">
                  <span className="inline-block bg-terminal-amber/20 text-terminal-amber px-1.5 py-0.5 rounded text-xs font-semibold mr-1.5">NVDA</span>
                  <span className="inline-block bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded text-[11px] font-semibold">BUY</span>
                  <p className="mt-2.5">Technical confluence at the 50-day MA ($875) suggests favorable risk-adjusted entry.</p>
                  <p className="mt-2 font-medium text-gray-400">Key metrics:</p>
                  <p className="text-gray-400">• RSI: 58 (neutral-bullish)</p>
                  <p className="text-gray-400">• MACD: Bullish crossover confirmed</p>
                  <p className="text-gray-400">• Risk/Reward: 2.8:1</p>
                  <p className="mt-2"><span className="font-medium">Target:</span> $950 | <span className="font-medium">Stop:</span> $845</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-gray-400">Formal</span>
                <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-gray-400">Data-centric</span>
                <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-gray-400">Structured</span>
                <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-gray-400">Risk metrics</span>
              </div>
            </div>

            {/* Jax */}
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-5 mb-4">
              <div className="flex items-center gap-2.5 mb-3">
                <Target className="w-5 h-5 text-orange-400" />
                <span className="text-orange-400 font-semibold">Jax - The Veteran Trader</span>
              </div>
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                Jax spent 30 years in the trading pits of Chicago. He's seen every market cycle and has the scars to prove it. Jax keeps sentences short and punchy, using trader slang. He won't sugarcoat bad news and cuts through complexity with simple analogies.
              </p>
              <div className="bg-black/30 rounded-md p-3.5 mb-3">
                <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-2">Sample Recommendation</p>
                <div className="text-gray-200 text-sm leading-relaxed">
                  <span className="inline-block bg-terminal-amber/20 text-terminal-amber px-1.5 py-0.5 rounded text-xs font-semibold mr-1.5">NVDA</span>
                  <span className="inline-block bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded text-[11px] font-semibold">BUY</span>
                  <p className="mt-2.5">Look, this chart's screaming. We're sitting right on the 50-day and catching a bid. I've seen this setup a thousand times.</p>
                  <p className="mt-2">Get in around $875. If it breaks $845, get out - don't be a hero. Target's $950, maybe higher if momentum picks up.</p>
                  <p className="mt-2">Volume's there. MACD just flipped. Don't overthink it.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-gray-400">Direct</span>
                <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-gray-400">Pragmatic</span>
                <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-gray-400">Street-smart</span>
                <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-gray-400">No-nonsense</span>
              </div>
            </div>

            {/* Cipher */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-5 mb-4">
              <div className="flex items-center gap-2.5 mb-3">
                <Microscope className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-semibold">Cipher - The Tech Wiz</span>
              </div>
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                Cipher is an algorithmic trading developer and data scientist who gets genuinely excited about statistical edges. He thinks in terms of signal-to-noise ratios, probability distributions, and backtested patterns. Shows enthusiasm when multiple indicators align.
              </p>
              <div className="bg-black/30 rounded-md p-3.5 mb-3">
                <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-2">Sample Recommendation</p>
                <div className="text-gray-200 text-sm leading-relaxed">
                  <span className="inline-block bg-terminal-amber/20 text-terminal-amber px-1.5 py-0.5 rounded text-xs font-semibold mr-1.5">NVDA</span>
                  <span className="inline-block bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded text-[11px] font-semibold">BUY</span>
                  <p className="mt-2.5">Whoa, this is interesting! Three of my detection algos just triggered simultaneously on NVDA.</p>
                  <p className="mt-2">The pattern recognition picked up a bullish engulfing right at the 50-MA support - that's a high-probability setup in my backtests (~68% win rate over 5 years).</p>
                  <p className="mt-2">RSI at 58 means we're not overbought, and the MACD histogram just flipped positive. The signal-to-noise ratio on this one is solid.</p>
                  <p className="mt-2"><span className="font-medium">Entry:</span> $875 | <span className="font-medium">Target:</span> $950 | <span className="font-medium">Stop:</span> $845</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-gray-400">Energetic</span>
                <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-gray-400">Pattern-obsessed</span>
                <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-gray-400">Probability-focused</span>
                <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-gray-400">Nerdy</span>
              </div>
            </div>

            <p className="text-gray-500 text-xs mt-5">
              All personas provide the same quality analysis - only the communication style differs.
              Change your persona anytime in Settings → AI Copilot.
            </p>
          </div>
        </div>
      )

    case 'ollama-setup':
      return (
        <div className="space-y-8">
          <div>
            <h2 className="text-terminal-amber text-2xl font-bold mb-2">Ollama Setup Guide</h2>
            <p className="text-gray-400">Run AI locally on your machine - free, private, and unlimited</p>
          </div>

          {/* What is Ollama */}
          <div className="bg-terminal-amber/10 border border-terminal-amber/30 rounded-lg p-5">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-lg bg-terminal-amber/20 flex items-center justify-center flex-shrink-0">
                <span className="text-3xl">🦙</span>
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">What is Ollama?</h3>
                <p className="text-gray-300 text-sm mt-2">
                  Ollama is a tool that runs AI models locally on your computer. Instead of sending your data to cloud services like OpenAI or Claude, everything stays on your machine - completely private and free.
                </p>
              </div>
            </div>
          </div>

          {/* Why Local AI */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Why Run AI Locally?</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-terminal-bg border border-terminal-border rounded-lg p-4">
                <div className="flex items-center gap-2 text-terminal-up mb-2">
                  <span>✓</span>
                  <span className="font-medium">100% Free</span>
                </div>
                <p className="text-gray-400 text-sm">No API costs, no subscriptions, no usage limits</p>
              </div>
              <div className="bg-terminal-bg border border-terminal-border rounded-lg p-4">
                <div className="flex items-center gap-2 text-terminal-up mb-2">
                  <span>✓</span>
                  <span className="font-medium">Private</span>
                </div>
                <p className="text-gray-400 text-sm">Your trading data never leaves your computer</p>
              </div>
              <div className="bg-terminal-bg border border-terminal-border rounded-lg p-4">
                <div className="flex items-center gap-2 text-terminal-up mb-2">
                  <span>✓</span>
                  <span className="font-medium">Unlimited</span>
                </div>
                <p className="text-gray-400 text-sm">No rate limits - analyze as much as you want</p>
              </div>
              <div className="bg-terminal-bg border border-terminal-border rounded-lg p-4">
                <div className="flex items-center gap-2 text-terminal-up mb-2">
                  <span>✓</span>
                  <span className="font-medium">Uncensored</span>
                </div>
                <p className="text-gray-400 text-sm">Direct trading advice without excessive disclaimers</p>
              </div>
            </div>
          </div>

          <SectionDivider />

          {/* Installation by Platform */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Installation</h3>

            {/* macOS */}
            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-white font-medium">macOS</span>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-400 text-sm mb-2">Option 1: Download from website</p>
                  <div className="bg-terminal-panel rounded p-3">
                    <p className="text-gray-300 text-sm">Visit <span className="text-terminal-amber">ollama.com</span> → Download for Mac</p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-400 text-sm mb-2">Option 2: Homebrew</p>
                  <div className="bg-terminal-panel rounded p-3">
                    <code className="text-terminal-amber text-sm">brew install ollama</code>
                  </div>
                </div>
              </div>
            </div>

            {/* Windows */}
            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-white font-medium">Windows</span>
              </div>
              <div className="bg-terminal-panel rounded p-3">
                <p className="text-gray-300 text-sm">Visit <span className="text-terminal-amber">ollama.com</span> → Download for Windows</p>
              </div>
            </div>
          </div>

          <SectionDivider />

          {/* Download the Model */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Download the AI Model</h3>
            <p className="text-gray-300 text-sm mb-4">
              After installing Ollama, open Terminal (Mac) or Command Prompt (Windows) and run:
            </p>
            <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 mb-4">
              <code className="text-terminal-amber text-lg">ollama pull dolphin-llama3:8b</code>
            </div>
            <div className="space-y-2 text-sm">
              <Step>This downloads the <span className="text-white">dolphin-llama3:8b</span> model (~5GB)</Step>
              <Step>One-time download - model is cached locally</Step>
              <Step>Requires ~8GB RAM for optimal performance</Step>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-4">
              <p className="text-blue-400 text-sm">
                <strong>Why dolphin-llama3?</strong> This model is fine-tuned to be helpful without excessive guardrails. It provides direct trading advice that cloud AI models refuse to give.
              </p>
            </div>
          </div>

          <SectionDivider />

          {/* Running Ollama */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Running Ollama</h3>
            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
              <p className="text-gray-300 text-sm">
                Ollama runs automatically as a background service after installation. Look for the llama icon in your menu bar (Mac) or system tray (Windows).
              </p>
            </div>
          </div>

          <SectionDivider />

          {/* Verify It's Working */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Verify It's Working</h3>
            <div className="space-y-3">
              <Step><span className="text-white font-medium">1.</span> Open RichDad → Settings (<kbd className="bg-terminal-border px-2 py-0.5 rounded text-xs mx-1">Cmd/Ctrl+3</kbd>)</Step>
              <Step><span className="text-white font-medium">2.</span> Go to <span className="text-white">AI Copilot</span> section</Step>
              <Step><span className="text-white font-medium">3.</span> Look for the green "Ollama Connected" status</Step>
            </div>
            <div className="bg-terminal-up/10 border border-terminal-up/30 rounded-lg p-4 mt-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-terminal-up"></span>
                <span className="text-terminal-up font-medium">Ollama Connected</span>
              </div>
              <p className="text-gray-400 text-sm mt-2">
                When you see this, AI Copilot is ready to use!
              </p>
            </div>
          </div>

          {/* Troubleshooting */}
          <div className="bg-terminal-down/10 border border-terminal-down/30 rounded-lg p-5">
            <h3 className="text-terminal-down font-semibold mb-3">Connection Issues?</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-white font-medium">Ollama not detected</p>
                <p className="text-gray-400">Make sure Ollama is running (check menu bar icon or run <code className="text-terminal-amber">ollama serve</code>)</p>
              </div>
              <div>
                <p className="text-white font-medium">Model not found</p>
                <p className="text-gray-400">Run <code className="text-terminal-amber">ollama pull dolphin-llama3:8b</code> to download the model</p>
              </div>
              <div>
                <p className="text-white font-medium">Slow responses</p>
                <p className="text-gray-400">Close other resource-intensive apps. AI runs on your CPU/GPU and needs memory.</p>
              </div>
            </div>
          </div>

          {/* Alternative Models */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Alternative Models</h3>
            <p className="text-gray-400 text-sm mb-4">
              While dolphin-llama3:8b is recommended, you can try other models:
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-terminal-bg border border-terminal-border rounded p-3">
                <div>
                  <span className="text-white font-medium">llama3.1:8b</span>
                  <span className="text-gray-500 text-sm ml-2">~5GB</span>
                </div>
                <span className="text-gray-400 text-sm">More cautious, fewer direct recommendations</span>
              </div>
              <div className="flex items-center justify-between bg-terminal-bg border border-terminal-border rounded p-3">
                <div>
                  <span className="text-white font-medium">mistral:7b</span>
                  <span className="text-gray-500 text-sm ml-2">~4GB</span>
                </div>
                <span className="text-gray-400 text-sm">Fast, good for chat</span>
              </div>
              <div className="flex items-center justify-between bg-terminal-bg border border-terminal-border rounded p-3">
                <div>
                  <span className="text-white font-medium">dolphin-mistral:7b</span>
                  <span className="text-gray-500 text-sm ml-2">~4GB</span>
                </div>
                <span className="text-gray-400 text-sm">Smaller alternative to dolphin-llama3</span>
              </div>
            </div>
            <p className="text-gray-500 text-xs mt-3">
              To use a different model: Settings → AI Copilot → Custom Model Name
            </p>
          </div>
        </div>
      )

    case 'api-limits':
      return (
        <div className="space-y-8">
          <div>
            <h2 className="text-terminal-amber text-2xl font-bold mb-2">API Limits & Usage</h2>
            <p className="text-gray-400">Understanding rate limits, quotas, and automatic fallback</p>
          </div>

          {/* Market Data Providers */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Database size={20} className="text-terminal-amber" />
              <h3 className="text-white text-lg font-semibold">Market Data Providers</h3>
            </div>
            <div className="space-y-3">
              {/* Tiingo */}
              <div className="bg-terminal-bg border border-terminal-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">Tiingo</span>
                  <span className="text-terminal-amber text-xs px-2 py-0.5 bg-terminal-amber/20 rounded">Recommended</span>
                </div>
                <div className="text-gray-400 text-sm space-y-1">
                  <p className="mb-2">IEX real-time data • 30+ years of dividend-adjusted history</p>
                  <div className="flex gap-4 text-xs">
                    <span><span className="text-green-400">Starter (Free):</span> 50 tickers/hour</span>
                    <span><span className="text-terminal-amber">Power ($10/mo):</span> 5,000 tickers/hour</span>
                  </div>
                  <p className="text-gray-500 mt-2">Best for: All users - best value for retail traders and AI backtesting</p>
                </div>
                {/* Tiingo Signup Steps */}
                <div className="mt-3 bg-terminal-panel rounded p-3">
                  <p className="text-white text-xs font-medium mb-2">How to get your API token:</p>
                  <ol className="text-gray-400 text-xs space-y-1 list-decimal list-inside">
                    <li>Go to <span className="text-terminal-amber">tiingo.com</span> and click "Sign Up"</li>
                    <li>Fill in your details and confirm your email</li>
                    <li>Once logged in, click your username (top-right)</li>
                    <li>Select "Token" from the dropdown</li>
                    <li>Copy your API token</li>
                  </ol>
                </div>
              </div>

            </div>

            {/* Why Tiingo Comparison */}
            <div className="mt-6 bg-terminal-bg border border-terminal-border rounded-lg p-4">
              <h4 className="text-white text-sm font-medium mb-3">Why Tiingo over other providers?</h4>

              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-terminal-border">
                    <th className="pb-2">Provider</th>
                    <th className="pb-2">Free Tier</th>
                    <th className="pb-2">Historical</th>
                    <th className="pb-2">Best For</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-terminal-border/50">
                    <td className="py-2 text-terminal-amber font-medium">Tiingo</td>
                    <td className="py-2">50/hour</td>
                    <td className="py-2">30+ years</td>
                    <td className="py-2">AI backtesting, retail traders</td>
                  </tr>
                  <tr className="border-b border-terminal-border/50">
                    <td className="py-2">Polygon</td>
                    <td className="py-2">5/min</td>
                    <td className="py-2">2 years</td>
                    <td className="py-2">Real-time focus</td>
                  </tr>
                  <tr className="border-b border-terminal-border/50">
                    <td className="py-2">Alpha Vantage</td>
                    <td className="py-2">25/day</td>
                    <td className="py-2">20 years</td>
                    <td className="py-2">Basic research</td>
                  </tr>
                  <tr className="border-b border-terminal-border/50">
                    <td className="py-2">Finnhub</td>
                    <td className="py-2">60/min</td>
                    <td className="py-2">Limited</td>
                    <td className="py-2">News & fundamentals</td>
                  </tr>
                  <tr>
                    <td className="py-2">Yahoo Finance</td>
                    <td className="py-2">Unofficial</td>
                    <td className="py-2">Full</td>
                    <td className="py-2">Hobby projects (unreliable)</td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-3 text-gray-400 text-xs space-y-1">
                <p><span className="text-terminal-amber">Best historical data:</span> 30+ years dividend-adjusted for AI backtesting</p>
                <p><span className="text-terminal-amber">Best value:</span> $10/mo Power tier vs $200+/mo competitors</p>
                <p><span className="text-terminal-amber">Reliable API:</span> Stable, well-documented, consistent uptime</p>
                <p><span className="text-terminal-amber">IEX real-time:</span> Free real-time quotes via IEX exchange</p>
              </div>
            </div>
          </div>

          {/* Market Indices & Data Accuracy */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp size={20} className="text-terminal-amber" />
              <h3 className="text-white text-lg font-semibold">Market Indices Available</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Use the Market Selector dropdown (next to logo) to switch between these indices:
            </p>
            <div className="space-y-2 mb-6">
              <div className="flex gap-4 py-2 border-b border-terminal-border">
                <span className="text-terminal-amber w-24 flex-shrink-0 font-medium">SPY</span>
                <span className="text-white w-20">S&P 500</span>
                <span className="text-gray-400 text-sm">500 largest US companies - broad market benchmark</span>
              </div>
              <div className="flex gap-4 py-2 border-b border-terminal-border">
                <span className="text-terminal-amber w-24 flex-shrink-0 font-medium">QQQ</span>
                <span className="text-white w-20">NASDAQ</span>
                <span className="text-gray-400 text-sm">100 largest non-financial NASDAQ stocks - tech-heavy</span>
              </div>
              <div className="flex gap-4 py-2 border-b border-terminal-border">
                <span className="text-terminal-amber w-24 flex-shrink-0 font-medium">DIA</span>
                <span className="text-white w-20">Dow Jones</span>
                <span className="text-gray-400 text-sm">30 blue-chip industrial companies - oldest index</span>
              </div>
              <div className="flex gap-4 py-2 border-b border-terminal-border">
                <span className="text-terminal-amber w-24 flex-shrink-0 font-medium">IWM</span>
                <span className="text-white w-20">Russell 2000</span>
                <span className="text-gray-400 text-sm">2000 small-cap stocks - small company performance</span>
              </div>
              <div className="flex gap-4 py-2 border-b border-terminal-border">
                <span className="text-terminal-amber w-24 flex-shrink-0 font-medium">VTI</span>
                <span className="text-white w-20">Total Market</span>
                <span className="text-gray-400 text-sm">Full US stock market exposure - all cap sizes</span>
              </div>
              <div className="flex gap-4 py-2 border-b border-terminal-border">
                <span className="text-terminal-amber w-24 flex-shrink-0 font-medium">SMH</span>
                <span className="text-white w-20">Semiconductors</span>
                <span className="text-gray-400 text-sm">Chip sector ETF - tracks semiconductor industry</span>
              </div>
              <div className="flex gap-4 py-2">
                <span className="text-terminal-amber w-24 flex-shrink-0 font-medium">VXX</span>
                <span className="text-white w-20">Volatility</span>
                <span className="text-gray-400 text-sm">VIX tracker - measures market fear/uncertainty</span>
              </div>
            </div>

            <h4 className="text-white font-medium mb-3">Data Accuracy</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Check size={14} className="text-terminal-up mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">All providers pull from official NYSE/NASDAQ exchange feeds</span>
              </div>
              <div className="flex items-start gap-2">
                <Check size={14} className="text-terminal-up mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">Same data used by Bloomberg, Yahoo Finance, and brokers</span>
              </div>
              <div className="flex items-start gap-2">
                <Check size={14} className="text-terminal-up mt-0.5 flex-shrink-0" />
                <span className="text-gray-300">ETF prices match what you'd see on any trading platform</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-terminal-border">
              <p className="text-gray-500 text-xs">
                <span className="text-terminal-amber">Free tier:</span> Tiingo Starter (50 tickers/hour). <span className="text-terminal-amber">Pro tier:</span> Tiingo Power (5,000 tickers/hour, $10/mo).
              </p>
            </div>
          </div>

          {/* Automatic Fallback System */}
          <div className="bg-terminal-amber/10 border border-terminal-amber/30 rounded-lg p-6">
            <h3 className="text-terminal-amber text-lg font-bold mb-4 flex items-center gap-2">
              <AlertTriangle size={18} />
              Automatic Fallback System
            </h3>
            <p className="text-gray-300 text-sm mb-4">
              When your API limit is reached or Tiingo is unavailable, RichDad automatically falls back:
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-terminal-amber">1.</span>
                <span className="text-gray-300">Uses cached data (quotes: 1 hour, charts: 24 hours)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-terminal-amber">2.</span>
                <span className="text-gray-300">Shows empty state if no cached data available</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-terminal-amber/30">
              <p className="text-gray-400 text-xs">
                <span className="text-terminal-amber">Tip:</span> You'll see subtle alerts when approaching limits (80%+) and when fallback kicks in.
              </p>
            </div>
          </div>

          {/* Tier Selection */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-6">
            <h3 className="text-white text-lg font-bold mb-4">API Tier Selection</h3>
            <p className="text-gray-300 text-sm mb-4">
              Select your plan in Settings → API Keys. This adjusts rate limits accordingly.
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex gap-4">
                <span className="text-terminal-amber w-28 flex-shrink-0">Tiingo</span>
                <span className="text-gray-400">Starter (50/hour free) • Power (5,000/hour for $10/mo)</span>
              </div>
            </div>
            <p className="text-gray-500 text-xs mt-4">
              The API Budget Meter in Settings shows real-time hourly usage.
            </p>
          </div>

          {/* AI Provider */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Zap size={20} className="text-terminal-amber" />
              <h3 className="text-white text-lg font-semibold">AI Provider (Local)</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-terminal-amber/10 border border-terminal-amber/30 rounded-lg">
                <span className="text-2xl">🦙</span>
                <div>
                  <p className="text-white font-medium">Ollama (dolphin-llama3:8b)</p>
                  <p className="text-gray-400 text-sm">Runs locally on your computer. No API costs, no rate limits, completely private.</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-terminal-border">
                  <span className="text-gray-400">Rate Limit</span>
                  <span className="text-terminal-up font-medium">Unlimited</span>
                </div>
                <div className="flex justify-between py-2 border-b border-terminal-border">
                  <span className="text-gray-400">Cost</span>
                  <span className="text-terminal-up font-medium">Free</span>
                </div>
                <div className="flex justify-between py-2 border-b border-terminal-border">
                  <span className="text-gray-400">Privacy</span>
                  <span className="text-terminal-up font-medium">100% Local</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-400">Model Size</span>
                  <span className="text-white">~5GB download</span>
                </div>
              </div>
            </div>
          </div>

          {/* News Sources */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText size={20} className="text-terminal-amber" />
              <h3 className="text-white text-lg font-semibold">News Sources</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between py-2">
                <span className="text-gray-400">RSS Feeds</span>
                <span className="text-terminal-up font-medium">Unlimited (Free)</span>
              </div>
            </div>
          </div>

          {/* Usage Tips */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Optimization Tips</h3>
            <div className="space-y-1">
              <Step>Use 15-minute AI interval (not 5 min) to conserve market data API calls</Step>
              <Step>Let charts cache - avoid excessive timeframe switching</Step>
              <Step>Focus watchlist on key stocks to reduce quote fetches</Step>
              <Step>Keep Ollama running in background for instant AI responses</Step>
              <Step>Switch to Pro plan for unlimited market data API calls</Step>
            </div>
          </div>
        </div>
      )

    case 'shortcuts':
      return (
        <div className="space-y-8">
          <div>
            <h2 className="text-terminal-amber text-2xl font-bold mb-2">Keyboard Shortcuts</h2>
            <p className="text-gray-400">Navigate faster with hotkeys (Mac / Windows)</p>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Navigation</h3>
            <div className="space-y-2">
              {[
                { mac: 'Cmd+1', win: 'Ctrl+1', action: 'Dashboard' },
                { mac: 'Cmd+2', win: 'Ctrl+2', action: 'News' },
                { mac: 'Cmd+3', win: 'Ctrl+3', action: 'Settings' },
                { mac: 'Cmd+4', win: 'Ctrl+4', action: 'Backtest' },
                { mac: 'Cmd+N', win: 'Ctrl+N', action: 'New Window' },
                { mac: 'Cmd+?', win: 'Ctrl+?', action: 'Reference Guide (this)' },
              ].map(({ mac, win, action }) => (
                <div key={mac} className="flex justify-between items-center bg-terminal-bg border border-terminal-border rounded p-3">
                  <span className="text-gray-300">{action}</span>
                  <div className="flex gap-2">
                    <kbd className="bg-terminal-border px-2 py-1 rounded text-xs text-gray-300">{mac}</kbd>
                    <span className="text-gray-500">/</span>
                    <kbd className="bg-terminal-border px-2 py-1 rounded text-xs text-gray-300">{win}</kbd>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">AI Recommendations</h3>
            <div className="space-y-2">
              {[
                { key: 'E', action: 'Execute (log trade)' },
                { key: 'S', action: 'Skip recommendation' },
                { key: 'Esc', action: 'Close modal' },
              ].map(({ key, action }) => (
                <div key={key} className="flex justify-between items-center bg-terminal-bg border border-terminal-border rounded p-3">
                  <span className="text-gray-300">{action}</span>
                  <kbd className="bg-terminal-border px-3 py-1 rounded text-sm">{key}</kbd>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">View Controls</h3>
            <div className="space-y-2">
              {[
                { mac: 'Cmd++', win: 'Ctrl++', action: 'Zoom in' },
                { mac: 'Cmd+-', win: 'Ctrl+-', action: 'Zoom out' },
                { mac: 'Cmd+0', win: 'Ctrl+0', action: 'Reset zoom' },
              ].map(({ mac, win, action }) => (
                <div key={mac} className="flex justify-between items-center bg-terminal-bg border border-terminal-border rounded p-3">
                  <span className="text-gray-300">{action}</span>
                  <div className="flex gap-2">
                    <kbd className="bg-terminal-border px-2 py-1 rounded text-xs text-gray-300">{mac}</kbd>
                    <span className="text-gray-500">/</span>
                    <kbd className="bg-terminal-border px-2 py-1 rounded text-xs text-gray-300">{win}</kbd>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )

    case 'troubleshooting':
      return (
        <div className="space-y-8">
          <div>
            <h2 className="text-terminal-amber text-2xl font-bold mb-2">Troubleshooting</h2>
            <p className="text-gray-400">Common issues and solutions</p>
          </div>

          {/* Quick Reference - What to Watch For */}
          <div className="bg-terminal-amber/10 border border-terminal-amber/30 rounded-lg p-5">
            <h3 className="text-terminal-amber font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle size={18} />
              What to Watch For
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-white font-medium mb-1">News not loading?</p>
                <p className="text-gray-400">Check Settings → News Sources. Enable RSS feeds.</p>
              </div>
              <div>
                <p className="text-white font-medium mb-1">AI not responding?</p>
                <p className="text-gray-400">Check that Ollama is running. Start it with: ollama serve</p>
              </div>
              <div>
                <p className="text-white font-medium mb-1">Sentiment shows "keywords"?</p>
                <p className="text-gray-400">Ollama not running. Start it with: ollama serve</p>
              </div>
              <div>
                <p className="text-white font-medium mb-1">Chart not loading?</p>
                <p className="text-gray-400">Check data source badge. Verify API key in Settings → Market Data.</p>
              </div>
              <div>
                <p className="text-white font-medium mb-1">Data seems stale?</p>
                <p className="text-gray-400">Check freshness badge (green=live, yellow=cached, red=stale).</p>
              </div>
              <div>
                <p className="text-white font-medium mb-1">Something broken?</p>
                <p className="text-gray-400">Check Settings → Activity Log for detailed error messages.</p>
              </div>
            </div>
          </div>

          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white font-semibold mb-3">"No market data" or prices not updating</h3>
            <div className="space-y-1 text-gray-300">
              <Step>Check your API key in Settings → Market Data</Step>
              <Step>Free tier: You may have hit the 800 calls/day limit - wait until midnight EST</Step>
              <Step>Data is cached for 1 hour - this is normal, not an error</Step>
            </div>
          </div>

          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white font-semibold mb-3">"AI not responding" or recommendations missing</h3>
            <div className="space-y-1 text-gray-300">
              <Step>Verify Ollama is running: <code className="bg-terminal-bg px-1 rounded text-terminal-amber">ollama serve</code></Step>
              <Step>Check the model is downloaded: <code className="bg-terminal-bg px-1 rounded text-terminal-amber">ollama pull dolphin-llama3:8b</code></Step>
              <Step>Ensure Ollama is selected in Settings → AI Copilot</Step>
              <Step>Check the Activity Log for error details (Settings → Activity Log)</Step>
            </div>
          </div>

          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white font-semibold mb-3">Chart shows old data</h3>
            <div className="space-y-1 text-gray-300">
              <Step>Chart data is cached for 24 hours to conserve API calls</Step>
              <Step>Intraday charts only show ~8 hours of history (API limitation)</Step>
              <Step>Use Settings → Danger Zone → Clear API Cache to force refresh</Step>
            </div>
          </div>

          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white font-semibold mb-3">Settings not saving</h3>
            <div className="space-y-1 text-gray-300">
              <Step>Settings auto-save when you make changes</Step>
              <Step>Check browser console for errors (View → Developer → Console)</Step>
              <Step>Try Settings → Danger Zone → Reset All Data (last resort)</Step>
            </div>
          </div>

          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white font-semibold mb-3">App feels slow</h3>
            <div className="space-y-1 text-gray-300">
              <Step>Reduce watchlist to essential stocks</Step>
              <Step>Use 15-minute AI interval instead of 5 minutes</Step>
              <Step>Clear old data: Settings → Danger Zone → Clear AI History</Step>
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-terminal-bg border border-terminal-amber/30 rounded-lg p-5">
            <h3 className="text-terminal-amber font-semibold mb-3">Using the Activity Log</h3>
            <p className="text-gray-300 text-sm mb-3">
              RichDad logs all service activity with actionable resolution hints. Access via Settings → Activity Log.
            </p>
            <div className="space-y-1 text-gray-300">
              <Step><span className="text-white">View activity</span> - See date, service, message, and suggested fix</Step>
              <Step><span className="text-white">Take action</span> - Click "How to Fix" links to open help articles, clear cache, or update settings</Step>
              <Step><span className="text-white">Resolve</span> - Click "Resolve" to dismiss individual items or "Resolve All" to clear the log</Step>
              <Step><span className="text-white">Auto-cleanup</span> - Resolved items are deleted after 7 days, unresolved after 30 days</Step>
            </div>
          </div>

          {/* Service Health */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white font-semibold mb-3">Understanding Service Health</h3>
            <p className="text-gray-300 text-sm mb-3">
              RichDad monitors all background services (Market Data, News, AI, WebSocket) and reports their status.
            </p>
            <div className="space-y-1 text-gray-300">
              <Step><span className="text-terminal-up">OK</span> - Service is working normally</Step>
              <Step><span className="text-yellow-400">Degraded</span> - 1-2 recent errors, may recover automatically</Step>
              <Step><span className="text-terminal-down">Error</span> - 3+ consecutive failures, check Activity Log for details</Step>
            </div>
            <p className="text-gray-500 text-xs mt-3">Tip: Most "degraded" services recover on their own within minutes.</p>
          </div>

          {/* Data Freshness */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white font-semibold mb-3">Understanding Data Freshness</h3>
            <p className="text-gray-300 text-sm mb-3">
              Data badges indicate how fresh your market data is:
            </p>
            <div className="space-y-1 text-gray-300">
              <Step><span className="text-terminal-up font-medium">Live</span> - Real-time from Tiingo IEX WebSocket</Step>
              <Step><span className="text-blue-400 font-medium">Fresh</span> - Less than 5 minutes old</Step>
              <Step><span className="text-yellow-400 font-medium">Cached</span> - From cache (1 hour for quotes, 24 hours for charts)</Step>
              <Step><span className="text-gray-400 font-medium">Stale</span> - Older cached data, API may be unavailable</Step>
            </div>
            <p className="text-gray-500 text-xs mt-3">
              Cache helps stay within API limits. Click "Refresh" in charts to force a new fetch.
            </p>
          </div>

          {/* News Not Loading */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white font-semibold mb-3">News not loading</h3>
            <div className="space-y-1 text-gray-300">
              <Step>Check Settings → News Sources to ensure feeds are enabled</Step>
              <Step>RSS feeds may be blocked by network firewalls</Step>
              <Step>Check Activity Log for specific error messages</Step>
            </div>
          </div>

          {/* Sentiment Analysis */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white font-semibold mb-3">Sentiment showing as "keywords"</h3>
            <p className="text-gray-300 text-sm mb-3">
              Sentiment analysis uses a two-tier local system:
            </p>
            <div className="space-y-1 text-gray-300">
              <Step><span className="text-white font-medium">Ollama</span> → Local AI analysis (primary)</Step>
              <Step><span className="text-white font-medium">Keywords</span> → Pattern matching (fallback)</Step>
            </div>
            <p className="text-gray-500 text-xs mt-3">
              If you see "keywords" often, make sure Ollama is running. Start it with: ollama serve
            </p>
          </div>

          {/* Verifying API Keys */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white font-semibold mb-3">How to verify API keys are working</h3>
            <div className="space-y-1 text-gray-300">
              <Step>Go to Settings → Market Data and look for green checkmarks</Step>
              <Step>If a key fails, you'll see a red X with an error message</Step>
              <Step>Check the Activity Log for "API key invalid" or "401 Unauthorized" errors</Step>
              <Step>Try the "Test Connection" button after entering a new key</Step>
            </div>
          </div>
        </div>
      )

    case 'faq':
      return (
        <div className="space-y-8">
          <div>
            <h2 className="text-terminal-amber text-2xl font-bold mb-2">Frequently Asked Questions</h2>
            <p className="text-gray-400">Quick answers to common questions</p>
          </div>

          {[
            {
              q: 'Is RichDad free to use?',
              a: 'Yes! RichDad itself is free. You need a free API key from Tiingo (market data) and Ollama for local AI (also free).'
            },
            {
              q: 'Why do I need to set up API keys myself?',
              a: `RichDad is 100% free and open-source for retail traders. We don't charge anything.

For market data, we use Tiingo which offers a generous free tier (50 tickers/hour). For AI analysis, we use Ollama which runs 100% locally on your computer - completely free with no API key needed.

Think of it like this: RichDad is the car (free), Ollama is the free AI engine, and you just need gas for market data (Tiingo API key).

Want help getting set up? We're happy to help you complete this process for free. Reach out to our support team at support@lovelacex.com and we'll walk you through it.`
            },
            {
              q: 'Do AI recommendations cost money?',
              a: 'No! RichDad uses Ollama which runs 100% locally on your computer. There are no API costs, no rate limits, and no data leaves your machine. It\'s completely free.'
            },
            {
              q: 'How accurate are AI recommendations?',
              a: 'AI provides data-driven insights but cannot predict the future. Check your AI\'s win rate in the Performance panel. Never invest money you can\'t afford to lose.'
            },
            {
              q: 'How is my AI win rate calculated?',
              a: `Your AI win rate (batting average) is calculated from EXECUTED trades only:

Win Rate = Wins ÷ (Wins + Losses) × 100%

- Executed BUY/SELL trades: Count toward win rate
- Skipped recommendations: Logged but DON'T affect win rate
- HOLD recommendations: Marked "neutral" (don't count)
- Pending trades: Not counted until outcome determined
- Expired trades (30+ days): Marked "neutral" (don't count)

View your stats in the AI Panel footer or Settings → Performance.`
            },
            {
              q: 'How are trade outcomes determined (win/loss)?',
              a: `Outcomes are determined by price targets and stop losses:

BUY trades:
- WIN: Price hits your target (price went UP)
- LOSS: Price hits stop loss (price went DOWN)

SELL trades:
- WIN: Price hits your target (price went DOWN)
- LOSS: Price hits stop loss (price went UP)

HOLD recommendations are always marked "neutral" and don't affect your batting average.

Trades are monitored for up to 30 days. If neither target is hit, the trade becomes "neutral".`
            },
            {
              q: 'Do skipped recommendations affect my stats?',
              a: `No! Skipped recommendations are logged for your reference, but they DON'T count toward your win rate.

This lets you:
- Track recommendations you disagreed with
- Compare "what if I had executed" scenarios
- Learn from trades you passed on

Only EXECUTED trades affect your batting average.`
            },
            {
              q: 'How does the AI decide BUY/SELL/HOLD?',
              a: `The AI analyzes:
1. Technical indicators (RSI, MACD, moving averages)
2. Candlestick patterns (Engulfing, Hammer, Doji)
3. Market regime (VIX levels + SPY trend)
4. Recent news sentiment

In volatile markets (VIX >25), it becomes more cautious. In choppy markets, it favors HOLD. Each recommendation includes a confidence % and rationale.`
            },
            {
              q: 'Can I use RichDad for day trading?',
              a: 'With the Free plan (Tiingo Starter, 50 tickers/hour), it works well for swing trading with a focused watchlist. For active day trading, upgrade to Tiingo Power ($10/mo) for 5,000 tickers/hour.'
            },
            {
              q: 'Why does only SPY get 5-minute data?',
              a: 'To stay within API limits, RichDad prioritizes SPY (most traded ETF) for intraday data. Other symbols use daily data to conserve calls.'
            },
            {
              q: 'Where is my data stored?',
              a: 'All data is stored locally on your computer in IndexedDB. Nothing is sent to external servers except API calls to your chosen providers.'
            },
            {
              q: 'Can I export my trade history?',
              a: 'Yes! Go to Settings → My Profile → Export Trade Decisions. You can export to CSV or TXT.'
            },
            {
              q: 'How do I track my portfolio holdings?',
              a: 'Go to Settings → Portfolio to view and manage your holdings. Holdings auto-update when you use BUY/SELL from the chart with shares specified.'
            },
            {
              q: 'How do I backup my data?',
              a: 'Go to Settings → Danger Zone → Backup & Restore → Export Backup. This creates a JSON file with all your settings, trades, holdings, and alerts.'
            },
            {
              q: 'How do I restore from a backup?',
              a: 'Go to Settings → Danger Zone → Backup & Restore → Import Backup. Select your backup JSON file. Warning: This replaces all current data.'
            },
            {
              q: 'How do I reset everything?',
              a: 'Settings → Danger Zone → Reset All Data. This clears all settings, history, and shows onboarding again.'
            },
            {
              q: 'What is the First Launch Wizard?',
              a: `When you first open RichDad, you'll see a 5-step onboarding wizard:

1. Welcome - Introduction to RichDad
2. Terms of Service - Accept the terms
3. Path Selection - Choose Free or Pro
4. API Key Setup - Enter your market data API key
5. AI Provider - Configure your AI provider

You can skip any step by clicking the X button. To re-run the wizard, go to Settings → Danger Zone → Reset All Data.`
            },
            {
              q: 'What happens when I hit rate limits?',
              a: `Rate limits apply to market data, not AI:

- Tiingo Starter: 50 unique tickers/hour (free)
- Tiingo Power: 5,000 unique tickers/hour ($10/mo)
- Ollama (AI): No limits - runs locally!

When market data is rate limited:
- Data falls back to cached values
- Charts show "cached" freshness badge
- Limits reset hourly`
            },
            {
              q: 'What is the AI Thinking Animation?',
              a: `When AI analyzes a ticker, you now see its step-by-step thinking process:
1. Checking Market Regime (VIX + SPY trend)
2. Fetching Price Data (current quote)
3. Calculating Indicators (RSI, MACD, MAs)
4. Detecting Patterns (candlestick patterns)
5. Gathering News (RSS feeds)
6. Generating Recommendation (AI synthesis)

Each step shows a result preview (e.g., "RSI 65", "2 patterns found").`
            },
            {
              q: 'Can the AI analyze stocks not in my watchlist?',
              a: `Yes! The AI can analyze any stock you ask about. When you mention a ticker not in your watchlist:

1. Real-time quote is fetched from Tiingo
2. 90 days of historical data is retrieved
3. Full technical analysis is calculated (RSI, MACD, Bollinger, ATR)
4. You get the same quality analysis as watchlist stocks

Each lookup uses 2 API calls from your hourly budget (50/hr free, 5,000/hr pro). For stocks you check frequently, add them to your watchlist for cached access.`
            },
            {
              q: 'What happens when I ask about historical prices?',
              a: `Historical questions (e.g., "What was AAPL price in 2022?") are answered via web search, which is FREE and doesn't use your API budget.

The AI detects historical patterns in your question and automatically searches DuckDuckGo. Results include sourced links so you can verify the information.

This works the same for both Free and Pro tiers - no API calls are used for historical lookups.`
            },
            {
              q: 'How does the AI get news for analysis?',
              a: `News comes from RSS feeds (free, unlimited):
- General market news from sources like Bloomberg, CNBC, Reuters
- AI matches news to tickers by keyword
- Configure your feeds in Settings → News Sources
- Works well for popular stocks with regular coverage`
            },
            {
              q: 'Why is my chart data delayed?',
              a: `Tiingo's free tier (Starter) provides IEX real-time data for stocks traded on IEX. For other exchanges, data may have slight delays.

The chart header shows your current data source and last update time.`
            },
            {
              q: 'How do I validate AI performance with backtesting?',
              a: `Use the Backtest feature (Cmd/Ctrl+4) to test AI recommendations against historical data:

1. Select a symbol and date range
2. Set confidence threshold and position size
3. Run backtest - the AI will analyze each historical day
4. Review win rate, profit factor, Sharpe ratio
5. Get optimization suggestions

This helps you understand the AI's reliability before live trading. Note: Past performance doesn't guarantee future results.`
            },
            {
              q: 'Can the AI learn from my past trades?',
              a: `Coming soon! We're building a Hybrid Memory System that will:

- Store outcomes of past AI recommendations
- Find similar historical scenarios when analyzing new ones
- Include past performance context in AI prompts
- Track which patterns work best for you

This will let the AI learn from YOUR trading patterns without requiring a local AI model.`
            },
            {
              q: 'Is my data private and secure?',
              a: `Yes! Your data stays on YOUR device:

- All settings, trades, and history stored locally in IndexedDB
- API keys encrypted and never shared
- Only AI prompts are sent to your chosen AI provider
- No analytics, tracking, or data collection by RichDad
- No account required - no data leaves your machine

You own your data. You can export or delete it anytime from Settings.`
            },
            {
              q: 'How do I install Ollama?',
              a: `Ollama is free and easy to install:

macOS: Download from ollama.com or run "brew install ollama"
Windows: Download from ollama.com

After installation, run: ollama pull dolphin-llama3:8b

This downloads the recommended AI model (~5GB). See Help → Ollama Setup for detailed instructions.`
            },
            {
              q: 'Why is Ollama not connecting?',
              a: `Common fixes:

1. Make sure Ollama is running (look for llama icon in menu bar/system tray)
2. Try running "ollama serve" in terminal
3. Verify the model is downloaded: "ollama list" should show dolphin-llama3:8b
4. Check if port 11434 is available (Ollama's default port)
5. Restart Ollama and RichDad

If still not working, see Help → Ollama Setup → Troubleshooting.`
            },
            {
              q: 'What are the system requirements for Ollama?',
              a: `Minimum requirements:
- 8GB RAM (16GB recommended)
- 10GB free disk space
- macOS 11+ or Windows 10+

The AI runs on your CPU by default. If you have an NVIDIA GPU with 8GB+ VRAM, Ollama will automatically use it for faster responses.

Tip: Close other memory-intensive apps while using AI for best performance.`
            },
            {
              q: 'Can I use a different AI model with Ollama?',
              a: `Yes! While dolphin-llama3:8b is recommended, you can use any Ollama model:

1. Download a model: "ollama pull mistral:7b"
2. Go to Settings → AI Copilot
3. Enter the model name in "Custom Model Name"

Popular alternatives:
- llama3.1:8b - More cautious recommendations
- mistral:7b - Faster, smaller model
- dolphin-mistral:7b - Uncensored, smaller than dolphin-llama3`
            },
            {
              q: 'Why use Ollama instead of OpenAI/Claude?',
              a: `Ollama has key advantages for trading analysis:

1. Free - No API costs or subscriptions
2. Private - Your data never leaves your computer
3. Uncensored - Gives direct BUY/SELL recommendations
4. No rate limits - Analyze as much as you want
5. Offline capable - Works without internet (after model download)

Cloud AI providers have safety guardrails that prevent direct trading advice. Local models like dolphin-llama3 are fine-tuned to be helpful without excessive disclaimers.`
            },
            {
              q: 'Why use RichDad vs TradingView or NinjaTrader?',
              a: `RichDad is different:

✓ AI-Powered Analysis - Built-in AI copilot, not just charting
✓ Free Data Options - Aggregate multiple free data providers
✓ Desktop-Native - Fast, offline-capable, no browser tabs
✓ You Choose Providers - Pick your own AI and data sources
✓ No Subscription Required - Core features are free forever
✓ Privacy-First - All data stays on your device

TradingView excels at social features and broker integration. NinjaTrader is best for futures and advanced backtesting. RichDad is your AI-powered analysis companion.`
            },
          ].map(({ q, a }, i) => (
            <div key={i} className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
              <h3 className="text-white font-semibold mb-2">{q}</h3>
              <p className="text-gray-300 whitespace-pre-line">{a}</p>
            </div>
          ))}
        </div>
      )

    case 'terms':
      return (
        <div className="space-y-8">
          <div>
            <h2 className="text-terminal-amber text-2xl font-bold mb-2">Terms & Conditions</h2>
            <p className="text-gray-400">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="space-y-6 text-gray-300">
            <div>
              <h3 className="text-white font-semibold mb-2">1. Acceptance of Terms</h3>
              <p>By using RichDad, you agree to these terms and conditions. This software is provided "as is" without warranty of any kind. Trading involves risk and you should never invest more than you can afford to lose.</p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">2. Investment Disclaimer</h3>
              <p>RichDad is an <span className="text-terminal-amber">informational tool</span> and does not provide financial advice. All AI-generated recommendations are for educational purposes only. You are solely responsible for your trading decisions. Past performance does not guarantee future results.</p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">3. API Keys & Privacy</h3>
              <p>Your API keys are stored locally on your device using IndexedDB with AES-256 encryption. We never transmit your keys to external servers. You are responsible for keeping your API keys secure and complying with each provider's terms of service.</p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">4. Data Usage</h3>
              <p>RichDad operates in a local-first manner. Market data and news are fetched from your configured API providers. We do not collect, store, or share your trading data, decisions, or personal information on any remote servers.</p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">5. Risk Acknowledgment</h3>
              <p>Trading stocks, options, and other financial instruments involves <span className="text-terminal-down">substantial risk of loss</span>. You acknowledge that you understand these risks and that RichDad's AI recommendations should not be your sole basis for making investment decisions.</p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">6. Limitation of Liability</h3>
              <p>The developers of RichDad shall not be liable for any direct, indirect, incidental, special, or consequential damages arising from your use of this software, including but not limited to financial losses.</p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">7. License</h3>
              <p>RichDad is provided under the MIT License. You are free to use, modify, and distribute this software in accordance with the license terms.</p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">8. Updates & Changes</h3>
              <p>We reserve the right to modify these terms at any time. Continued use of RichDad after changes constitutes acceptance of the updated terms.</p>
            </div>
          </div>
        </div>
      )

    case 'privacy':
      return (
        <div className="space-y-8">
          <div>
            <h2 className="text-terminal-amber text-2xl font-bold mb-2">Privacy Policy</h2>
            <p className="text-gray-400">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          {/* Privacy Promise Banner */}
          <div className="bg-terminal-up/10 border border-terminal-up/30 rounded-lg p-6">
            <h3 className="text-terminal-up text-lg font-bold mb-4 flex items-center gap-2">
              <Shield size={20} />
              Our Privacy Promise
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Check size={18} className="text-terminal-up flex-shrink-0" />
                <div>
                  <p className="text-white font-medium">No Ads, No Trackers</p>
                  <p className="text-gray-400 text-sm">Ever. Period.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check size={18} className="text-terminal-up flex-shrink-0" />
                <div>
                  <p className="text-white font-medium">Your Trades Are Yours</p>
                  <p className="text-gray-400 text-sm">Local storage only</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check size={18} className="text-terminal-up flex-shrink-0" />
                <div>
                  <p className="text-white font-medium">No Crowdsourcing</p>
                  <p className="text-gray-400 text-sm">We don't harvest your strategy</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check size={18} className="text-terminal-up flex-shrink-0" />
                <div>
                  <p className="text-white font-medium">Desktop = Your IP</p>
                  <p className="text-gray-400 text-sm">No cloud servers collecting data</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 text-gray-300">
            <div>
              <h3 className="text-white font-semibold mb-2">Data Collection</h3>
              <p>RichDad does <span className="text-terminal-up font-medium">NOT</span> collect, transmit, or store any personal data on external servers. There are no RichDad servers - the app runs entirely on your machine.</p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">Local Storage Only</h3>
              <p className="mb-2">All data stays on your computer:</p>
              <div className="space-y-1">
                <Step>API keys - stored locally in IndexedDB</Step>
                <Step>Trade decisions - your trading journal stays private</Step>
                <Step>AI conversations - never sent to our servers (we have none)</Step>
                <Step>Settings and preferences - IndexedDB, localStorage</Step>
              </div>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">Third-Party API Calls</h3>
              <p className="mb-2">Your computer makes direct API calls to:</p>
              <div className="space-y-1">
                <Step>Tiingo (market data) - subject to their privacy policy</Step>
                <Step>Your chosen AI provider - subject to their privacy policy</Step>
                <Step>RSS feeds (news sources) - publicly available data</Step>
              </div>
              <p className="text-gray-400 text-sm mt-2">
                These calls go directly from your machine to the provider. RichDad never sees or proxies this traffic.
              </p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">No Analytics or Tracking</h3>
              <p>RichDad contains zero analytics, telemetry, cookies, or tracking pixels. We don't know how you use the app, and we prefer it that way.</p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">Why Desktop?</h3>
              <p>We built RichDad as a desktop app specifically for privacy. Unlike web apps that require servers, your trading data never leaves your machine. Your strategy is your intellectual property - we're not interested in monetizing it.</p>
            </div>
          </div>
        </div>
      )

    case 'security':
      return (
        <div className="space-y-8">
          <div>
            <h2 className="text-terminal-amber text-2xl font-bold mb-2">Security</h2>
            <p className="text-gray-400">How RichDad protects your data</p>
          </div>

          {/* Security Highlights */}
          <div className="bg-terminal-amber/10 border border-terminal-amber/30 rounded-lg p-6">
            <h3 className="text-terminal-amber text-lg font-bold mb-4 flex items-center gap-2">
              <Shield size={20} />
              Secure by Design
            </h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-terminal-amber text-lg">•</span>
                <p className="text-gray-300"><span className="text-white font-medium">No Remote Servers</span> - RichDad has no backend. Your data can't be leaked because it's never collected.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-terminal-amber text-lg">•</span>
                <p className="text-gray-300"><span className="text-white font-medium">Open Source</span> - Every line of code is auditable. We have nothing to hide.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-terminal-amber text-lg">•</span>
                <p className="text-gray-300"><span className="text-white font-medium">Minimal Permissions</span> - Built with Tauri, RichDad requests only what it needs.</p>
              </div>
            </div>
          </div>

          <div className="space-y-6 text-gray-300">
            <div>
              <h3 className="text-white font-semibold mb-2">API Key Storage</h3>
              <p>API keys are stored locally in IndexedDB on your computer. They are never transmitted to RichDad servers (there are no RichDad servers). Keys stay on your machine, period.</p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">Best Practices</h3>
              <div className="space-y-1">
                <Step>Use read-only API keys when possible</Step>
                <Step>Never share your API keys</Step>
                <Step>Rotate keys periodically</Step>
                <Step>Set spending limits on AI provider accounts</Step>
                <Step>Use Settings → Danger Zone to wipe data if needed</Step>
              </div>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">Tauri Security</h3>
              <p className="mb-2">RichDad is built with Tauri, a security-focused framework that:</p>
              <div className="space-y-1">
                <Step>Runs with minimal system permissions</Step>
                <Step>Sandboxes web content from system resources</Step>
                <Step>Uses Content Security Policy (CSP)</Step>
                <Step>Has a smaller attack surface than Electron</Step>
              </div>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">What We Can't Access</h3>
              <p>Since RichDad has no servers, we literally cannot:</p>
              <div className="space-y-1 mt-2">
                <Step>See your API keys</Step>
                <Step>View your trade history</Step>
                <Step>Read your AI conversations</Step>
                <Step>Track your watchlist or strategies</Step>
                <Step>Identify you in any way</Step>
              </div>
            </div>
          </div>
        </div>
      )

    case 'about':
      return (
        <div className="space-y-8">
          <div>
            <h2 className="text-terminal-amber text-2xl font-bold mb-2">About RichDad</h2>
            <p className="text-gray-400">AI-Powered Trading Co-Pilot for Retail Investors</p>
          </div>

          <div className="bg-terminal-bg border border-terminal-amber/30 rounded-lg p-6 text-center">
            <h3 className="text-terminal-amber text-3xl font-bold">RichDad v7.0.0</h3>
            <p className="text-gray-500 text-sm mt-2">Local-First AI • 100% Private • No Cloud Dependencies</p>
          </div>

          {/* Why RichDad - Bloomberg Comparison */}
          <div>
            <h3 className="text-white font-semibold mb-3">Why RichDad?</h3>
            <div className="bg-terminal-bg border border-terminal-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-terminal-border">
                    <th className="text-left text-gray-400 px-3 py-2 font-medium">Feature</th>
                    <th className="text-left text-gray-400 px-3 py-2 font-medium">Bloomberg</th>
                    <th className="text-left text-gray-400 px-3 py-2 font-medium">RichDad</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  <tr className="border-b border-terminal-border/50">
                    <td className="px-3 py-2 text-gray-300">Cost</td>
                    <td className="px-3 py-2 text-gray-500">$24,000/year</td>
                    <td className="px-3 py-2 text-terminal-up font-medium">Free</td>
                  </tr>
                  <tr className="border-b border-terminal-border/50">
                    <td className="px-3 py-2 text-gray-300">AI Analysis</td>
                    <td className="px-3 py-2 text-gray-500">None built-in</td>
                    <td className="px-3 py-2 text-terminal-up font-medium">Local Ollama + batting avg</td>
                  </tr>
                  <tr className="border-b border-terminal-border/50">
                    <td className="px-3 py-2 text-gray-300">Privacy</td>
                    <td className="px-3 py-2 text-gray-500">Cloud, logged</td>
                    <td className="px-3 py-2 text-terminal-up font-medium">100% local</td>
                  </tr>
                  <tr className="border-b border-terminal-border/50">
                    <td className="px-3 py-2 text-gray-300">Trade Journal</td>
                    <td className="px-3 py-2 text-gray-500">Basic</td>
                    <td className="px-3 py-2 text-terminal-up font-medium">Outcome tracking</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 text-gray-300">Setup</td>
                    <td className="px-3 py-2 text-gray-500">IT dept required</td>
                    <td className="px-3 py-2 text-terminal-up font-medium">5 minutes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Our Moat */}
          <div>
            <h3 className="text-white font-semibold mb-3">Our Edge</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-terminal-amber">•</span>
                <p className="text-gray-300 text-sm"><span className="text-white font-medium">AI-First</span> - Intelligence, not just data</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-terminal-amber">•</span>
                <p className="text-gray-300 text-sm"><span className="text-white font-medium">Human vs AI Scorecard</span> - Track if you're beating your copilot</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-terminal-amber">•</span>
                <p className="text-gray-300 text-sm"><span className="text-white font-medium">Outcome Accountability</span> - We track if recommendations worked</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-terminal-amber">•</span>
                <p className="text-gray-300 text-sm"><span className="text-white font-medium">Open Source</span> - Every line auditable</p>
              </div>
            </div>
          </div>

          {/* Our Philosophy */}
          <div className="bg-gradient-to-r from-terminal-amber/10 to-transparent border-l-2 border-terminal-amber rounded-r-lg p-5">
            <h3 className="text-white font-semibold mb-3">Our Philosophy</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              RichDad is a <span className="text-terminal-amber font-medium">conduit for greatness</span>. We aggregate the best free and paid data sources,
              AI providers, and analysis tools so you can make informed decisions.
            </p>
            <div className="mt-4 space-y-2 text-sm text-gray-400">
              <p>• <span className="text-white">You choose your providers</span> - Pick free tiers or premium subscriptions</p>
              <p>• <span className="text-white">You control your data</span> - Everything stays on your device</p>
              <p>• <span className="text-white">You own your strategy</span> - We provide tools, you make decisions</p>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3">Developer</h3>
            <p className="text-gray-300">
              <button
                onClick={() => openUrl('https://github.com/LovelaceX')}
                className="text-terminal-amber font-medium hover:underline cursor-pointer"
              >
                LovelaceX
              </button>
            </p>
            <p className="text-gray-400 text-sm">Building tools for traders at the intersection of AI and finance.</p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3">Contact</h3>
            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-4 flex items-center gap-3">
              <Mail size={20} className="text-terminal-amber" />
              <button
                onClick={() => openUrl('mailto:support@lovelacex.com')}
                className="text-terminal-amber hover:underline cursor-pointer"
              >
                support@lovelacex.com
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3">Technology Stack</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Framework', value: 'Tauri 2.x (Rust + React)' },
                { label: 'Frontend', value: 'React 18 + TypeScript' },
                { label: 'State', value: 'Zustand' },
                { label: 'Database', value: 'IndexedDB (Dexie.js)' },
                { label: 'Charts', value: 'Lightweight Charts' },
                { label: 'AI', value: 'Ollama (Local)' },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-2">
                  <span className="text-terminal-amber">{label}:</span>
                  <span className="text-gray-300">{value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )

    case 'report-issue':
      return (
        <div className="space-y-8">
          <div>
            <h2 className="text-terminal-amber text-2xl font-bold mb-2">Report an Issue</h2>
            <p className="text-gray-400">Found a bug or have a feature request?</p>
          </div>

          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-6">
            <p className="text-gray-300 mb-4">
              Help us improve RichDad by reporting issues on GitHub.
            </p>
            <button
              onClick={() => openUrl('https://github.com/LovelaceX/richdad/issues')}
              className="flex items-center gap-2 px-4 py-2 bg-terminal-amber text-black rounded font-medium hover:bg-amber-500 transition-colors"
            >
              Open GitHub Issues
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Before Reporting</h3>
            <div className="space-y-1">
              <Step>Check if your issue already exists in open issues</Step>
              <Step>Include your RichDad version (found in About section)</Step>
              <Step>Describe steps to reproduce the problem</Step>
              <Step>Include any error messages you see</Step>
            </div>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">What to Include</h3>
            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-terminal-amber font-bold">1.</span>
                <span className="text-gray-300">Operating system (macOS/Windows) and version</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-terminal-amber font-bold">2.</span>
                <span className="text-gray-300">What you expected to happen</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-terminal-amber font-bold">3.</span>
                <span className="text-gray-300">What actually happened</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-terminal-amber font-bold">4.</span>
                <span className="text-gray-300">Screenshots if applicable</span>
              </div>
            </div>
          </div>
        </div>
      )

    case 'support':
      return (
        <div className="space-y-8">
          <div>
            <h2 className="text-terminal-amber text-2xl font-bold mb-2">Support Development</h2>
            <p className="text-gray-400">Help us keep RichDad free and open-source</p>
          </div>

          <div className="bg-gradient-to-br from-terminal-amber/10 to-terminal-amber/5 border border-terminal-amber/30 rounded-lg p-6 text-center space-y-4">
            <p className="text-gray-300 leading-relaxed max-w-lg mx-auto">
              We hope you're enjoying the app as much as we enjoyed building it.
            </p>
            <p className="text-gray-400 text-sm leading-relaxed max-w-lg mx-auto">
              As an independent team maintaining free and open-source software, we rely on community support.
              If you'd like to say thanks or help us continue, any tip is greatly appreciated and goes directly toward future development.
            </p>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => openUrl('https://www.paypal.com/ncp/payment/BWTA5MZYMTEDG')}
              className="bg-[#0070ba] hover:bg-[#005ea6] text-white px-8 py-4 rounded-lg font-semibold transition-colors shadow-lg hover:shadow-xl"
            >
              Tip via PayPal
            </button>
          </div>

          <div className="text-center">
            <p className="text-gray-500 text-sm">
              Built with 💛 by <span className="text-terminal-amber">LovelaceX</span>
            </p>
          </div>
        </div>
      )

    case 'tiers':
      return (
        <div className="space-y-8">
          <div>
            <h2 className="text-terminal-amber text-2xl font-bold mb-2">Pricing Tiers</h2>
            <p className="text-gray-400">Compare Free and Pro setup paths</p>
          </div>

          <p className="text-gray-300">
            RichDad offers two setup paths based on your needs. You can switch between Free and Pro anytime in <span className="text-terminal-amber">Settings → Market Data</span>.
          </p>

          <div className="grid grid-cols-2 gap-6">
            {/* Free Tier */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <Leaf size={24} className="text-green-400" />
                <span className="text-green-400 font-bold text-xl">Free</span>
              </div>
              <p className="text-green-400/80 text-sm mb-4">$0/month - Perfect for getting started</p>
              <div className="text-sm text-gray-300 space-y-3">
                <div className="flex items-start gap-2">
                  <Check size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Tiingo Starter (50 tickers/hour)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Ollama AI (local, unlimited)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                  <span>RSS news feeds</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                  <span>IEX real-time data</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                  <span>30+ years historical data</span>
                </div>
              </div>
            </div>

            {/* Pro Tier */}
            <div className="bg-terminal-amber/10 border border-terminal-amber/30 rounded-lg p-5 relative">
              <div className="absolute -top-2 right-3 bg-terminal-amber text-black text-[10px] font-bold px-2 py-0.5 rounded">
                RECOMMENDED
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Crown size={24} className="text-terminal-amber" />
                <span className="text-terminal-amber font-bold text-xl">Pro</span>
              </div>
              <p className="text-terminal-amber/80 text-sm mb-4">$10/mo for Tiingo Power tier</p>
              <div className="text-sm text-gray-300 space-y-3">
                <div className="flex items-start gap-2">
                  <Check size={16} className="text-terminal-amber mt-0.5 flex-shrink-0" />
                  <span>Tiingo Power (5,000 tickers/hour)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={16} className="text-terminal-amber mt-0.5 flex-shrink-0" />
                  <span>Ollama AI (local, unlimited)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={16} className="text-terminal-amber mt-0.5 flex-shrink-0" />
                  <span>Unlimited RSS feeds</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={16} className="text-terminal-amber mt-0.5 flex-shrink-0" />
                  <span>30+ years historical data</span>
                </div>
              </div>
            </div>
          </div>

          <SectionDivider />

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Feature Comparison</h3>
            <div className="bg-terminal-bg border border-terminal-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-terminal-border">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Feature</th>
                    <th className="text-center py-3 px-4 text-green-400 font-medium">Free</th>
                    <th className="text-center py-3 px-4 text-terminal-amber font-medium">Pro</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-terminal-border/50">
                    <td className="py-2 px-4">Market Data Provider</td>
                    <td className="py-2 px-4 text-center">Tiingo Starter</td>
                    <td className="py-2 px-4 text-center">Tiingo Power</td>
                  </tr>
                  <tr className="border-b border-terminal-border/50">
                    <td className="py-2 px-4">API Limits</td>
                    <td className="py-2 px-4 text-center">50 tickers/hour</td>
                    <td className="py-2 px-4 text-center text-terminal-amber">5,000 tickers/hour</td>
                  </tr>
                  <tr className="border-b border-terminal-border/50">
                    <td className="py-2 px-4">AI Provider</td>
                    <td className="py-2 px-4 text-center">Ollama (Local)</td>
                    <td className="py-2 px-4 text-center">Ollama (Local)</td>
                  </tr>
                  <tr className="border-b border-terminal-border/50">
                    <td className="py-2 px-4">Historical Data</td>
                    <td className="py-2 px-4 text-center">30+ years</td>
                    <td className="py-2 px-4 text-center text-terminal-amber">30+ years</td>
                  </tr>
                  <tr className="border-b border-terminal-border/50">
                    <td className="py-2 px-4">News Sources</td>
                    <td className="py-2 px-4 text-center">3 RSS feeds</td>
                    <td className="py-2 px-4 text-center">Unlimited RSS</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4">Data Freshness</td>
                    <td className="py-2 px-4 text-center">IEX Real-time</td>
                    <td className="py-2 px-4 text-center">IEX Real-time</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-terminal-border/30 rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm">
              Switch between Free and Pro at any time in <span className="text-terminal-amber">Settings → Market Data</span>. Your API keys are preserved when switching.
            </p>
          </div>
        </div>
      )

    default:
      return <p className="text-gray-400">Content not found.</p>
  }
}
