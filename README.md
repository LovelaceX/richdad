<p align="center">
  <img src="https://img.shields.io/badge/version-4.3.0-gold?style=for-the-badge" alt="Version 4.3.0"/>
  <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="MIT License"/>
  <img src="https://github.com/LovelaceX/richdad/actions/workflows/ci.yml/badge.svg" alt="CI"/>
  <img src="https://img.shields.io/badge/tauri-2.x-blue?style=for-the-badge&logo=tauri" alt="Tauri 2.x"/>
  <img src="https://img.shields.io/badge/react-18-61DAFB?style=for-the-badge&logo=react" alt="React 18"/>
  <img src="https://img.shields.io/badge/typescript-strict-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/platforms-macOS%20|%20Windows-lightgrey?style=for-the-badge" alt="Platforms"/>
</p>

<h1 align="center">RichDad</h1>

<p align="center">
  <strong>Bloomberg Terminal-style AI-powered trading copilot for retail investors</strong>
</p>

<p align="center">
  Professional desktop trading application combining real-time market data, multi-provider AI analysis, and intelligent alerts to help traders make informed decisions.
</p>

---

## Why RichDad?

### vs Bloomberg Terminal

| Category | Bloomberg Terminal | RichDad | Edge |
|----------|-------------------|---------|------|
| **Cost** | $24,000/year | Free | RichDad |
| **Target User** | Institutions, hedge funds | Retail traders | — |
| **AI Analysis** | None built-in | 6 providers + batting average | **RichDad** |
| **Privacy** | Cloud-based, logged | 100% local, zero telemetry | **RichDad** |
| **Trade Journaling** | Basic | Outcome tracking + AI comparison | **RichDad** |
| **Position Sizing** | Manual calculation | Built-in calculator | **RichDad** |
| **Data Latency** | Real-time | 15-min delayed (free tier) | Bloomberg |
| **Asset Classes** | All (FX, bonds, derivatives) | US equities | Bloomberg |
| **Historical Data** | Decades | 90 days (API limit) | Bloomberg |
| **News Sources** | Bloomberg News + 1000s | RSS feeds | Bloomberg |
| **Setup Time** | IT department required | 5 minutes | **RichDad** |
| **Open Source** | No | Yes, auditable | **RichDad** |

### Our Moat

| Advantage | Why It Matters |
|-----------|----------------|
| **AI-First Architecture** | Bloomberg has data; we have intelligence. AI recommendations with confidence scores and performance tracking. |
| **Privacy by Design** | Your strategy never leaves your machine. Bloomberg knows everything you look at. |
| **Human vs AI Scorecard** | No platform tracks whether you're beating your AI copilot. We do. |
| **Zero Cost** | Democratizes tools that were $24K/year. Retail traders get institutional-style analysis. |
| **Outcome Accountability** | We track if recommendations actually worked. Bloomberg just gives you data. |


---

## Key Features

### AI Trading Copilot
- **Multi-Provider Support**: OpenAI, Claude, Gemini, Grok, DeepSeek, and Llama
- **Configurable Analysis**: Set recommendation intervals (5/10/15 min) and confidence thresholds (0-100%)
- **Performance Analytics**: Track batting average, W-L-P records, export to CSV
- **Smart Recommendations**: Technical indicators + news sentiment combined

### Notification Center (New in v3.0)
- **Bell Icon in Navigation**: Never miss a recommendation
- **Pending Queue**: Dismissed recommendations saved for later review
- **Bulk Actions**: "Execute All" and "Skip All" for efficient decision-making
- **Badge Counter**: Visual indicator for unactioned recommendations

### Professional Charts
- **Real-Time Candlesticks**: Powered by TradingView's Lightweight Charts
- **Candlestick Pattern Recognition**: Auto-detect 18+ patterns (Engulfing, Hammer, Doji, Morning Star, etc.) with on-chart P markers
- **News Markers**: N markers on chart showing when news broke, with click-to-view tooltips
- **Pattern Tooltips**: Click markers to see pattern diagrams, descriptions, and reliability ratings
- **Multiple Timeframes**: 1M, 5M, 15M, 30M, 1H, Daily
- **Live Price Updates**: Volume, change %, bid/ask spreads
- **Resizable Panels**: Customize your workspace layout

### Risk Management
- **Price Alerts**: Custom triggers with sound notifications
- **Position Sizing**: AI-powered recommendations based on portfolio
- **Daily Loss Limits**: Configurable risk parameters
- **Trade History**: Complete decision log with outcome tracking

