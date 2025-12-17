import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, BookOpen, Zap, BarChart3, Keyboard, HelpCircle, Shield, FileText, Mail } from 'lucide-react'

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
}

type Section = 'getting-started' | 'how-it-works' | 'ai-copilot' | 'chart-guide' | 'shortcuts' | 'faq' | 'terms' | 'privacy' | 'security' | 'about'

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [activeSection, setActiveSection] = useState<Section>('getting-started')

  if (!isOpen) return null

  const sections: { id: Section; label: string; icon: any }[] = [
    { id: 'getting-started', label: 'Getting Started', icon: BookOpen },
    { id: 'how-it-works', label: 'How It Works', icon: Zap },
    { id: 'ai-copilot', label: 'AI Copilot', icon: HelpCircle },
    { id: 'chart-guide', label: 'Chart Guide', icon: BarChart3 },
    { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
    { id: 'terms', label: 'Terms of Service', icon: FileText },
    { id: 'privacy', label: 'Privacy Policy', icon: Shield },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'about', label: 'About', icon: Mail },
  ]

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
          className="bg-terminal-panel border border-terminal-border rounded-lg shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-terminal-border">
            <div className="flex items-center gap-2">
              <HelpCircle size={20} className="text-terminal-amber" />
              <h2 className="text-white text-lg font-semibold">Help & Documentation</h2>
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
              <div className="space-y-1">
                {sections.map(section => {
                  const Icon = section.icon
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
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
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              <HelpContent section={activeSection} />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

function HelpContent({ section }: { section: Section }) {
  switch (section) {
    case 'getting-started':
      return (
        <div className="prose prose-invert max-w-none">
          <h2 className="text-terminal-amber">Getting Started with RichDad</h2>

          <h3>1. Set Up API Keys</h3>
          <p>RichDad requires API keys for market data and AI analysis.</p>

          <div className="bg-terminal-bg border border-terminal-border rounded p-4 my-4">
            <p className="font-semibold">Required:</p>
            <ul>
              <li>Alpha Vantage (Free): Get your key at <a href="https://www.alphavantage.co/support/#api-key" target="_blank" rel="noopener noreferrer" className="text-terminal-amber hover:underline">alphavantage.co</a></li>
            </ul>

            <p className="font-semibold mt-4">Recommended:</p>
            <ul>
              <li>AI Provider: OpenAI, Claude, Gemini, Grok, DeepSeek, or Llama</li>
            </ul>
          </div>

          <h3>2. Configure Settings</h3>
          <ol>
            <li>Press <kbd className="bg-terminal-border px-2 py-1 rounded text-xs">Cmd+3</kbd> or click Settings</li>
            <li>Navigate to "API Keys"</li>
            <li>Paste your Alpha Vantage key</li>
            <li>Navigate to "AI Copilot"</li>
            <li>Select provider and paste AI API key</li>
          </ol>

          <h3>3. Start Trading</h3>
          <ul>
            <li>Dashboard (<kbd className="bg-terminal-border px-2 py-1 rounded text-xs">Cmd+1</kbd>): View live prices, chart, AI recommendations</li>
            <li>News (<kbd className="bg-terminal-border px-2 py-1 rounded text-xs">Cmd+2</kbd>): Read latest market news</li>
            <li>AI Copilot: Chat with AI or wait for automatic recommendations</li>
          </ul>
        </div>
      )

    case 'how-it-works':
      return (
        <div className="prose prose-invert max-w-none">
          <h2 className="text-terminal-amber">How RichDad Works</h2>

          <h3>System Architecture</h3>
          <p>RichDad is a Bloomberg Terminal-style desktop application powered by AI and real-time market data.</p>

          <div className="bg-terminal-bg border border-terminal-border rounded p-4 my-4">
            <h4>Data Flow:</h4>
            <ol>
              <li><strong>Market Data:</strong> Fetches live prices from Alpha Vantage every minute (1-hour cache)</li>
              <li><strong>News Feed:</strong> Aggregates headlines from RSS feeds every 5 minutes</li>
              <li><strong>AI Analysis:</strong> Analyzes market data + technical indicators + news every 15 minutes</li>
              <li><strong>Recommendations:</strong> Displays BUY/SELL/HOLD signals with confidence scores</li>
            </ol>
          </div>

          <h3>Technical Indicators</h3>
          <ul>
            <li><strong>RSI (14):</strong> Relative Strength Index - detects overbought/oversold conditions</li>
            <li><strong>MACD:</strong> Moving Average Convergence Divergence - identifies trend changes</li>
            <li><strong>MA (20/50/200):</strong> Moving Averages - defines support/resistance levels</li>
          </ul>

          <h3>AI Recommendation System</h3>
          <p>The AI analyzes:</p>
          <ul>
            <li>Current price vs. historical data</li>
            <li>Technical indicator signals (RSI, MACD, MA)</li>
            <li>Recent news sentiment</li>
            <li>Volume patterns and trends</li>
          </ul>
          <p>It then generates structured recommendations with:</p>
          <ul>
            <li>Action: BUY / SELL / HOLD</li>
            <li>Confidence: 0-100% (only shows if ≥70%)</li>
            <li>Rationale: 2-3 sentence explanation</li>
            <li>Price Target & Stop Loss</li>
          </ul>
        </div>
      )

    case 'ai-copilot':
      return (
        <div className="prose prose-invert max-w-none">
          <h2 className="text-terminal-amber">AI Copilot Guide</h2>

          <h3>Supported AI Providers</h3>
          <div className="grid grid-cols-2 gap-4 my-4">
            <div className="bg-terminal-bg border border-terminal-border rounded p-3">
              <p className="font-semibold">OpenAI</p>
              <p className="text-sm text-gray-400">GPT-4, GPT-3.5</p>
            </div>
            <div className="bg-terminal-bg border border-terminal-border rounded p-3">
              <p className="font-semibold">Claude (Anthropic)</p>
              <p className="text-sm text-gray-400">Opus 4.5, Sonnet 4.5</p>
            </div>
            <div className="bg-terminal-bg border border-terminal-border rounded p-3">
              <p className="font-semibold">Gemini (Google)</p>
              <p className="text-sm text-gray-400">2.0 Flash, 1.5 Pro</p>
            </div>
            <div className="bg-terminal-bg border border-terminal-border rounded p-3">
              <p className="font-semibold">Grok (xAI)</p>
              <p className="text-sm text-gray-400">Grok-2, Grok Beta</p>
            </div>
            <div className="bg-terminal-bg border border-terminal-border rounded p-3">
              <p className="font-semibold">DeepSeek</p>
              <p className="text-sm text-gray-400">Chat, Coder models</p>
            </div>
            <div className="bg-terminal-bg border border-terminal-border rounded p-3">
              <p className="font-semibold">Llama (via Groq)</p>
              <p className="text-sm text-gray-400">3.3 70B, 3.2 90B</p>
            </div>
          </div>

          <h3>Chat Features</h3>
          <ul>
            <li>Ask questions about stocks, trading strategies, market conditions</li>
            <li>Get explanations of technical indicators</li>
            <li>Request analysis of specific symbols</li>
          </ul>

          <h3>Automatic Recommendations</h3>
          <p>When configured, the AI automatically analyzes SPY every 15 minutes during market hours (9:30 AM - 4:00 PM ET).</p>

          <div className="bg-terminal-bg border border-terminal-border rounded p-4 my-4">
            <p className="font-semibold">Recommendation Actions:</p>
            <ul>
              <li><kbd className="bg-terminal-border px-2 py-1 rounded text-xs">E</kbd> - Execute: Log as executed trade (tracked for performance)</li>
              <li><kbd className="bg-terminal-border px-2 py-1 rounded text-xs">S</kbd> - Skip: Dismiss without executing</li>
              <li><kbd className="bg-terminal-border px-2 py-1 rounded text-xs">Esc</kbd> - Close: Dismiss modal</li>
            </ul>
          </div>

          <h3>Performance Tracking</h3>
          <p>Executed trades are tracked automatically. The system monitors:</p>
          <ul>
            <li>Price target hits (wins)</li>
            <li>Stop loss triggers (losses)</li>
            <li>Time to outcome (days held)</li>
          </ul>
          <p>View your AI's batting average in the Performance panel (right side of Dashboard).</p>
        </div>
      )

    case 'chart-guide':
      return (
        <div className="prose prose-invert max-w-none">
          <h2 className="text-terminal-amber">Chart Guide</h2>

          <h3>Chart Types</h3>
          <p>RichDad displays candlestick charts powered by Lightweight Charts library.</p>

          <h3>Timeframes</h3>
          <ul>
            <li><strong>5-Minute (SPY only):</strong> Intraday trading, ~8 hours of data</li>
            <li><strong>Daily:</strong> Long-term analysis, 90 days of history</li>
          </ul>

          <div className="bg-terminal-bg border border-terminal-border rounded p-4 my-4">
            <p className="font-semibold">Free Tier Limitations:</p>
            <p>Alpha Vantage free tier allows 25 API calls/day. RichDad optimizes usage:</p>
            <ul>
              <li>Chart data cached for 24 hours</li>
              <li>Quote data cached for 1 hour</li>
              <li>SPY gets 5-minute intraday, other symbols use daily</li>
            </ul>
          </div>

          <h3>Chart Controls</h3>
          <ul>
            <li><strong>Zoom:</strong> Scroll wheel or pinch gesture</li>
            <li><strong>Pan:</strong> Click and drag</li>
            <li><strong>Timeframe:</strong> Use dropdown in chart header</li>
          </ul>

          <h3>Volume Display</h3>
          <p>Volume bars appear at the bottom of the chart, color-coded to match price movement.</p>
        </div>
      )

    case 'shortcuts':
      return (
        <div className="prose prose-invert max-w-none">
          <h2 className="text-terminal-amber">Keyboard Shortcuts</h2>

          <h3>Navigation</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center bg-terminal-bg border border-terminal-border rounded p-3">
              <span>Dashboard</span>
              <kbd className="bg-terminal-border px-3 py-1 rounded">Cmd+1</kbd>
            </div>
            <div className="flex justify-between items-center bg-terminal-bg border border-terminal-border rounded p-3">
              <span>News</span>
              <kbd className="bg-terminal-border px-3 py-1 rounded">Cmd+2</kbd>
            </div>
            <div className="flex justify-between items-center bg-terminal-bg border border-terminal-border rounded p-3">
              <span>Settings</span>
              <kbd className="bg-terminal-border px-3 py-1 rounded">Cmd+3</kbd>
            </div>
            <div className="flex justify-between items-center bg-terminal-bg border border-terminal-border rounded p-3">
              <span>Help (This Menu)</span>
              <kbd className="bg-terminal-border px-3 py-1 rounded">Cmd+?</kbd>
            </div>
          </div>

          <h3>AI Recommendations</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center bg-terminal-bg border border-terminal-border rounded p-3">
              <span>Execute Trade</span>
              <kbd className="bg-terminal-border px-3 py-1 rounded">E</kbd>
            </div>
            <div className="flex justify-between items-center bg-terminal-bg border border-terminal-border rounded p-3">
              <span>Skip Recommendation</span>
              <kbd className="bg-terminal-border px-3 py-1 rounded">S</kbd>
            </div>
            <div className="flex justify-between items-center bg-terminal-bg border border-terminal-border rounded p-3">
              <span>Dismiss Modal</span>
              <kbd className="bg-terminal-border px-3 py-1 rounded">Esc</kbd>
            </div>
          </div>

          <h3>View Controls</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center bg-terminal-bg border border-terminal-border rounded p-3">
              <span>Zoom In</span>
              <kbd className="bg-terminal-border px-3 py-1 rounded">Cmd++</kbd>
            </div>
            <div className="flex justify-between items-center bg-terminal-bg border border-terminal-border rounded p-3">
              <span>Zoom Out</span>
              <kbd className="bg-terminal-border px-3 py-1 rounded">Cmd+-</kbd>
            </div>
            <div className="flex justify-between items-center bg-terminal-bg border border-terminal-border rounded p-3">
              <span>Reset Zoom</span>
              <kbd className="bg-terminal-border px-3 py-1 rounded">Cmd+0</kbd>
            </div>
          </div>
        </div>
      )

    case 'faq':
      return (
        <div className="prose prose-invert max-w-none">
          <h2 className="text-terminal-amber">Frequently Asked Questions</h2>

          <h3>Q: Is RichDad free to use?</h3>
          <p>Yes! RichDad itself is completely free. You'll need free API keys from Alpha Vantage (market data) and your choice of AI provider.</p>

          <h3>Q: Do AI recommendations cost money?</h3>
          <p>AI providers charge per API call. Costs vary by provider (OpenAI: ~$0.01 per recommendation, Claude/Gemini: similar). RichDad optimizes calls to minimize costs.</p>

          <h3>Q: How accurate are the AI recommendations?</h3>
          <p>AI trading assistants provide insights based on data analysis, but they cannot predict the future. View the AI Performance panel to see historical accuracy (batting average). Never invest money you cannot afford to lose.</p>

          <h3>Q: Can I use RichDad for day trading?</h3>
          <p>With Alpha Vantage free tier, chart data is cached for 24 hours. For serious day trading, you'd need a premium data provider with real-time updates. RichDad is better suited for swing trading and long-term analysis with the free tier.</p>

          <h3>Q: Why does only SPY get 5-minute data?</h3>
          <p>To stay within the 25 API calls/day limit, RichDad allocates the chart budget to SPY (most actively traded ETF). Other symbols use daily data to conserve API calls.</p>

          <h3>Q: Where is my data stored?</h3>
          <p>All data is stored locally on your computer using IndexedDB. API keys, trade history, and settings never leave your machine. There is no cloud sync or remote storage.</p>

          <h3>Q: Can I export my trade history?</h3>
          <p>Yes! Go to Settings → My Profile → Export Trade Decisions. You can export to CSV or TXT format.</p>
        </div>
      )

    case 'terms':
      return (
        <div className="prose prose-invert max-w-none">
          <h2 className="text-terminal-amber">Terms of Service</h2>

          <p className="text-sm text-gray-400">Last updated: {new Date().toLocaleDateString()}</p>

          <h3>1. Acceptance of Terms</h3>
          <p>By using RichDad, you agree to these Terms of Service.</p>

          <h3>2. No Financial Advice</h3>
          <p>RichDad and its AI recommendations are for informational purposes only. This is NOT financial advice. You are solely responsible for your trading decisions.</p>

          <h3>3. No Warranty</h3>
          <p>RichDad is provided "as is" without warranty of any kind. We do not guarantee accuracy, uptime, or profitability.</p>

          <h3>4. Limitation of Liability</h3>
          <p>The developer (LovelaceX) shall not be liable for any losses incurred from using RichDad.</p>

          <h3>5. Third-Party Services</h3>
          <p>RichDad relies on third-party APIs (Alpha Vantage, AI providers). We are not responsible for their availability or accuracy.</p>

          <h3>6. User Conduct</h3>
          <p>Do not use RichDad for illegal activities or to violate API provider terms of service.</p>
        </div>
      )

    case 'privacy':
      return (
        <div className="prose prose-invert max-w-none">
          <h2 className="text-terminal-amber">Privacy Policy</h2>

          <p className="text-sm text-gray-400">Last updated: {new Date().toLocaleDateString()}</p>

          <h3>Data Collection</h3>
          <p>RichDad does NOT collect, transmit, or store any personal data on external servers.</p>

          <h3>Local Storage Only</h3>
          <p>All data is stored locally on your computer:</p>
          <ul>
            <li>API keys (IndexedDB)</li>
            <li>Trade history (IndexedDB)</li>
            <li>Settings and preferences (IndexedDB, localStorage)</li>
          </ul>

          <h3>Third-Party API Calls</h3>
          <p>When you use RichDad, your computer makes API calls to:</p>
          <ul>
            <li>Alpha Vantage (market data) - subject to their privacy policy</li>
            <li>Your chosen AI provider - subject to their privacy policy</li>
            <li>RSS feeds (news sources) - publicly available data</li>
          </ul>

          <h3>No Analytics or Tracking</h3>
          <p>RichDad does not use analytics, cookies, or tracking pixels.</p>

          <h3>Your Responsibilities</h3>
          <ul>
            <li>Keep your API keys secure</li>
            <li>Do not share API keys with others</li>
            <li>Review privacy policies of third-party API providers</li>
          </ul>
        </div>
      )

    case 'security':
      return (
        <div className="prose prose-invert max-w-none">
          <h2 className="text-terminal-amber">Security</h2>

          <h3>API Key Storage</h3>
          <p>API keys are stored locally in IndexedDB on your computer. They are never transmitted to RichDad servers (because there are no RichDad servers).</p>

          <h3>Best Practices</h3>
          <ul>
            <li>Use read-only API keys when possible</li>
            <li>Never share your API keys</li>
            <li>Rotate keys periodically</li>
            <li>Set spending limits on AI provider accounts</li>
          </ul>

          <h3>Open Source</h3>
          <p>RichDad is open-source software. You can review the code to verify security practices.</p>

          <h3>Tauri Security</h3>
          <p>RichDad is built with Tauri, a security-focused framework that:</p>
          <ul>
            <li>Runs with minimal system permissions</li>
            <li>Sandboxes web content</li>
            <li>Uses Content Security Policy (CSP)</li>
          </ul>
        </div>
      )

    case 'about':
      return (
        <div className="prose prose-invert max-w-none">
          <h2 className="text-terminal-amber">About RichDad</h2>

          <div className="bg-terminal-bg border border-terminal-border rounded p-6 my-6 text-center">
            <h3 className="text-terminal-amber text-2xl mb-2">RichDad v2.3.0</h3>
            <p className="text-gray-400">AI-Powered Trading Terminal</p>
          </div>

          <h3>Developer</h3>
          <p><strong>LovelaceX</strong></p>
          <p>Building tools for traders at the intersection of AI and finance.</p>

          <h3>Contact</h3>
          <div className="bg-terminal-bg border border-terminal-border rounded p-4 flex items-center gap-3">
            <Mail size={20} className="text-terminal-amber" />
            <div>
              <p className="font-semibold">Support Email</p>
              <a href="mailto:support@lovelacex.com" className="text-terminal-amber hover:underline">
                support@lovelacex.com
              </a>
            </div>
          </div>

          <h3>Technology Stack</h3>
          <ul>
            <li><strong>Framework:</strong> Tauri 2.x (Rust + React)</li>
            <li><strong>Frontend:</strong> React 18 + TypeScript</li>
            <li><strong>State:</strong> Zustand</li>
            <li><strong>Database:</strong> IndexedDB (Dexie.js)</li>
            <li><strong>Charts:</strong> Lightweight Charts</li>
            <li><strong>AI:</strong> Multi-provider support</li>
          </ul>

          <h3>License</h3>
          <p>RichDad is proprietary software developed by LovelaceX.</p>

          <h3>Acknowledgments</h3>
          <p>Special thanks to:</p>
          <ul>
            <li>Alpha Vantage for market data API</li>
            <li>TradingView for Lightweight Charts library</li>
            <li>All open-source contributors</li>
          </ul>
        </div>
      )

    default:
      return <p className="text-gray-400">Content not found.</p>
  }
}
