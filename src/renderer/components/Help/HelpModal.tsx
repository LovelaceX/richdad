import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, BookOpen, Zap, BarChart3, Keyboard, HelpCircle, Shield, FileText, Mail,
  Search, Gauge, AlertTriangle, Database, TrendingUp, Bell, Eye, Check
} from 'lucide-react'

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
  initialSection?: string
}

type Section =
  | 'get-started'
  | 'dashboard'
  | 'watchlist'
  | 'news'
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

const sectionContent: Record<Section, { title: string; keywords: string[] }> = {
  'get-started': { title: 'Get Started', keywords: ['setup', 'api key', 'configure', 'begin', 'first', 'install'] },
  'dashboard': { title: 'Dashboard', keywords: ['home', 'main', 'overview', 'layout', 'panels'] },
  'watchlist': { title: 'Watchlist', keywords: ['market watch', 'stocks', 'symbols', 'add', 'remove', 'track'] },
  'news': { title: 'Market News', keywords: ['headlines', 'feed', 'sentiment', 'filter', 'rss'] },
  'price-alerts': { title: 'Price Alerts', keywords: ['notification', 'alert', 'trigger', 'above', 'below'] },
  'chart-guide': { title: 'Chart Controls', keywords: ['candlestick', 'timeframe', 'zoom', 'pan', 'daily', 'intraday'] },
  'ai-copilot': { title: 'AI Copilot', keywords: ['openai', 'claude', 'gemini', 'grok', 'recommendation', 'chat', 'provider'] },
  'api-limits': { title: 'API Limits & Usage', keywords: ['rate limit', 'quota', 'calls', 'daily', 'budget', 'alpha vantage'] },
  'shortcuts': { title: 'Keyboard Shortcuts', keywords: ['hotkey', 'cmd', 'ctrl', 'key'] },
  'troubleshooting': { title: 'Troubleshooting', keywords: ['error', 'fix', 'problem', 'not working', 'issue', 'help'] },
  'faq': { title: 'FAQ', keywords: ['question', 'answer', 'common', 'frequently'] },
  'terms': { title: 'Terms of Service', keywords: ['legal', 'tos', 'agreement'] },
  'privacy': { title: 'Privacy Policy', keywords: ['data', 'collection', 'storage'] },
  'security': { title: 'Security', keywords: ['safe', 'key', 'protection'] },
  'about': { title: 'About RichDad', keywords: ['version', 'developer', 'contact', 'lovelacex'] },
}

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
    { id: 'dashboard', label: 'Dashboard', icon: Eye },
    { id: 'watchlist', label: 'Watchlist', icon: TrendingUp },
    { id: 'news', label: 'Market News', icon: FileText },
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
  ]

  // Filter sections based on search
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections
    const query = searchQuery.toLowerCase()
    return sections.filter(section => {
      const content = sectionContent[section.id]
      return (
        content.title.toLowerCase().includes(query) ||
        content.keywords.some(k => k.includes(query)) ||
        section.label.toLowerCase().includes(query)
      )
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
              <span className="text-gray-500 text-sm">v3.10.0</span>
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
            <h3 className="text-white text-lg font-semibold mb-4">Step 1: Get API Keys</h3>
            <p className="text-gray-300 mb-4">RichDad requires API keys for market data and AI features.</p>

            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5 space-y-4">
              <div>
                <p className="text-terminal-amber font-medium mb-2">Required: Alpha Vantage (Free)</p>
                <Step>Visit <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noopener noreferrer" className="text-terminal-amber hover:underline">alphavantage.co</a></Step>
                <Step>Sign up for a free account</Step>
                <Step>Copy your API key</Step>
              </div>

              <div className="border-t border-terminal-border pt-4">
                <p className="text-terminal-amber font-medium mb-2">Recommended: AI Provider</p>
                <p className="text-gray-400 text-sm mb-2">Choose one of: OpenAI, Claude, Gemini, Grok, DeepSeek, or Llama (Groq)</p>
                <Step>Create account with your chosen provider</Step>
                <Step>Generate an API key</Step>
                <Step>Note any free tier limits (see <QuickLink to="api-limits">API Limits</QuickLink>)</Step>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Step 2: Configure Settings</h3>
            <div className="space-y-1">
              <Step>Press <kbd className="bg-terminal-border px-2 py-1 rounded text-xs mx-1">Cmd+3</kbd> to open Settings</Step>
              <Step>Navigate to <span className="text-white font-medium">API Keys</span> section</Step>
              <Step>Paste your Alpha Vantage key</Step>
              <Step>Navigate to <span className="text-white font-medium">AI Copilot</span> section</Step>
              <Step>Select your AI provider from the dropdown</Step>
              <Step>Paste your AI API key</Step>
              <Step>Settings auto-save when changed</Step>
            </div>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Step 3: Start Using RichDad</h3>
            <div className="space-y-1">
              <Step><span className="text-white font-medium">Dashboard</span> (<kbd className="bg-terminal-border px-2 py-1 rounded text-xs mx-1">Cmd+1</kbd>): View live prices, charts, and AI recommendations</Step>
              <Step><span className="text-white font-medium">News</span> (<kbd className="bg-terminal-border px-2 py-1 rounded text-xs mx-1">Cmd+2</kbd>): Read latest market headlines with sentiment</Step>
              <Step><span className="text-white font-medium">AI Panel</span>: Chat with your AI copilot or wait for automatic analysis</Step>
              <Step><span className="text-white font-medium">Watchlist</span>: Track your favorite stocks in real-time</Step>
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
              <Step><span className="text-white font-medium">S&P 500 (SPX)</span> - Broad market benchmark</Step>
              <Step><span className="text-white font-medium">NASDAQ (NDX)</span> - Tech-heavy index</Step>
              <Step><span className="text-white font-medium">Dow Jones (DJI)</span> - Blue-chip stocks</Step>
              <Step><span className="text-white font-medium">VIX</span> - Market volatility ("fear gauge")</Step>
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
              <Step>Click the <span className="text-red-400">X</span> button that appears</Step>
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
            <p className="text-gray-300 mb-3">Headlines are analyzed for market sentiment:</p>
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

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Automatic Recommendations</h3>
            <div className="space-y-1">
              <Step>AI analyzes SPY every 15 minutes during market hours</Step>
              <Step>Only shows recommendations above your confidence threshold</Step>
              <Step>Includes: Action (BUY/SELL/HOLD), confidence %, rationale</Step>
            </div>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Acting on Recommendations</h3>
            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-5 space-y-3">
              <div className="flex items-center gap-3">
                <kbd className="bg-terminal-border px-3 py-1 rounded">E</kbd>
                <span className="text-gray-300">Execute - Log trade for performance tracking</span>
              </div>
              <div className="flex items-center gap-3">
                <kbd className="bg-terminal-border px-3 py-1 rounded">S</kbd>
                <span className="text-gray-300">Skip - Dismiss without logging</span>
              </div>
              <div className="flex items-center gap-3">
                <kbd className="bg-terminal-border px-3 py-1 rounded">Esc</kbd>
                <span className="text-gray-300">Close - Dismiss modal</span>
              </div>
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
            <p className="text-gray-400">Understanding rate limits and quotas</p>
          </div>

          {/* Alpha Vantage */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Database size={20} className="text-terminal-amber" />
              <h3 className="text-white text-lg font-semibold">Alpha Vantage (Market Data)</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-terminal-border">
                <span className="text-gray-400">Free Tier Limit</span>
                <span className="text-white font-mono">25 calls/day</span>
              </div>
              <div className="flex justify-between py-2 border-b border-terminal-border">
                <span className="text-gray-400">Reset Time</span>
                <span className="text-white font-mono">Midnight EST</span>
              </div>
              <div className="flex justify-between py-2 border-b border-terminal-border">
                <span className="text-gray-400">Used For</span>
                <span className="text-white">Stock prices, chart data, news</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-400">Cache Duration</span>
                <span className="text-white">Quotes: 1hr, Charts: 24hr</span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-terminal-border">
              <p className="text-gray-400 text-sm">
                <span className="text-terminal-amber">Tip:</span> RichDad optimizes API usage with caching.
                SPY gets priority for intraday data; other symbols use daily data.
              </p>
            </div>
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
              <div className="flex justify-between py-2">
                <span className="text-gray-400">Alpha Vantage News</span>
                <span className="text-white">Shares 25 call/day quota</span>
              </div>
            </div>
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
            <p className="text-gray-400">Navigate faster with hotkeys</p>
          </div>

          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Navigation</h3>
            <div className="space-y-2">
              {[
                { key: 'Cmd+1', action: 'Dashboard' },
                { key: 'Cmd+2', action: 'News' },
                { key: 'Cmd+3', action: 'Settings' },
                { key: 'Cmd+N', action: 'New Window' },
                { key: 'Cmd+?', action: 'Reference Guide (this)' },
              ].map(({ key, action }) => (
                <div key={key} className="flex justify-between items-center bg-terminal-bg border border-terminal-border rounded p-3">
                  <span className="text-gray-300">{action}</span>
                  <kbd className="bg-terminal-border px-3 py-1 rounded text-sm">{key}</kbd>
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
                { key: 'Cmd++', action: 'Zoom in' },
                { key: 'Cmd+-', action: 'Zoom out' },
                { key: 'Cmd+0', action: 'Reset zoom' },
              ].map(({ key, action }) => (
                <div key={key} className="flex justify-between items-center bg-terminal-bg border border-terminal-border rounded p-3">
                  <span className="text-gray-300">{action}</span>
                  <kbd className="bg-terminal-border px-3 py-1 rounded text-sm">{key}</kbd>
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
              <Step>Check if you've hit your provider's rate limit</Step>
              <Step>Try adding a fallback provider</Step>
              <Step>AI only runs during market hours (9:30 AM - 4:00 PM ET)</Step>
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
              q: 'Do AI recommendations cost money?',
              a: 'Depends on your provider. Most charge per API call (~$0.01 per recommendation). Some like Gemini and Groq have generous free tiers.'
            },
            {
              q: 'How accurate are AI recommendations?',
              a: 'AI provides data-driven insights but cannot predict the future. Check your AI\'s win rate in the Performance panel. Never invest money you can\'t afford to lose.'
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
              q: 'How do I reset everything?',
              a: 'Settings → Danger Zone → Reset All Data. This clears all settings, history, and shows onboarding again.'
            },
          ].map(({ q, a }, i) => (
            <div key={i} className="bg-terminal-bg border border-terminal-border rounded-lg p-5">
              <h3 className="text-white font-semibold mb-2">{q}</h3>
              <p className="text-gray-300">{a}</p>
            </div>
          ))}
        </div>
      )

    case 'terms':
      return (
        <div className="space-y-8">
          <div>
            <h2 className="text-terminal-amber text-2xl font-bold mb-2">Terms of Service</h2>
            <p className="text-gray-400">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="space-y-6 text-gray-300">
            <div>
              <h3 className="text-white font-semibold mb-2">1. Acceptance of Terms</h3>
              <p>By using RichDad, you agree to these Terms of Service.</p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">2. No Financial Advice</h3>
              <p>RichDad and its AI recommendations are for <span className="text-terminal-amber">informational purposes only</span>. This is NOT financial advice. You are solely responsible for your trading decisions.</p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">3. No Warranty</h3>
              <p>RichDad is provided "as is" without warranty of any kind. We do not guarantee accuracy, uptime, or profitability.</p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">4. Limitation of Liability</h3>
              <p>The developer (LovelaceX) shall not be liable for any losses incurred from using RichDad.</p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">5. Third-Party Services</h3>
              <p>RichDad relies on third-party APIs (Alpha Vantage, AI providers). We are not responsible for their availability or accuracy.</p>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-2">6. User Conduct</h3>
              <p>Do not use RichDad for illegal activities or to violate API provider terms of service.</p>
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
            <p className="text-gray-400">AI-Powered Trading Terminal for Retail Investors</p>
          </div>

          <div className="bg-terminal-bg border border-terminal-amber/30 rounded-lg p-6 text-center">
            <h3 className="text-terminal-amber text-3xl font-bold">RichDad v3.10.0</h3>
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

          <div>
            <h3 className="text-white font-semibold mb-3">Developer</h3>
            <p className="text-gray-300">
              <a href="https://github.com/LovelaceX" target="_blank" rel="noopener noreferrer" className="text-terminal-amber font-medium hover:underline">LovelaceX</a>
            </p>
            <p className="text-gray-400 text-sm">Building tools for traders at the intersection of AI and finance.</p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-3">Contact</h3>
            <div className="bg-terminal-bg border border-terminal-border rounded-lg p-4 flex items-center gap-3">
              <Mail size={20} className="text-terminal-amber" />
              <a href="mailto:support@lovelacex.com" className="text-terminal-amber hover:underline">
                support@lovelacex.com
              </a>
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

          <div>
            <h3 className="text-white font-semibold mb-3">Acknowledgments</h3>
            <div className="space-y-1">
              <Step>Polygon.io & Alpha Vantage for market data</Step>
              <Step>TradingView for Lightweight Charts library</Step>
              <Step>All open-source contributors</Step>
            </div>
          </div>
        </div>
      )

    default:
      return <p className="text-gray-400">Content not found.</p>
  }
}