### Accessibility
- **CVD Mode**: Colorblind-friendly display option
- **Keyboard Shortcuts**: Cmd+1 (Dashboard), Cmd+2 (News), Cmd+3 (Settings)
- **Floating Help**: Quick access to all shortcuts and features
- **Adjustable Ticker Speed**: Control news feed scroll rate

---

## Privacy & Security

RichDad is built with privacy as a core principle, not an afterthought.

| Promise | What It Means |
|---------|---------------|
| **No Ads, No Trackers** | Zero analytics, telemetry, or tracking pixels. Ever. |
| **Your Trades Are Yours** | All data stored locally in IndexedDB on your machine |
| **No Crowdsourcing** | We don't harvest your strategy to train models or sell insights |
| **No Cloud Servers** | RichDad has no backend - your data can't leak because it's never collected |
| **Open Source** | Every line of code is auditable. We have nothing to hide. |

### Why Desktop?

We built RichDad as a desktop app specifically for privacy. Unlike web apps that require servers:
- Your trading data never leaves your machine
- API keys are stored locally, never transmitted to us
- Your strategy is your intellectual property - we're not interested in monetizing it

### Third-Party Services

RichDad makes direct API calls to services you configure:
- **Market Data**: Massive.com (formerly Polygon.io) or Alpha Vantage (your API key, your account)
- **AI Analysis**: Your chosen provider (OpenAI, Claude, etc.)
- **News**: Public RSS feeds

These calls go directly from your machine to the provider. RichDad never sees or proxies this traffic.

---

## Screenshots

<p align="center">
  <em>Dashboard with AI recommendations and live charts</em>
</p>

<!-- Add your screenshots here -->
<!-- ![Dashboard](./screenshots/dashboard.png) -->
<!-- ![Themes](./screenshots/themes.png) -->
<!-- ![Notification Center](./screenshots/notifications.png) -->

---

## Installation

### macOS

**Apple Silicon (M1/M2/M3/M4)**:
```bash
curl -LO https://github.com/LovelaceX/richdad/releases/latest/download/RichDad_aarch64.dmg
open RichDad_aarch64.dmg
```

**Intel**:
```bash
curl -LO https://github.com/LovelaceX/richdad/releases/latest/download/RichDad_x64.dmg
open RichDad_x64.dmg
```

### Windows

**Installer (recommended)**:
```powershell
Invoke-WebRequest -Uri "https://github.com/LovelaceX/richdad/releases/latest/download/RichDad_x64_en-US.msi" -OutFile "RichDad.msi"
Start-Process RichDad.msi
```

