<p align="center">
  <img src="https://img.shields.io/badge/version-4.4.0-gold?style=for-the-badge" alt="Version 4.4.0"/>
  <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="MIT License"/>
  <img src="https://img.shields.io/badge/tauri-2.x-blue?style=for-the-badge&logo=tauri" alt="Tauri 2.x"/>
  <img src="https://img.shields.io/badge/react-18-61DAFB?style=for-the-badge&logo=react" alt="React 18"/>
  <img src="https://img.shields.io/badge/typescript-strict-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/platforms-macOS%20|%20Windows-lightgrey?style=for-the-badge" alt="Platforms"/>
</p>

<h1 align="center">RichDad</h1>

<p align="center">
  <strong>Open-source trading research tool with AI analysis</strong>
</p>

<p align="center">
  A free desktop app that combines market data, AI-assisted analysis, and trade journaling—stored locally on your machine.
</p>

---

## About

RichDad is an open-source trading research tool for individual investors who want AI-assisted analysis without subscription fees or cloud dependencies.

**What it does:**
- Fetches market data from free APIs (Massive.com, Alpha Vantage)
- Sends data to your AI provider of choice for analysis
- Displays recommendations with confidence scores
- Tracks trade decisions and outcomes over time
- Stores everything locally—no accounts, no servers, no data collection

**What it's not:**
- A broker or trading platform (no order execution)
- Financial advice (AI recommendations are for research only)
- A replacement for professional tools or licensed advisors

### Limitations

| Capability | Constraint |
|------------|------------|
| Market data | 15-min delayed quotes on free tier |
| Coverage | US equities only |
| API access | Requires your own API keys |
| Data sync | Local only—no cloud sync across devices |
| Historical data | Limited by API provider constraints |

---

## Features

### AI Analysis
- **Multi-Provider Support**: OpenAI, Claude, Gemini, Grok, DeepSeek, Llama
- **Configurable Settings**: Recommendation intervals and confidence thresholds
- **Performance Tracking**: W-L-P records and export to CSV
- **Combined Signals**: Technical indicators + news sentiment
- **Options-Aware Mode**: Optional suggestions like "Buy Call for leverage" on high-confidence signals
- **Market Context**: AI adapts analysis based on selected market (tech-heavy for NASDAQ, blue-chip for Dow)

### Intelligence Panel
- **News Intel**: Real-time sentiment analysis across your watchlist
- **Breaking Alerts**: Flags news less than 1 hour old with high-impact keywords
- **Velocity Spikes**: Detects unusual news volume for specific symbols
- **Pattern Scanner**: Proactively scans watchlist for candlestick pattern setups
- **Urgency Indicators**: High/Medium/Low badges based on pattern reliability + volume confirmation

### Market View
- **Index Selector**: Switch between S&P 500 (SPY), NASDAQ-100 (QQQ), Dow Jones (DIA), Russell 2000 (IWM)
- **Synced Dashboard**: Chart and analysis adapt to selected market
- **Multi-Window Support**: Open multiple windows (Cmd+N / Ctrl+N) with shared data

### Charts
- **Candlestick Charts**: Powered by TradingView's Lightweight Charts library
- **Pattern Recognition**: Detects common candlestick patterns (Engulfing, Hammer, Doji, etc.)
- **News Markers**: Visual indicators showing when news events occurred
- **Multiple Timeframes**: 1M, 5M, 15M, 30M, 1H, Daily

### Trade Management
- **Price Alerts**: Custom triggers with notifications
- **Position Sizing Calculator**: Based on risk parameters
- **Trade History**: Decision log with outcome tracking
- **Notification Center**: Queue for pending recommendations

### Economic Calendar
- **FRED Integration**: Free API from the Federal Reserve for US economic events
- **Upcoming Events**: CPI, Jobs Report, Fed Decisions, GDP releases
- **Countdown Display**: Days/hours until major market-moving events
- **Ticker View**: Scrolling ticker below news for quick glance

