<p align="center">
  <img src="https://img.shields.io/badge/version-3.0.0-gold?style=for-the-badge" alt="Version 3.0.0"/>
  <img src="https://img.shields.io/badge/tauri-2.x-blue?style=for-the-badge&logo=tauri" alt="Tauri 2.x"/>
  <img src="https://img.shields.io/badge/react-18-61DAFB?style=for-the-badge&logo=react" alt="React 18"/>
  <img src="https://img.shields.io/badge/typescript-strict-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/platforms-macOS%20|%20Windows%20|%20Linux-lightgrey?style=for-the-badge" alt="Platforms"/>
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

| Feature | Traditional Apps | RichDad |
|---------|------------------|---------|
| AI Analysis | Single provider, basic | **6 AI providers**, confidence thresholds, batting average tracking |
| Alerts | Price-only | **AI-powered recommendations** with Execute/Skip workflow |
| Themes | Light/Dark | **5 professional themes** including Clearview light mode |
| Performance | Electron bloat | **Tauri 2.x** - 773 KB bundle, <150MB RAM |
| Cost | Expensive APIs | **Free tier optimized** - Alpha Vantage 25 calls/day |

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
- **Multiple Timeframes**: 1M, 5M, 15M, 30M, 1H, Daily
- **Live Price Updates**: Volume, change %, bid/ask spreads
- **Resizable Panels**: Customize your workspace layout

### 5 Professional Themes
| Theme | Description |
|-------|-------------|
| **Bloomberg** | Classic terminal dark with amber accents |
| **Midnight** | Deep navy blue with cyan highlights |
| **Forest** | Dark green trading aesthetic |
| **Slate** | Clean gray professional look |
| **Clearview** | Light theme for daytime trading (New in v3.0) |

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
curl -LO https://github.com/LovelaceX/richdad/releases/latest/download/RichDad_3.0.0_aarch64.dmg
open RichDad_3.0.0_aarch64.dmg
```

**Intel**:
```bash
curl -LO https://github.com/LovelaceX/richdad/releases/latest/download/RichDad_3.0.0_x64.dmg
open RichDad_3.0.0_x64.dmg
```

### Windows

**Installer (recommended)**:
```powershell
Invoke-WebRequest -Uri "https://github.com/LovelaceX/richdad/releases/latest/download/RichDad_3.0.0_x64_en-US.msi" -OutFile "RichDad_3.0.0.msi"
Start-Process RichDad_3.0.0.msi
```

**Portable**:
Download `RichDad_3.0.0_x64-setup.exe` from [Releases](https://github.com/LovelaceX/richdad/releases)

### Linux

**Debian/Ubuntu**:
```bash
wget https://github.com/LovelaceX/richdad/releases/latest/download/rich-dad_3.0.0_amd64.deb
sudo dpkg -i rich-dad_3.0.0_amd64.deb
```

**AppImage (Universal)**:
```bash
wget https://github.com/LovelaceX/richdad/releases/latest/download/rich-dad_3.0.0_amd64.AppImage
chmod +x rich-dad_3.0.0_amd64.AppImage
./rich-dad_3.0.0_amd64.AppImage
```

---

## Quick Start

### 1. Launch & Complete Setup Wizard
RichDad includes a guided onboarding:
- Accept Terms & Conditions
- Configure API keys
- Select AI provider
- Set risk parameters

### 2. Get Your API Keys

**Market Data (Required)**:
| Provider | Free Tier | Link |
|----------|-----------|------|
| Alpha Vantage | 25 calls/day | [Get API Key](https://www.alphavantage.co/support/#api-key) |

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
├── React 18               ├── Tauri 2.x (Rust)       ├── Alpha Vantage API
├── TypeScript (strict)    ├── IndexedDB (Dexie.js)   ├── RSS News Feeds
├── Tailwind CSS           └── Native OS Integration  └── AI Providers
├── Zustand (state)
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

### v3.0.0 (Current)
- **Clearview Theme**: New light mode for daytime trading
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

### v3.1.0 (Next)
- [ ] Multi-symbol AI analysis
- [ ] Custom alert conditions builder
- [ ] Advanced indicators (Bollinger Bands, Fibonacci)

### v4.0.0 (Future)
- [ ] Broker integrations (Robinhood, TD Ameritrade)
- [ ] Paper trading mode
- [ ] Backtesting engine
- [ ] Strategy sharing

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow TypeScript strict mode
4. Test thoroughly (`npm run build`)
5. Submit a pull request

### Code Standards
- TypeScript strict mode enabled
- No console.logs in production
- Professional documentation

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

Built with [Tauri](https://tauri.app), [React](https://react.dev), [Lightweight Charts](https://tradingview.github.io/lightweight-charts/), and [Alpha Vantage](https://www.alphavantage.co).

---

<p align="center">
  <strong>Disclaimer</strong>: RichDad is a research and analysis tool. It does not provide financial advice. Always conduct your own research and consult with licensed financial advisors before making investment decisions. Past performance does not guarantee future results.
</p>