**Portable**:
Download `RichDad_x64-setup.exe` from [Releases](https://github.com/LovelaceX/richdad/releases)

---

## Quick Start

### 1. Launch & Complete Setup Wizard
RichDad includes a guided onboarding:
- Accept Terms & Conditions
- Configure API keys
- Select AI provider
- Set risk parameters

### 2. Get Your API Keys

**Market Data (Choose one)**:
| Provider | Free Tier | Best For | Link |
|----------|-----------|----------|------|
| **Massive.com** (Recommended) | Unlimited calls, 15-min delay | Charts, technical analysis | [Get API Key](https://massive.com/dashboard/signup) |
| Alpha Vantage | 25 calls/day, real-time | Live quotes | [Get API Key](https://www.alphavantage.co/support/#api-key) |

**AI Provider (Choose one)**:
| Provider | Link |
|----------|------|
| OpenAI (GPT-4) | [platform.openai.com](https://platform.openai.com/api-keys) |
| Anthropic (Claude) | [console.anthropic.com](https://console.anthropic.com/) |
| Google (Gemini) | [makersuite.google.com](https://makersuite.google.com/app/apikey) |
| Grok (X.AI) | [console.x.ai](https://console.x.ai/) |
| DeepSeek | [platform.deepseek.com](https://platform.deepseek.com/) |

### 3. Start Trading
- Dashboard opens to SPY by default
- AI copilot begins analysis based on your interval
- Click the **bell icon** to review pending recommendations
- Add tickers via Settings > Watchlist

---

## Technology Stack

```
Frontend                    Backend                     Data
├── React 18               ├── Tauri 2.x (Rust)       ├── Massive.com API (default)
├── TypeScript (strict)    ├── IndexedDB (Dexie.js)   ├── Alpha Vantage API (alt)
├── Tailwind CSS           └── Native OS Integration  ├── RSS News Feeds
├── Zustand (state)                                    └── AI Providers
├── Framer Motion
└── Lightweight Charts
```

### Why Tauri over Electron?

| Metric | Electron | Tauri (RichDad) |
|--------|----------|-----------------|
| Bundle Size | ~150 MB | **~773 KB** |
| RAM Usage | ~300 MB | **~150 MB** |
| Startup Time | 5-10s | **<3s** |
| Security | Chromium sandbox | **Rust + native webview** |

---

## How AI Recommendations Work

RichDad uses **LLM-based reasoning**, not algorithmic trading rules. Here's how it decides BUY/SELL/HOLD:

### Data Sources

| Source | What It Provides |
|--------|------------------|
| **Massive.com** (Default) | Unlimited historical candles, 15-min delayed quotes |
| Alpha Vantage API | Real-time quotes, 25 calls/day limit |
| RSS News Feeds | Last 24 hours of headlines from 20+ financial sources |
| Technical Indicators | Calculated from historical price data |

### Technical Indicators Calculated

| Indicator | Meaning |
|-----------|---------|
| **RSI(14)** | Relative Strength Index - Overbought >70, Oversold <30 |
| **MACD** | Moving Average Convergence Divergence - Bull/Bear momentum |
| **MA(20)** | 20-day moving average - Short-term trend |
| **MA(50)** | 50-day moving average - Medium-term trend |
| **MA(200)** | 200-day moving average - Long-term trend ("Golden Cross/Death Cross") |

### The Decision Process

```
IMPORTANT: This is NOT algorithmic trading with fixed weights!

1. RichDad collects all market data + news for the selected ticker
2. Data is formatted into a structured prompt
3. Prompt is sent to your chosen AI (GPT-4, Claude, Gemini, etc.)
4. AI uses its training on financial markets to reason through:
   - Technical chart patterns
   - Support/resistance levels
   - Momentum indicators
   - News sentiment
   - Market context
5. AI returns: action, confidence %, rationale, price target, stop loss
6. Only recommendations ≥70% confidence (configurable) are displayed
```

**Key insight**: There are no hardcoded rules like "if RSI < 30, BUY". The AI interprets the full picture like a human analyst would - that's what makes it valuable.

### What's NOT Used
- Daily budget amount (that's for P&L tracking only)
- Your actual portfolio positions
- Real-time order book data
- Insider trading information

---

## Data Storage & Uninstall

### Where Data is Stored

RichDad stores all user data locally in IndexedDB (browser database) at:

| Platform | Location |
|----------|----------|
| **macOS** | `~/Library/Application Support/richdad/` |
| **Windows** | `%APPDATA%/richdad/` |
| **Linux** | `~/.config/richdad/` |

**Stored data includes:**
- API keys (Alpha Vantage, AI providers)
- Watchlist customizations
- AI recommendation history
- Theme and panel preferences
- Trade journal entries

### Complete Uninstall

**Important**: On macOS, deleting the app does NOT delete your data. To completely remove RichDad:

**Option 1 - Factory Reset (In-App)**:
1. Open Settings > Danger Zone
2. Click "Factory Reset"
3. Then delete the app

**Option 2 - Manual Deletion**:
```bash
# macOS
rm -rf ~/Library/Application\ Support/richdad/

# Windows (PowerShell)
Remove-Item -Recurse -Force "$env:APPDATA\richdad"

# Linux
rm -rf ~/.config/richdad/
```

---

## Development

### Prerequisites
- **Node.js** 20+
- **Rust** 1.70+ ([rustup.rs](https://rustup.rs))
- **Platform tools**:
  - macOS: Xcode Command Line Tools
  - Windows: Microsoft C++ Build Tools
  - Linux: `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`

### Setup
```bash
git clone https://github.com/LovelaceX/richdad.git
cd richdad
npm install
npm run tauri:dev      # Development mode
npm run tauri:build    # Production build
```

### Project Structure
```
richdad/
├── src/renderer/              # React frontend
│   ├── components/
│   │   ├── Chart/            # TradingChart, ProactiveAlert
│   │   ├── Navigation/       # NavBar, NotificationBell, NotificationPanel
│   │   ├── AIPanel/          # Chat, ActivityLog
│   │   ├── Help/             # FloatingHelp, HelpModal
│   │   └── Settings/         # MultiProviderManager, BudgetMeters
│   ├── pages/                # Dashboard, News, Settings
│   ├── stores/               # Zustand state (settings, notifications)
│   └── lib/                  # themes, db, utils
├── src/services/             # Business logic
│   ├── marketData.ts
│   ├── aiRecommendationEngine.ts
│   └── technicalIndicators.ts
└── src-tauri/                # Rust backend
    └── tauri.conf.json
```

---

## Changelog

### v4.3.0 (Current)
- **Smarter AI**: Candlestick patterns now included in AI recommendation prompts
- **Drawing Tools**: Add horizontal lines (double-click) and trendlines (click two points)
- **Pattern Insights**: Tooltip shows reliability score breakdown (volume, trend, location bonuses)
- **Persistent Drawings**: Lines saved per-symbol and persist across sessions

### v4.1.0
- **Portfolio Holdings**: Track your positions with live P&L calculation
- **Auto-Update Holdings**: BUY/SELL from QuickTrade automatically adjusts holdings
- **Full Backup/Restore**: Export all data (settings, trades, holdings, alerts) to JSON
- **Import Backup**: Restore from any previous backup
- **Offline Indicator**: See when using cached data due to network issues

### v4.0.0
- **Investing.com-Style Intraday Charts**: Chart x-axis now shows proper intraday time labels (9:30, 10:00, 10:30...) when selecting 30M or other intraday intervals
- **Timeframe-Aware Mock Data**: Mock data fallback now generates candles appropriate for selected timeframe instead of always daily

### v3.10.0
- **Streamlined Onboarding**: Back button replaces Skip, cleaner icons (no boxes), improved layout
- **Reference Guide Refresh**: Updated to v3.10.0, cleaner About section, linked developer GitHub
- **Single Theme**: Bloomberg theme is now the default (removed theme selector for simplicity)
- **Windows Support**: Data storage location instructions now show both macOS and Windows paths
- **Corrected API Limits**: Massive.com free tier accurately shown as 5 calls/min, 2 years historical, EOD data

### v3.9.0
- **Executor Tracking**: Performance History now shows "You" vs "AI Copilot" for each trade to compare human vs AI performance
- **Massive.com (Polygon.io) API Key**: Added to Settings > API Keys with test connection button
- **Market Data Provider Selector**: Choose between Massive.com, Alpha Vantage, or Finnhub as default provider
- **Removed Duplicate AI Performance**: Performance History now only appears in Settings > My Profile (not AI Copilot)
- **Enhanced CSV Export**: Executor column included in exported trade history

### v3.8.1
- **Notification Panel Fix**: Panel now opens to the right of the bell icon (was cut off on left)
- **Solid Buy/Sell Buttons**: Trading buttons are now solid green/red instead of outline style
- **EST Timezone Display**: Shows current New York time in chart toolbar
- **P/N Markers Default Off**: Pattern and news markers now disabled by default to reduce clutter
- **Removed Clearview Theme**: Consolidated to 4 dark themes for better consistency

### v3.8.0
- **Candlestick Pattern Recognition**: Auto-detect 18+ patterns (Bullish/Bearish Engulfing, Hammer, Doji, Morning/Evening Star, Harami, Piercing Line, Dark Cloud Cover, Inside Bar, Outside Up/Down, Breakaway)
- **On-Chart P Markers**: Green markers for bullish patterns, red for bearish - positioned above/below candles
- **News N Markers**: Amber circle markers showing when news headlines matched candle timestamps
- **Pattern Tooltips**: Click any marker to see pattern name, SVG diagram, description, reliability rating, and timestamp
- **P/N Toggle Buttons**: New toolbar buttons to show/hide pattern and news markers

### v3.7.0
- **Onboarding Wizard Refresh**: Streamlined setup with Lucide icons (no emojis)
- **Massive.com Integration**: Polygon.io rebranded to Massive.com with updated links
- **AI Provider Selection**: Choose between OpenAI or Groq (free) during onboarding
- **Cleaner UI**: Removed redundant containers and borders in wizard steps

### v3.6.0
- **Position Size Calculator**: Risk-based position sizing tool in chart toolbar - enter account size, risk %, entry & stop loss to calculate optimal share count

### v3.5.0
- **Top 10 Stocks**: Popular stocks (SPY, QQQ, AAPL, NVDA, TSLA, MSFT, AMZN, META, GOOGL, AMD) loaded on startup
- **Watchlist Persistence**: Your custom watchlist saved across restarts via IndexedDB
- **Quick Buy/Sell**: Manual trade logging via chart toolbar buttons with optional shares/dollar amounts
- **Human vs AI Scorecard**: Compare your trading performance against AI Copilot with side-by-side batting averages
- **Privacy Refresh**: Clearer messaging on local-only data storage throughout the app

### v3.4.0
- **Massive.com Integration**: Market data provider (formerly Polygon.io) with unlimited API calls (15-min delayed)
- **Provider Choice**: Choose between Massive.com (recommended) or Alpha Vantage during onboarding
- **CHOPPY Regime Detection**: New market regime for high volatility + sideways trend (SPY within 0.5% of MA50)
- **Smarter Provider Routing**: Automatic fallback between providers if one fails

### v3.3.0
- **Market Regime Classifier**: Automatic detection of market conditions (Risk On, Caution, Fear Mode, etc.)
- **Regime-Aware AI**: AI recommendations now factor in VIX level and SPY trend vs MA(50)
- **VIX in Watchlist**: Volatility index added to default watchlist
- **Regime Display**: Live regime indicator in MarketOverview bar with color-coded risk levels
- **Smarter Prompts**: AI now receives market regime context for better recommendations

### v3.2.0
- **News Grid Layout**: Multi-column responsive grid (1-4 columns)
- **Full-Screen Chart**: Expand icon to maximize chart view (Esc to exit)
- **Extended Timeframes**: 45M, 2H, 4H, 5H, 1W added via aggregation
- **Quick Timeframe Buttons**: Shortcut buttons below chart for SPY
- **Collapsible Panels**: Hide Market Watch and AI Copilot with toggles
- **Onboarding Fixes**: Solid backdrop, improved logo display
- **Data Cleanup Info**: Danger Zone now shows manual deletion paths

### v3.1.0
- **Multi-Window Support**: Cmd+N/Ctrl+N opens new windows
- **Panel Memory**: Collapse state persisted across sessions
- **Theme Fixes**: Amber color consistency across all themes
- **Keyboard Shortcut**: Cmd+N for new window

### v3.0.0
- **Notification Center**: Bell icon with pending recommendations queue
- **Bulk Actions**: Execute All / Skip All for efficient workflow
- **Wider Recommendation Modal**: Improved readability for alerts
- **Settings Persistence**: All preferences saved across sessions

### v2.4.6
- **Ticker Speed Slider**: Adjustable news feed scroll rate

### v2.4.5
- **Floating Help Button**: Quick access to shortcuts
- **AI Chat Clear All**: One-click conversation reset
- **Theme Persistence Fix**: Settings properly saved

### v2.4.0
- Multi-provider AI support
- API budget monitoring
- CVD accessibility mode

---

## Roadmap

### v4.4.0 (Next)
- [ ] Trade Tags/Categories (scalp, swing, earnings play)
- [ ] Trader's Autopsy (session review dashboard)
- [ ] Portfolio-aware AI (position sizing context)
- [ ] News deduplication and clustering
- [ ] Custom alert conditions builder

### v5.0.0 (Future)
- [ ] Broker integrations (Robinhood, TD Ameritrade)
- [ ] Paper trading mode
- [ ] Backtesting engine
- [ ] Strategy sharing
- [ ] Mobile companion app

---

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

**Quick Start:**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow TypeScript strict mode
4. Test thoroughly (`npm run build`)
5. Submit a pull request

---

## License

**MIT License** - Copyright (c) 2024 LovelaceX

See [LICENSE](./LICENSE) for full text.

---

## Links

- [Releases](https://github.com/LovelaceX/richdad/releases)
- [Issues](https://github.com/LovelaceX/richdad/issues)
- [Discussions](https://github.com/LovelaceX/richdad/discussions)

---

## Acknowledgments

Built with [Tauri](https://tauri.app), [React](https://react.dev), [Lightweight Charts](https://tradingview.github.io/lightweight-charts/), [Massive.com](https://massive.com/), and [Alpha Vantage](https://www.alphavantage.co).

---

<p align="center">
  <strong>Disclaimer</strong>: RichDad is a research and analysis tool. It does not provide financial advice. Always conduct your own research and consult with licensed financial advisors before making investment decisions. Past performance does not guarantee future results.
</p>
