# RichDad

**Bloomberg Terminal-style AI-powered trading copilot for retail investors.**

RichDad is a professional desktop trading application that combines real-time market data, AI-driven analysis, and customizable alerts to help traders make informed decisions. Built with Tauri 2.x for maximum performance and security.

---

## Features

### AI-Powered Analysis
- **Customizable AI Copilot**: Configure recommendation intervals (5/10/15 min) and confidence thresholds (0-100%)
- **Multi-Provider Support**: OpenAI, Claude, Gemini, Grok, DeepSeek, Llama
- **Performance Tracking**: Detailed analytics with batting average, W-L-P records, and CSV export
- **Smart Recommendations**: Technical analysis combined with sentiment analysis from news

### Market Data & Charts
- **Real-Time Quotes**: Live price updates with volume and change indicators
- **Advanced Charting**: Multiple timeframes for SPY (1M, 5M, 15M, 30M, 1H, Daily)
- **Watchlist Management**: Track multiple tickers with persistent storage
- **24/7 News Feed**: Bloomberg, Reuters, TradingView, Barchart RSS feeds

### Risk Management
- **Price Alerts**: Set custom alerts with sound notifications
- **Position Sizing**: AI-powered recommendations based on portfolio size
- **Daily Loss Limits**: Configurable risk parameters
- **Trade History**: Track all decisions with outcome analysis

### Professional UX
- **Bloomberg-Style Interface**: Dark terminal theme optimized for trading
- **API Budget Monitoring**: Real-time Alpha Vantage usage tracking with alerts at 80%/100%
- **Keyboard Shortcuts**: Cmd+1 (Dashboard), Cmd+2 (News), Cmd+3 (Settings)
- **CVD Mode**: Colorblind-friendly display option

---

## Installation

### macOS

**Apple Silicon (M1/M2/M3)**:
```bash
curl -LO https://github.com/LovelaceX/richdad/releases/latest/download/RichDad_2.4.0_aarch64.dmg
open RichDad_2.4.0_aarch64.dmg
```

**Intel**:
```bash
curl -LO https://github.com/LovelaceX/richdad/releases/latest/download/RichDad_2.4.0_x64.dmg
open RichDad_2.4.0_x64.dmg
```

### Windows

**Installer (recommended)**:
```powershell
Invoke-WebRequest -Uri "https://github.com/LovelaceX/richdad/releases/latest/download/RichDad_2.4.0_x64_en-US.msi" -OutFile "RichDad_2.4.0_x64_en-US.msi"
Start-Process RichDad_2.4.0_x64_en-US.msi
```