#### Getting a FRED API Key
1. Visit [fred.stlouisfed.org/docs/api/api_key.html](https://fred.stlouisfed.org/docs/api/api_key.html)
2. Click "Request or view your API keys"
3. Create account and request key (describe as "personal use")
4. Copy key to Settings > API Keys > FRED

### Accessibility
- **CVD Mode**: Colorblind-friendly display
- **Keyboard Shortcuts**: Navigate without a mouse
- **Adjustable Settings**: Customize news feed speed and panel layouts

### API Budget System
- **Tier Selection**: Configure your API tier (free/paid) per provider
- **Usage Tracking**: Real-time budget meters for all data providers
- **Smart Fallbacks**: Automatic switch to cached data when limits reached
- **Toast Notifications**: Alerts when approaching or hitting rate limits

### Keyboard Shortcuts

| Action | Mac | Windows |
|--------|-----|---------|
| New Window | Cmd+N | Ctrl+N |
| Dashboard | Cmd+1 | Ctrl+1 |
| News | Cmd+2 | Ctrl+2 |
| Settings | Cmd+, | Ctrl+, |
| Backtest | Cmd+3 | Ctrl+3 |
| Trade History | Cmd+4 | Ctrl+4 |
| Help | Cmd+? | Ctrl+? |

---

## Privacy

RichDad stores all data locally. There are no user accounts, no cloud servers, and no analytics.

| Aspect | Implementation |
|--------|----------------|
| **Data Storage** | IndexedDB in local app data |
| **API Keys** | Stored locally, sent only to providers you configure |
| **Telemetry** | None collected |
| **Source Code** | Open source (MIT license) |

### Third-Party Services

RichDad makes direct API calls to services you configure:
- **Market Data**: Massive.com or Alpha Vantage (your key, your account)
- **AI Analysis**: Your chosen provider
- **News**: Public RSS feeds
- **Economic Calendar**: FRED API (Federal Reserve Economic Data)

These calls go directly from your machine to the provider.

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

**Installer**:
```powershell
Invoke-WebRequest -Uri "https://github.com/LovelaceX/richdad/releases/latest/download/RichDad_x64_en-US.msi" -OutFile "RichDad.msi"
Start-Process RichDad.msi
```

**Portable**: Download `RichDad_x64-setup.exe` from [Releases](https://github.com/LovelaceX/richdad/releases)

---

## Getting Started

### 1. Complete Setup
The app includes guided onboarding:
- Accept Terms & Conditions
- Configure API keys
- Select AI provider
- Set risk parameters

### 2. Get API Keys

**Market Data (choose one or more)**:
| Provider | Free Tier | Paid Tiers | Link |
|----------|-----------|------------|------|
| Polygon | 5 calls/min | Starter: 100/min, Developer: 1K/min, Advanced: Unlimited | [Get Key](https://polygon.io/dashboard/signup) |
| TwelveData | 8 calls/min, 800/day | Basic: 30/min, Pro: 80/min | [Get Key](https://twelvedata.com/account) |
| Alpha Vantage | 25 calls/day | Premium: Higher limits | [Get Key](https://www.alphavantage.co/support/#api-key) |
| Finnhub | 60 calls/min | Premium: Higher limits | [Get Key](https://finnhub.io/register) |

**AI Provider (choose one)**:
| Provider | Link |
|----------|------|
| OpenAI | [platform.openai.com](https://platform.openai.com/api-keys) |
| Anthropic (Claude) | [console.anthropic.com](https://console.anthropic.com/) |
| Google (Gemini) | [makersuite.google.com](https://makersuite.google.com/app/apikey) |
| Grok | [console.x.ai](https://console.x.ai/) |
| DeepSeek | [platform.deepseek.com](https://platform.deepseek.com/) |

### 3. Start Using
- Dashboard opens to SPY by default
- AI analysis runs based on your configured interval
- Review recommendations via the notification bell
- Add tickers in Settings > Watchlist

---

## How AI Analysis Works

RichDad uses LLM-based reasoning. Here's the process:

1. Collects market data and news for the selected ticker
2. Calculates technical indicators (RSI, MACD, moving averages)
3. Detects candlestick patterns (Engulfing, Hammer, Doji, etc.)
4. Determines market regime based on VIX and SPY trend
5. Formats data into a structured prompt
6. Sends to your AI provider
7. AI returns: action, confidence %, rationale, price target, stop loss
8. Recommendations meeting your confidence threshold are displayed

### Technical Indicators

| Indicator | Description |
|-----------|-------------|
| RSI(14) | Overbought (>70) / Oversold (<30) signals |
| MACD | Bullish/bearish momentum via histogram |
| MA(20/50/200) | Short, medium, and long-term trend |

### Market Regime

The AI adjusts its recommendations based on current market conditions:

| Regime | VIX Level | Guidance |
|--------|-----------|----------|
| LOW_VOL_BULLISH | <15 | Full positions, momentum strategies favored |
| ELEVATED_VOL_BULLISH | 15-25 | Be selective, tighten stops |
| HIGH_VOL_BEARISH | >25 | Defensive positioning, avoid new longs |
| CHOPPY | >25 + no trend | Avoid directional bets, favor HOLD |

### Output Format

Each recommendation includes:
- **Action**: BUY, SELL, or HOLD
- **Confidence**: 0-100% (default threshold: 70%)
- **Rationale**: 2-3 sentence explanation citing specific data
- **Price Target**: Expected move (default 5%)
- **Stop Loss**: Risk limit (default 3%)

**Note**: There are no hardcoded trading rules. The AI interprets data contextually, which means results will vary based on market conditions and the AI provider used.

---

## Technology

| Layer | Stack |
|-------|-------|
| Frontend | React 18, TypeScript, Tailwind CSS, Zustand |
| Desktop | Tauri 2.x (Rust) |
| Storage | IndexedDB (Dexie.js) |
| Charts | TradingView Lightweight Charts |

---

## Development

### Prerequisites
- Node.js 20+
- Rust 1.70+ ([rustup.rs](https://rustup.rs))
- Platform tools:
  - macOS: Xcode Command Line Tools
  - Windows: Microsoft C++ Build Tools

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
│   ├── pages/
│   ├── stores/
│   └── lib/
├── src/services/             # Business logic
└── src-tauri/                # Rust backend
```

---

## Data Storage

RichDad stores data locally at:

| Platform | Location |
|----------|----------|
| macOS | `~/Library/Application Support/richdad/` |
| Windows | `%APPDATA%/richdad/` |

### Complete Uninstall

**Option 1 - In-App**:
Settings > Danger Zone > Factory Reset, then delete the app

**Option 2 - Manual**:
```bash
# macOS
rm -rf ~/Library/Application\ Support/richdad/

# Windows (PowerShell)
Remove-Item -Recurse -Force "$env:APPDATA\richdad"
```

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

```bash
# Quick start
1. Fork the repository
2. Create a feature branch
3. Follow TypeScript strict mode
4. Test with `npm run build`
5. Submit a pull request
```

---

## License

**MIT License** - Copyright (c) 2025 LovelaceX

See [LICENSE](./LICENSE) for full text.

---

## Changelog

### v4.4.0 - Reliability & Performance

**Error Handling**
- Added top-level ErrorBoundary to prevent crashes from taking down the app
- AI calls now have 30-second timeout with automatic cancellation
- AI responses validated with schema checking to prevent malformed data crashes

**Network Resilience**
- Added retry logic with exponential backoff (3 attempts, 1-10s delays)
- Smart retry skipping for rate limit and auth errors (no point retrying)
- Graceful fallback chain: API → Cache → Mock data

**Performance**
- Added React.memo to frequently rendered components (NavBar, PatternDiagram, WatchlistItem)
- Memoized expensive selectors in ChartPanel to reduce re-renders
- Fixed memory leak in DataHeartbeatService event listeners
- Fixed event listener leak in market store initialization

**Memory Management**
- AI message history now capped at 100 messages to prevent unbounded growth
- Improved cleanup of stale data in background services

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
  <strong>Disclaimer</strong>: RichDad is a research tool. It does not provide financial advice. Always do your own research and consult licensed professionals before making investment decisions.
</p>
