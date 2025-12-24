import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, BookOpen, Zap, BarChart3, Keyboard, HelpCircle, Shield, FileText, Mail,
  Search, Gauge, AlertTriangle, Database, TrendingUp, Bell, Eye, Check, Calendar, ExternalLink, Bug, Sparkles, Activity,
  Crown, Star, Leaf, Heart, ClipboardCheck, Square, CheckSquare
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
  | 'economic-calendar'
  | 'intel-panel'
  | 'price-alerts'
  | 'chart-guide'
  | 'ai-copilot'
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
    searchableText: 'setup api key configure begin first install alpha vantage openai claude gemini grok deepseek llama groq settings dashboard news watchlist price alerts chart controls keyboard shortcuts api limits troubleshooting quick links step by step guide free account paste copy'
  },
  'verify-setup': {
    title: 'Verify Your Setup',
    searchableText: 'verify check test working setup complete checklist confirmation api key data news ai sentiment market prices onboarding validate confirm everything working chart loading prices updating news scrolling ai responding'
  },
  'whats-new': {
    title: "What's New",
    searchableText: 'new features update release latest backtest macd stochastic indicators calendar briefing v5.2.0 v5.1.0 v5.0.0 error log service health api key encryption watchlist news lru cache websocket reconnect jitter data freshness badges hover tooltips request cancellation loading state error state empty state race condition vti smh vxx market indices type safe event system crash isolation ai copilot backtesting historical data win rate profit factor sharpe ratio csv export technical indicator panels momentum trend direction rsi oscillator volume profile'
  },
  'tiers': {
    title: 'Pricing Tiers',
    searchableText: 'tier tiers free standard premium pricing cost plan subscription upgrade downgrade polygon twelvedata groq openai claude anthropic intraday data market history real-time delayed 15 minute delay rss finnhub alpha vantage news sources ai provider llama gpt-4 budget calls per day historical backtest'
  },
  'dashboard': {
    title: 'Dashboard',
    searchableText: 'home main overview layout panels chart watchlist news ticker ai panel market data live prices real-time trading view candlestick technical analysis top bar navigation sidebar'
  },
  'watchlist': {
    title: 'Watchlist',
    searchableText: 'market watch stocks symbols add remove track ticker price change percent volume favorite save delete edit search filter sort'
  },
  'news': {
    title: 'Market News',
    searchableText: 'headlines feed sentiment filter rss sources finnhub alpha vantage breaking news articles positive negative neutral bullish bearish market sentiment analysis ticker relevance hugging face finbert ai keywords fallback headline limit news sources'
  },
  'economic-calendar': {
    title: 'Economic Calendar',
    searchableText: 'finnhub cpi jobs fed gdp fomc economic events calendar interest rate inflation employment nonfarm payroll consumer price index federal reserve meeting minutes pmi manufacturing services housing starts retail sales'
  },
  'intel-panel': {
    title: 'Intelligence Panel',
    searchableText: 'intel pattern scanner news sentiment breaking alerts bullish bearish setup engulfing doji hammer shooting star morning star evening star three white soldiers technical patterns candlestick patterns chart patterns automatic pattern scan auto scan manual scan api calls per symbol watchlist scan 15 minutes free tier paid tier polygon starter twelvedata pro'
  },
  'price-alerts': {
    title: 'Price Alerts',
    searchableText: 'notification alert trigger above below target price stop loss take profit sound notification push alert email sms crosses reaches hits'
  },
  'chart-guide': {
    title: 'Chart Controls',
    searchableText: 'candlestick timeframe zoom pan daily intraday weekly monthly 1 minute 5 minute 15 minute 1 hour 4 hour drawing tools trendline support resistance fibonacci moving average bollinger bands volume indicator overlay'
  },
  'ai-copilot': {
    title: 'AI Copilot',
    searchableText: 'openai claude gemini grok deepseek groq llama recommendation chat provider morning briefing briefing thinking animation phases finnhub news buy call buy put options options-aware call put leverage buy sell hold confidence technical analysis sentiment market regime risk management position size stop loss take profit price target rationale explanation ai analysis automatic manual trigger chat interface conversation history performance tracking win rate accuracy options trading suggestions rate limit unlimited fallback'
  },
  'api-limits': {
    title: 'API Limits & Usage',
    searchableText: 'rate limit quota calls daily budget alpha vantage polygon massive twelvedata finnhub fasttrack fallback free tier starter developer professional 5 calls per minute 25 calls per day usage tracking budget warning exceeded throttle'
  },
  'shortcuts': {
    title: 'Keyboard Shortcuts',
    searchableText: 'hotkey cmd ctrl key command control alt shift meta keyboard navigation dashboard news settings backtest zoom in zoom out reset new window find search focus'
  },
  'troubleshooting': {
    title: 'Troubleshooting',
    searchableText: 'error fix problem not working issue help debug crash freeze slow loading blank screen no data connection failed timeout api error rate limit exceeded invalid key authentication failed network error clear cache reset refresh restart reinstall activity log service health data freshness stale cached fresh live news sentiment keywords finbert hugging face verify api key'
  },
  'faq': {
    title: 'FAQ',
    searchableText: 'question answer common frequently asked questions how do i what is why does can i should i when will how to onboarding wizard first launch rate limit'
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
    { id: 'economic-calendar', label: 'Economic Calendar', icon: Calendar },
    { id: 'intel-panel', label: 'Intelligence Panel', icon: Activity },
    { id: 'price-alerts', label: 'Price Alerts', icon: Bell },
    { id: 'chart-guide', label: 'Chart Controls', icon: BarChart3 },
    { id: 'ai-copilot', label: 'AI Copilot', icon: Zap },
    { id: 'api-limits', label: 'API Limits & Usage', icon: Gauge },
    { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
    { id: 'troubleshooting', label: 'Troubleshooting', icon: AlertTriangle },
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
    { id: 'terms', label: 'Terms of Service', icon: FileText },
    { id: 'privacy', label: 'Privacy Policy', icon: Shield },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'about', label: 'About', icon: Mail },
    { id: 'report-issue', label: 'Report Issue', icon: Bug },
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
              <span className="text-gray-500 text-sm">v5.2.0</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-terminal-border rounded transition-colors"
            >
              <X size={18} className="text-gray-400 hover:text-white" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="px-6 py-3 border-b border-terminal-border">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documentation..."
                className="w-full bg-terminal-bg border border-terminal-border rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-gray-500 text-sm focus:border-terminal-amber focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 border-r border-terminal-border bg-terminal-bg p-4 overflow-y-auto">
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
              <Step><QuickLink to="ai-copilot">Setting Up AI Providers</QuickLink></Step>
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
                <p className="text-green-400 font-medium mb-2">🌱 Free Path ($0/month)</p>
                <Step><span className="text-white">TwelveData</span> - 800 calls/day free tier</Step>
                <Step><span className="text-white">Groq (Llama 3)</span> - Completely free AI</Step>
                <Step>RSS news feeds included</Step>
              </div>

              <div className="border-t border-terminal-border pt-4">
                <p className="text-terminal-amber font-medium mb-2">⭐ Standard Path (Recommended)</p>
                <Step><span className="text-white">Polygon.io</span> - Reliable market data (5 calls/min free)</Step>
                <Step><span className="text-white">OpenAI GPT-4</span> - Best analysis (~$5-20/month)</Step>
                <Step>Finnhub news + Economic calendar</Step>
              </div>

              <div className="border-t border-terminal-border pt-4">
                <p className="text-purple-400 font-medium mb-2">👑 Premium Path</p>
                <Step><span className="text-white">Polygon.io</span> paid tier (faster, more data)</Step>
                <Step><span className="text-white">Anthropic Claude</span> - Superior reasoning</Step>
                <Step>All news sources + Alpha Vantage</Step>
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
              <Step>Then: Navigate to <span className="text-white font-medium">AI Copilot</span> → configure your AI provider</Step>
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
                hint="Look for 'Polygon', 'TwelveData', or 'Alpha Vantage' badge near chart"
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
            {/* v5.2.0 */}
            <div className="bg-terminal-bg border border-green-500/30 rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-green-500/20 text-green-400 text-xs px-2 py-0.5 rounded">v5.2.0</span>
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
                <li>• <span className="text-green-400">Stochastic RSI</span> - Overbought/oversold signals</li>
                <li>• Synchronized crosshair with main chart</li>
                <li>• Toggle visibility via chart header</li>
              </ul>
            </div>

            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-purple-500/20 text-purple-400 text-xs px-2 py-0.5 rounded">NEW</span>
                <h3 className="text-white font-semibold">Economic Calendar</h3>
              </div>
              <p className="text-gray-300 text-sm mb-3">
                Track major US economic events using FRED API data.
              </p>
              <ul className="text-gray-400 text-sm space-y-1">
                <li>• CPI, Jobs Report, Fed Decisions, GDP releases</li>
                <li>• Countdown timers to upcoming events</li>
                <li>• Color-coded by market impact</li>
              </ul>
              <p className="text-gray-500 text-xs mt-3">Requires free FRED API key from fred.stlouisfed.org</p>
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
                <li>• Provider badge shows data source (Polygon, TwelveData, etc.)</li>
                <li>• Timestamp shows when data was last refreshed</li>
                <li>• Delay indicator for free tier data (15-min)</li>
                <li>• Hover for detailed source info</li>
              </ul>
            </div>

            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-0.5 rounded">IMPROVED</span>
                <h3 className="text-white font-semibold">Morning Briefing & AI Animation</h3>
              </div>
              <p className="text-gray-300 text-sm">
                Get a comprehensive market summary at market open. Watch the AI's analysis phases in real-time
                with the new thinking animation that shows what the AI is processing.
              </p>
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
                <li>• Budget meter shows usage for Polygon, TwelveData, Alpha Vantage, Finnhub</li>
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
              <Step><span className="text-white font-medium">RSS Feeds</span> - Free, unlimited (CNBC, MarketWatch, etc.)</Step>
              <Step><span className="text-white font-medium">Alpha Vantage News</span> - Premium with sentiment (shares API quota)</Step>
            </div>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Filtering News</h3>
            <p className="text-gray-300 mb-3">Use the filter buttons next to the funnel icon:</p>
            <div className="space-y-1">
              <Step><span className="text-white font-medium">All</span> - Show all headlines</Step>
              <Step><span className="text-white font-medium">Watchlist</span> - Only stocks in your watchlist</Step>
              <Step><span className="text-terminal-up font-medium">Positive</span> - Bullish sentiment</Step>
              <Step><span className="text-terminal-down font-medium">Negative</span> - Bearish sentiment</Step>
              <Step><span className="text-gray-400 font-medium">Neutral</span> - Neutral sentiment</Step>
            </div>
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
              RichDad uses a three-tier fallback system for reliable sentiment analysis:
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <span className="text-white font-medium w-20">Primary</span>
                <span className="text-gray-400">→</span>
                <span className="text-gray-300">FinBERT (cloud) - Financial-specialized AI model</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white font-medium w-20">Fallback</span>
                <span className="text-gray-400">→</span>
                <span className="text-gray-300">Your AI provider (OpenAI/Claude/Groq)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white font-medium w-20">Backup</span>
                <span className="text-gray-400">→</span>
                <span className="text-gray-300">Keyword matching (always works)</span>
              </div>
            </div>
            <p className="text-gray-500 text-xs mt-3">
              Works automatically. For faster analysis, add an optional HuggingFace token in Settings → News Sources.
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
              <Step><span className="text-white font-medium">HuggingFace Token</span> - Optional boost for sentiment analysis</Step>
            </div>
            <p className="text-gray-500 text-xs mt-3">
              Note: RSS is disabled when your market data provider includes news (Finnhub, Alpha Vantage Premium).
            </p>
          </div>
        </div>
      )

    case 'economic-calendar':
      return (
        <div className="space-y-8">
          <div>
            <h2 className="text-terminal-amber text-2xl font-bold mb-2">Economic Calendar</h2>
            <p className="text-gray-400">Track major US economic events that move markets</p>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">What It Shows</h3>
            <div className="space-y-1">
              <Step>CPI (Consumer Price Index) - Inflation data</Step>
              <Step>Jobs Report - Employment numbers</Step>
              <Step>Fed Interest Rate Decisions - FOMC meetings</Step>
              <Step>GDP Releases - Economic growth data</Step>
              <Step>Retail Sales, Housing Data, and more</Step>
            </div>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Getting a FRED API Key</h3>
            <p className="text-gray-300 mb-3">The calendar uses free data from the Federal Reserve:</p>
            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
              <div className="space-y-1">
                <Step>Visit <a href="https://fred.stlouisfed.org/docs/api/api_key.html" target="_blank" rel="noopener noreferrer" className="text-terminal-amber hover:underline">fred.stlouisfed.org</a></Step>
                <Step>Click "Request or view your API keys"</Step>
                <Step>Create account (describe use as "personal use")</Step>
                <Step>Copy key to Settings &rarr; API Keys &rarr; FRED</Step>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Impact Levels</h3>
            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <span className="text-gray-300">High Impact - Major market movers (Fed decisions, CPI, Jobs)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <span className="text-gray-300">Medium Impact - Notable events (Retail Sales, Housing)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                <span className="text-gray-300">Low Impact - Minor releases</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Views</h3>
            <div className="space-y-1">
              <Step><span className="text-white font-medium">Calendar Page</span> (<kbd className="bg-terminal-border px-2 py-1 rounded text-xs mx-1">Cmd/Ctrl+3</kbd>) - Full table with filters</Step>
              <Step><span className="text-white font-medium">Ticker</span> - Scrolling bar below news showing upcoming events</Step>
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
                Free tier limits: Polygon 5/min, TwelveData 8/min. Enable auto-scan in Settings → AI Copilot only with paid tier.
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
              <Step><span className="text-white font-medium">Daily</span> - Last 90 days of history</Step>
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

    case 'ai-copilot':
      return (
        <div className="space-y-8">
          <div>
            <h2 className="text-terminal-amber text-2xl font-bold mb-2">AI Copilot</h2>
            <p className="text-gray-400">Your AI-powered trading assistant</p>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Supported Providers</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-terminal-bg border border-terminal-border rounded-lg p-4">
                <p className="text-white font-medium">OpenAI</p>
                <p className="text-gray-400 text-sm">GPT-4o, GPT-4o Mini</p>
              </div>
              <div className="bg-terminal-bg border border-terminal-border rounded-lg p-4">
                <p className="text-white font-medium">Claude (Anthropic)</p>
                <p className="text-gray-400 text-sm">Claude 3.5 Sonnet, Haiku</p>
              </div>
              <div className="bg-terminal-bg border border-terminal-border rounded-lg p-4">
                <p className="text-white font-medium">Gemini (Google)</p>
                <p className="text-gray-400 text-sm">2.0 Flash, 1.5 Pro</p>
              </div>
              <div className="bg-terminal-bg border border-terminal-border rounded-lg p-4">
                <p className="text-white font-medium">Grok (xAI)</p>
                <p className="text-gray-400 text-sm">Grok-2, Grok Beta</p>
              </div>
              <div className="bg-terminal-bg border border-terminal-border rounded-lg p-4">
                <p className="text-white font-medium">DeepSeek</p>
                <p className="text-gray-400 text-sm">DeepSeek Chat, Coder</p>
              </div>
              <div className="bg-terminal-bg border border-terminal-border rounded-lg p-4">
                <p className="text-white font-medium">Llama (via Groq)</p>
                <p className="text-gray-400 text-sm">3.3 70B, 3.2 90B Vision</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Fallback System</h3>
            <p className="text-gray-300 mb-3">Configure multiple providers for reliability:</p>
            <div className="space-y-1">
              <Step><span className="text-white font-medium">Primary</span> - Your main AI provider</Step>
              <Step><span className="text-white font-medium">Fallback</span> - Used if primary fails or rate-limits</Step>
              <Step>Drag to reorder priority in Settings</Step>
            </div>
          </div>

          {/* Rate Limits */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-5">
            <h3 className="text-yellow-400 font-semibold mb-3">Rate Limits</h3>
            <p className="text-gray-300 text-sm mb-3">
              RichDad has no daily limit - your AI provider handles rate limiting. If you see a rate limit message:
            </p>
            <div className="space-y-1">
              <Step>Wait a few minutes for your provider's limit to reset</Step>
              <Step>Add a fallback provider in Settings → AI Copilot</Step>
              <Step>Consider upgrading your AI provider's plan for higher limits</Step>
            </div>
            <p className="text-gray-500 text-xs mt-3">
              Most providers: OpenAI (90 req/min), Claude (60 req/min), Groq (30 req/min free tier)
            </p>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Automatic Recommendations</h3>
            <div className="space-y-1">
              <Step>AI analyzes SPY every 15 minutes during market hours</Step>
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
              <Step><span className="text-white">Gathering News</span> - Ticker-specific (Finnhub)</Step>
              <Step><span className="text-white">Generating Recommendation</span> - AI synthesis</Step>
            </div>
          </div>

          {/* NEW: Morning Briefing */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white font-semibold mb-3">Morning Briefing</h3>
            <p className="text-gray-300 text-sm mb-3">
              Analyze your entire watchlist with one click:
            </p>
            <div className="space-y-1">
              <Step>Click <span className="text-terminal-amber">Morning Briefing</span> in AI Panel</Step>
              <Step>AI analyzes each ticker sequentially</Step>
              <Step>Results modal shows: X BUY / Y SELL / Z HOLD</Step>
              <Step>Click any result to jump to that ticker's chart</Step>
            </div>
            <p className="text-gray-500 text-xs mt-3">
              Note: Uses ~1 AI call per ticker. Large watchlists may take a few minutes.
            </p>
          </div>

          {/* NEW: Ticker-Specific News */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white font-semibold mb-3">Ticker-Specific News (Finnhub)</h3>
            <p className="text-gray-300 text-sm mb-3">
              With a Finnhub API key, AI gets news specifically about the ticker:
            </p>
            <div className="space-y-1">
              <Step>Company-specific news from the last 7 days</Step>
              <Step>Much better than generic RSS keyword matching</Step>
              <Step>Falls back to RSS if Finnhub unavailable</Step>
            </div>
            <p className="text-gray-500 text-xs mt-3">
              Get a free key at finnhub.io (60 calls/min)
            </p>
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

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Performance Tracking</h3>
            <div className="space-y-1">
              <Step>Executed trades are tracked automatically</Step>
              <Step>System monitors price targets and stop losses</Step>
              <Step>View your AI's win rate in the Market Overview bar</Step>
              <Step>Full history available in Settings → AI Performance</Step>
            </div>
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
              {/* Polygon.io */}
              <div className="bg-terminal-bg border border-terminal-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">Massive.com (Polygon.io)</span>
                  <span className="text-terminal-amber text-xs px-2 py-0.5 bg-terminal-amber/20 rounded">Recommended</span>
                </div>
                <div className="text-gray-400 text-sm space-y-1">
                  <p>5 API calls/minute • End-of-day data • 2 years history</p>
                  <p className="text-gray-500">Best for: Charts and historical analysis</p>
                </div>
              </div>

              {/* TwelveData */}
              <div className="bg-terminal-bg border border-terminal-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">TwelveData</span>
                  <span className="text-green-400 text-xs px-2 py-0.5 bg-green-400/20 rounded">Best Free Tier</span>
                </div>
                <div className="text-gray-400 text-sm space-y-1">
                  <p>800 API calls/day • Real-time data • All US markets</p>
                  <p className="text-gray-500">Best for: Live trading and real-time quotes</p>
                </div>
              </div>

              {/* Alpha Vantage */}
              <div className="bg-terminal-bg border border-terminal-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">Alpha Vantage</span>
                </div>
                <div className="text-gray-400 text-sm space-y-1">
                  <p>25 API calls/day • Real-time quotes • Resets midnight EST</p>
                  <p className="text-gray-500">Best for: Basic usage with news sentiment</p>
                </div>
              </div>

              {/* Finnhub */}
              <div className="bg-terminal-bg border border-terminal-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">Finnhub</span>
                </div>
                <div className="text-gray-400 text-sm space-y-1">
                  <p>60 API calls/minute • Real-time data • Global markets</p>
                  <p className="text-gray-500">Best for: High-frequency needs</p>
                </div>
              </div>

              {/* FastTrack */}
              <div className="bg-terminal-bg border border-terminal-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">FastTrack.net</span>
                </div>
                <div className="text-gray-400 text-sm space-y-1">
                  <p>2,000 API calls/month • 37 years history • Analytics</p>
                  <p className="text-gray-500">Best for: Long-term historical analysis</p>
                </div>
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
                <span className="text-terminal-amber">Free tier timing:</span> Polygon has 15-min delay. TwelveData, Alpha Vantage, and Finnhub provide real-time data but with call limits.
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
              When your primary provider is exhausted or unavailable, RichDad automatically falls back:
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-terminal-amber">1.</span>
                <span className="text-gray-300">Tries the next configured provider in priority order</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-terminal-amber">2.</span>
                <span className="text-gray-300">Uses cached data (quotes: 1 hour, charts: 24 hours)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-terminal-amber">3.</span>
                <span className="text-gray-300">Falls back to mock data if all else fails</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-terminal-amber/30">
              <p className="text-gray-400 text-xs">
                <span className="text-terminal-amber">Tip:</span> Configure multiple providers in Settings → API Keys for best reliability.
                You'll see subtle alerts when approaching limits (80%+) and when fallback kicks in.
              </p>
            </div>
          </div>

          {/* Tier Selection */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-6">
            <h3 className="text-white text-lg font-bold mb-4">API Tier Selection</h3>
            <p className="text-gray-300 text-sm mb-4">
              Select your subscription tier for each provider in Settings → API Keys. This adjusts rate limits accordingly.
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex gap-4">
                <span className="text-terminal-amber w-28 flex-shrink-0">Polygon</span>
                <span className="text-gray-400">Free (5/min) • Starter (100/min) • Developer (1K/min) • Advanced (∞)</span>
              </div>
              <div className="flex gap-4">
                <span className="text-terminal-amber w-28 flex-shrink-0">TwelveData</span>
                <span className="text-gray-400">Free (800/day) • Basic (5K/day) • Pro (unlimited)</span>
              </div>
              <div className="flex gap-4">
                <span className="text-terminal-amber w-28 flex-shrink-0">Finnhub</span>
                <span className="text-gray-400">Free (60/min) • Premium (300/min)</span>
              </div>
            </div>
            <p className="text-gray-500 text-xs mt-4">
              The API Budget Meter in Settings shows real-time usage across all providers.
            </p>
          </div>

          {/* AI Providers */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Zap size={20} className="text-terminal-amber" />
              <h3 className="text-white text-lg font-semibold">AI Providers</h3>
            </div>
            <div className="space-y-4">
              <div className="border-b border-terminal-border pb-3">
                <p className="text-white font-medium">OpenAI</p>
                <p className="text-gray-400 text-sm">Pay-per-token model. ~$0.01 per recommendation. No hard rate limit.</p>
              </div>
              <div className="border-b border-terminal-border pb-3">
                <p className="text-white font-medium">Claude (Anthropic)</p>
                <p className="text-gray-400 text-sm">Pay-per-token. Free tier has usage caps. Check console.anthropic.com for limits.</p>
              </div>
              <div className="border-b border-terminal-border pb-3">
                <p className="text-white font-medium">Gemini (Google)</p>
                <p className="text-gray-400 text-sm">Free tier: 60 requests/minute. Very generous for trading use.</p>
              </div>
              <div className="border-b border-terminal-border pb-3">
                <p className="text-white font-medium">Grok (xAI)</p>
                <p className="text-gray-400 text-sm">Free tier available. Rate limits vary. Check x.ai for current limits.</p>
              </div>
              <div className="border-b border-terminal-border pb-3">
                <p className="text-white font-medium">DeepSeek</p>
                <p className="text-gray-400 text-sm">Very affordable. Some rate limiting. Good free tier.</p>
              </div>
              <div>
                <p className="text-white font-medium">Llama (via Groq)</p>
                <p className="text-gray-400 text-sm">Free tier: 30 requests/minute. Fast inference. Great for testing.</p>
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
              <div className="flex justify-between py-2 border-b border-terminal-border">
                <span className="text-gray-400">RSS Feeds</span>
                <span className="text-terminal-up font-medium">Unlimited</span>
              </div>
              <div className="flex justify-between py-2 border-b border-terminal-border">
                <span className="text-gray-400">Finnhub News</span>
                <span className="text-white">60 calls/min • Ticker-specific</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-400">Alpha Vantage News</span>
                <span className="text-white">Shares 25 call/day quota</span>
              </div>
            </div>
            <p className="text-gray-500 text-xs mt-3">
              <span className="text-terminal-amber">New:</span> Finnhub provides ticker-specific news for AI analysis. Get a free key at finnhub.io.
            </p>
          </div>

          {/* Usage Tips */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Optimization Tips</h3>
            <div className="space-y-1">
              <Step>Use 15-minute AI interval (not 5 min) to conserve calls</Step>
              <Step>Let charts cache - avoid excessive timeframe switching</Step>
              <Step>Focus watchlist on key stocks to reduce quote fetches</Step>
              <Step>Set up a fallback AI provider for reliability</Step>
              <Step>Enable "Unlimited" mode if you have a paid API tier</Step>
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
                <p className="text-gray-400">Check Settings → News Sources. Enable RSS or add Finnhub key.</p>
              </div>
              <div>
                <p className="text-white font-medium mb-1">AI rate limited?</p>
                <p className="text-gray-400">Wait a few minutes or switch providers in Settings → AI Copilot.</p>
              </div>
              <div>
                <p className="text-white font-medium mb-1">Sentiment shows "keywords"?</p>
                <p className="text-gray-400">FinBERT unavailable. This is normal fallback behavior.</p>
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
              <Step>Check your Alpha Vantage API key in Settings → API Keys</Step>
              <Step>You may have hit the 25 calls/day limit - wait until midnight EST</Step>
              <Step>Data is cached for 1 hour - this is normal, not an error</Step>
            </div>
          </div>

          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white font-semibold mb-3">"AI not responding" or recommendations missing</h3>
            <div className="space-y-1 text-gray-300">
              <Step>Verify your AI API key in Settings → AI Copilot</Step>
              <Step>Check if you've hit your provider's rate limit (wait a few minutes)</Step>
              <Step>Try adding a fallback provider for reliability</Step>
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
              <Step><span className="text-terminal-up font-medium">Live</span> - Real-time from WebSocket (Polygon paid tier)</Step>
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
              <Step>If using Finnhub or Alpha Vantage, their news requires valid API keys</Step>
              <Step>RSS feeds may be blocked by network firewalls</Step>
              <Step>Check Activity Log for specific error messages</Step>
            </div>
          </div>

          {/* Sentiment Analysis */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
            <h3 className="text-white font-semibold mb-3">Sentiment showing as "keywords"</h3>
            <p className="text-gray-300 text-sm mb-3">
              Sentiment analysis uses a fallback chain:
            </p>
            <div className="space-y-1 text-gray-300">
              <Step><span className="text-white font-medium">FinBERT</span> → Cloud AI model (primary)</Step>
              <Step><span className="text-white font-medium">Your AI</span> → OpenAI/Claude/Groq (fallback)</Step>
              <Step><span className="text-white font-medium">Keywords</span> → Pattern matching (backup)</Step>
            </div>
            <p className="text-gray-500 text-xs mt-3">
              If you see "keywords" often, the cloud services may be rate-limited. Add an optional HuggingFace token in Settings → News Sources for faster analysis.
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
              a: 'Yes! RichDad itself is free. You need free API keys from Alpha Vantage and an AI provider.'
            },
            {
              q: 'Why do I need to set up API keys myself?',
              a: `RichDad is 100% free and open-source for retail traders. We don't charge anything.

However, we use third-party services for market data (Alpha Vantage, Polygon), AI analysis (OpenAI, Claude, Groq), and sentiment analysis (HuggingFace) - and these providers require their own API keys.

Think of it like this: RichDad is the car (free), but you need to get your own gas (API keys from providers).

Want help getting set up? We're happy to help you complete this process for free. Reach out to our support team at support@lovelacex.com and we'll walk you through it.`
            },
            {
              q: 'Do AI recommendations cost money?',
              a: 'Depends on your provider. Most charge per API call (~$0.01 per recommendation). Some like Gemini and Groq have generous free tiers.'
            },
            {
              q: 'How accurate are AI recommendations?',
              a: 'AI provides data-driven insights but cannot predict the future. Check your AI\'s win rate in the Performance panel. Never invest money you can\'t afford to lose.'
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
              a: 'With the free Alpha Vantage tier (25 calls/day, cached data), it\'s better for swing trading. Premium data subscriptions would be needed for serious day trading.'
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
3. Path Selection - Choose Free, Standard, or Premium
4. API Key Setup - Enter your market data API key
5. AI Provider - Configure your AI provider

You can skip any step by clicking the X button. To re-run the wizard, go to Settings → Danger Zone → Reset All Data.`
            },
            {
              q: 'What happens when I hit rate limits?',
              a: `Rate limits are set by your API providers, not RichDad:

- Alpha Vantage Free: 5 calls/minute, 25 calls/day
- Polygon Free: 5 calls/minute
- TwelveData Free: 8 calls/minute, 800 calls/day
- Finnhub Free: 60 calls/minute

When rate limited:
- AI shows a yellow message in the AI Panel
- Market data falls back to cached values
- Try again in a few minutes, or add a fallback provider in Settings`
            },
            {
              q: 'What is the Morning Briefing?',
              a: `The Morning Briefing analyzes your entire watchlist with one click. Click the "Morning Briefing" button in the AI Panel and it will:
1. Analyze each ticker sequentially (2-second delay between each)
2. Show progress as it goes ("Analyzing AAPL 3/15")
3. Display a summary modal with BUY/SELL/HOLD counts
4. Let you click any result to jump to that ticker's chart

Budget note: Uses ~1 AI call per ticker. A 15-stock watchlist uses ~30% of daily budget.`
            },
            {
              q: 'What is the AI Thinking Animation?',
              a: `When AI analyzes a ticker, you now see its step-by-step thinking process:
1. Checking Market Regime (VIX + SPY trend)
2. Fetching Price Data (current quote)
3. Calculating Indicators (RSI, MACD, MAs)
4. Detecting Patterns (candlestick patterns)
5. Gathering News (ticker-specific from Finnhub)
6. Generating Recommendation (AI synthesis)

Each step shows a result preview (e.g., "RSI 65", "2 patterns found").`
            },
            {
              q: 'What is Finnhub News and do I need it?',
              a: `Finnhub provides ticker-specific news for AI analysis. Instead of generic RSS keyword matching, the AI gets news specifically about the stock being analyzed.

Benefits:
- Company-specific news from the last 7 days
- Much better AI recommendation quality
- Free tier: 60 API calls/minute

Get a free key at finnhub.io. If not configured, the AI falls back to RSS feeds.`
            },
            {
              q: 'Why is my chart data delayed by 15 minutes?',
              a: `The free tier of Polygon.io (our default data provider) has a 15-minute delay. This is standard for free market data.

Options for real-time data:
- Switch to TwelveData (free, real-time) in Settings → Market Data
- Upgrade to Polygon Pro ($29/mo) for real-time Polygon data
- Use Alpha Vantage (25 calls/day, real-time)

The chart header shows your current data source and whether it's delayed.`
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

          {/* Privacy Promise */}
          <div className="bg-terminal-up/10 border border-terminal-up/30 rounded-lg p-6">
            <h3 className="text-terminal-up text-lg font-bold mb-4 flex items-center gap-2">
              <Shield size={20} />
              Privacy Promise
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
                  <p className="text-white font-medium">No Cloud Servers</p>
                  <p className="text-gray-400 text-sm">Data stays on your machine</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check size={18} className="text-terminal-up flex-shrink-0" />
                <div>
                  <p className="text-white font-medium">No Crowdsourcing</p>
                  <p className="text-gray-400 text-sm">Your strategy stays private</p>
                </div>
              </div>
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
                <Step>Polygon.io or Alpha Vantage (market data) - subject to their privacy policy</Step>
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
              Security by Design
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
            <h3 className="text-terminal-amber text-3xl font-bold">RichDad v5.2.0</h3>
            <p className="text-gray-500 text-sm mt-2">Error Log • Service Health • API Key Security • Watchlist News</p>
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
                    <td className="px-3 py-2 text-terminal-up font-medium">6 providers + batting avg</td>
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
            <p className="text-gray-500 text-xs mt-4 italic">
              "Empowering retail investors with institutional-grade AI analysis."
            </p>
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
                { label: 'AI', value: '6 providers supported' },
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
            <Heart className="w-12 h-12 text-terminal-amber mx-auto" />
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
              className="flex items-center gap-3 bg-[#0070ba] hover:bg-[#005ea6] text-white px-8 py-4 rounded-lg font-semibold transition-colors shadow-lg hover:shadow-xl"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
                <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
              </svg>
              Tip via PayPal
            </button>
          </div>

          <div className="text-center">
            <p className="text-gray-500 text-sm">
              Built with ❤️ by <span className="text-terminal-amber">LovelaceX</span>
            </p>
          </div>
        </div>
      )

    case 'tiers':
      return (
        <div className="space-y-8">
          <div>
            <h2 className="text-terminal-amber text-2xl font-bold mb-2">Pricing Tiers</h2>
            <p className="text-gray-400">Compare Free, Standard, and Premium setup paths</p>
          </div>

          <p className="text-gray-300">
            RichDad offers three setup paths based on your needs and budget. You can change your configuration anytime in <span className="text-terminal-amber">Settings → Market Data</span>.
          </p>

          <div className="grid grid-cols-3 gap-4">
            {/* Free Tier */}
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Leaf size={20} className="text-green-400" />
                <span className="text-green-400 font-bold text-lg">Free</span>
              </div>
              <p className="text-green-400/80 text-xs mb-4">$0/month</p>
              <div className="text-sm text-gray-300 space-y-2">
                <div className="flex items-start gap-2">
                  <Check size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                  <span>TwelveData (800 calls/day)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Groq AI / Llama 3 (free)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                  <span>RSS news feeds</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Intraday: Today only</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={14} className="text-green-400 mt-0.5 flex-shrink-0" />
                  <span>Real-time data</span>
                </div>
              </div>
            </div>

            {/* Standard Tier */}
            <div className="bg-terminal-amber/10 border border-terminal-amber/30 rounded-lg p-4 relative">
              <div className="absolute -top-2 right-3 bg-terminal-amber text-black text-[10px] font-bold px-2 py-0.5 rounded">
                RECOMMENDED
              </div>
              <div className="flex items-center gap-2 mb-3">
                <Star size={20} className="text-terminal-amber" />
                <span className="text-terminal-amber font-bold text-lg">Standard</span>
              </div>
              <p className="text-terminal-amber/80 text-xs mb-4">~$5-20/month</p>
              <div className="text-sm text-gray-300 space-y-2">
                <div className="flex items-start gap-2">
                  <Check size={14} className="text-terminal-amber mt-0.5 flex-shrink-0" />
                  <span>Polygon (5 calls/min)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={14} className="text-terminal-amber mt-0.5 flex-shrink-0" />
                  <span>OpenAI GPT-4</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={14} className="text-terminal-amber mt-0.5 flex-shrink-0" />
                  <span>Finnhub + Economic Calendar</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={14} className="text-terminal-amber mt-0.5 flex-shrink-0" />
                  <span>Intraday: Today only</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={14} className="text-terminal-amber mt-0.5 flex-shrink-0" />
                  <span>15-min delayed (free tier)</span>
                </div>
              </div>
            </div>

            {/* Premium Tier */}
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Crown size={20} className="text-purple-400" />
                <span className="text-purple-400 font-bold text-lg">Premium</span>
              </div>
              <p className="text-purple-400/80 text-xs mb-4">Power User</p>
              <div className="text-sm text-gray-300 space-y-2">
                <div className="flex items-start gap-2">
                  <Check size={14} className="text-purple-400 mt-0.5 flex-shrink-0" />
                  <span>Polygon paid (unlimited)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={14} className="text-purple-400 mt-0.5 flex-shrink-0" />
                  <span>Anthropic Claude</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={14} className="text-purple-400 mt-0.5 flex-shrink-0" />
                  <span>All news + Alpha Vantage</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={14} className="text-purple-400 mt-0.5 flex-shrink-0" />
                  <span>Intraday: 90-day history</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check size={14} className="text-purple-400 mt-0.5 flex-shrink-0" />
                  <span>Real-time data</span>
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
                    <th className="text-center py-3 px-4 text-terminal-amber font-medium">Standard</th>
                    <th className="text-center py-3 px-4 text-purple-400 font-medium">Premium</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-terminal-border/50">
                    <td className="py-2 px-4">Market Data Provider</td>
                    <td className="py-2 px-4 text-center">TwelveData</td>
                    <td className="py-2 px-4 text-center">Polygon</td>
                    <td className="py-2 px-4 text-center">Polygon (paid)</td>
                  </tr>
                  <tr className="border-b border-terminal-border/50">
                    <td className="py-2 px-4">AI Provider</td>
                    <td className="py-2 px-4 text-center">Groq (Llama 3)</td>
                    <td className="py-2 px-4 text-center">OpenAI GPT-4</td>
                    <td className="py-2 px-4 text-center">Claude</td>
                  </tr>
                  <tr className="border-b border-terminal-border/50">
                    <td className="py-2 px-4">Intraday History</td>
                    <td className="py-2 px-4 text-center">Today only</td>
                    <td className="py-2 px-4 text-center">Today only</td>
                    <td className="py-2 px-4 text-center text-purple-400">90 days</td>
                  </tr>
                  <tr className="border-b border-terminal-border/50">
                    <td className="py-2 px-4">Daily Chart History</td>
                    <td className="py-2 px-4 text-center">90 days</td>
                    <td className="py-2 px-4 text-center">90 days</td>
                    <td className="py-2 px-4 text-center">Full history</td>
                  </tr>
                  <tr className="border-b border-terminal-border/50">
                    <td className="py-2 px-4">Data Freshness</td>
                    <td className="py-2 px-4 text-center">Real-time</td>
                    <td className="py-2 px-4 text-center">15-min delay</td>
                    <td className="py-2 px-4 text-center">Real-time</td>
                  </tr>
                  <tr className="border-b border-terminal-border/50">
                    <td className="py-2 px-4">News Sources</td>
                    <td className="py-2 px-4 text-center">RSS only</td>
                    <td className="py-2 px-4 text-center">Finnhub + Calendar</td>
                    <td className="py-2 px-4 text-center">All sources</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4">AI Calls/Day</td>
                    <td className="py-2 px-4 text-center">15 (configurable)</td>
                    <td className="py-2 px-4 text-center">15 (configurable)</td>
                    <td className="py-2 px-4 text-center">15 (configurable)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-terminal-border/30 rounded-lg p-4 text-center">
            <p className="text-gray-400 text-sm">
              AI call limits are the same across all tiers (default 15/day) but can be configured from 5-100 in <span className="text-terminal-amber">Settings → AI Copilot</span>
            </p>
          </div>
        </div>
      )

    default:
      return <p className="text-gray-400">Content not found.</p>
  }
}