**Portable**:
Download `RichDad_2.4.0_x64-setup.exe` from [Releases](https://github.com/LovelaceX/richdad/releases) and run directly.

### Linux

**Debian/Ubuntu** (.deb):
```bash
wget https://github.com/LovelaceX/richdad/releases/latest/download/rich-dad_2.4.0_amd64.deb
sudo dpkg -i rich-dad_2.4.0_amd64.deb
```

**Universal** (AppImage):
```bash
wget https://github.com/LovelaceX/richdad/releases/latest/download/rich-dad_2.4.0_amd64.AppImage
chmod +x rich-dad_2.4.0_amd64.AppImage
./rich-dad_2.4.0_amd64.AppImage
```

---

## Getting Started

### 1. First Launch - Onboarding Wizard
RichDad includes a guided setup wizard:
- Accept Terms & Conditions
- Configure API keys (Alpha Vantage for market data)
- Select AI provider (OpenAI, Claude, etc.)
- Customize risk settings

### 2. API Keys Required

**Alpha Vantage** (Market Data - Free tier: 25 calls/day):
- Get your free API key: https://www.alphavantage.co/support/#api-key
- Enter in Settings → API Keys → Alpha Vantage API Key

**AI Provider** (Choose one):
- OpenAI: https://platform.openai.com/api-keys
- Anthropic Claude: https://console.anthropic.com/
- Google Gemini: https://makersuite.google.com/app/apikey
- Grok (X.AI): https://console.x.ai/
- DeepSeek: https://platform.deepseek.com/

### 3. Start Trading
- Dashboard opens to SPY by default
- AI copilot begins analysis based on your configured interval
- Add tickers to watchlist via Settings → Watchlist
- Set price alerts and configure risk parameters

---

## Technology Stack

### Frontend
- **React 18**: Modern UI framework with hooks
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Professional Bloomberg-style design
- **Zustand**: Lightweight state management
- **Dexie.js**: IndexedDB wrapper for persistent storage

### Backend
- **Tauri 2.x**: Rust-based desktop framework (replaces Electron)
- **Rust**: High-performance system integration
- **Alpha Vantage API**: Real-time market data
- **RSS Feeds**: 24/7 news aggregation

### Charts & Visualization
- **Lightweight Charts**: TradingView library for candlestick charts
- **Framer Motion**: Smooth UI animations

---

## Development

### Prerequisites
- **Node.js** 20+ and npm
- **Rust** 1.70+ (install via https://rustup.rs)
- **Platform-specific dependencies**:
  - macOS: Xcode Command Line Tools
  - Windows: Microsoft C++ Build Tools
  - Linux: `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`

### Setup
```bash
# Clone the repository
git clone https://github.com/LovelaceX/richdad.git
cd richdad

# Install dependencies
npm install

# Run in development mode
npm run tauri:dev

# Build production app
npm run tauri:build
```

### Project Structure
```
richdad-tauri/
├── src/
│   ├── renderer/           # React frontend
│   │   ├── components/     # UI components
│   │   ├── pages/          # Main pages (Dashboard, News, Settings)
│   │   ├── stores/         # Zustand state management
│   │   ├── lib/            # Utilities (db, ai, mockData)
│   │   └── types/          # TypeScript interfaces
│   └── services/           # Business logic
│       ├── marketData.ts   # Alpha Vantage integration
│       ├── aiRecommendationEngine.ts
│       ├── technicalIndicators.ts
│       └── apiBudgetTracker.ts
├── src-tauri/              # Rust backend
│   ├── src/
│   │   └── lib.rs          # Tauri commands
│   └── tauri.conf.json     # App configuration
└── .github/
    └── workflows/
        └── build.yml       # Multi-platform CI/CD
```

### Database Schema
RichDad uses IndexedDB (via Dexie.js) for local persistence:
- `settings`: User preferences, API keys, risk parameters
- `aiSettings`: AI provider config, intervals, thresholds
- `watchlist`: Tracked symbols with live quotes
- `tradeDecisions`: AI recommendation history with outcomes
- `priceAlerts`: User-configured price alerts

---

## Performance & Compatibility

- **Platforms**: macOS (Intel + Apple Silicon), Windows 10/11, Linux (Debian/Ubuntu/AppImage)
- **Bundle Size**: ~773 KB (optimized with Tauri)
- **Memory**: ~150 MB average runtime
- **Startup**: <3 seconds cold start
- **TypeScript**: Zero compilation errors
- **Free Tier Friendly**: Optimized for Alpha Vantage's 25 calls/day limit

---

## Roadmap

### v2.5.0 (Planned)
- Multi-symbol AI analysis
- Custom alert conditions builder
- Portfolio tracking integration
- Advanced charting indicators (Bollinger Bands, Fibonacci)
- Real-time WebSocket data streams

### v3.0.0 (Future)
- Broker integrations (Robinhood, TD Ameritrade)
- Paper trading mode
- Backtesting engine
- Community sharing of strategies

---

## Contributing

We welcome contributions! Please follow these guidelines:

1. **Fork the repository** and create a feature branch
2. **Follow the existing code style** (TypeScript strict mode, no emojis in code)
3. **Test thoroughly** - ensure no TypeScript errors (`npm run build`)
4. **Write clear commit messages** following the project's format
5. **Submit a pull request** with a detailed description

### Code Standards
- TypeScript strict mode enabled
- ESLint configuration followed
- No console.logs in production code (use proper logging)
- Professional tone in comments and documentation

---

## License

**MIT License**

Copyright (c) 2024 LovelaceX

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## Support

- **Issues**: [GitHub Issues](https://github.com/LovelaceX/richdad/issues)
- **Discussions**: [GitHub Discussions](https://github.com/LovelaceX/richdad/discussions)
- **Documentation**: [Wiki](https://github.com/LovelaceX/richdad/wiki)
- **Releases**: [Changelog](https://github.com/LovelaceX/richdad/releases)

---

## Acknowledgments

Built with:
- [Tauri](https://tauri.app) - Rust-powered desktop framework
- [React](https://react.dev) - UI library
- [Lightweight Charts](https://tradingview.github.io/lightweight-charts/) - TradingView charting library
- [Alpha Vantage](https://www.alphavantage.co) - Market data provider
- [OpenAI](https://openai.com), [Anthropic](https://anthropic.com), [Google](https://ai.google.dev) - AI providers

---

**Disclaimer**: RichDad is a research and analysis tool. It does not provide financial advice. Always conduct your own research and consult with licensed financial advisors before making investment decisions. Past performance does not guarantee future results.
