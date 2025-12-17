# RichDad v2.4.0 - AI Customization & Chart Enhancements

## Overview

This release introduces comprehensive AI customization controls and expanded chart functionality, empowering users with full control over AI recommendation behavior and enhanced market analysis capabilities. Built with a Bloomberg-style professional UX, all features are database-driven and persist across sessions.

---

## New Features

### 1. Customizable AI Recommendation Interval

Take control of how frequently your AI copilot analyzes the market.

**Features:**
- Three preset intervals: 5, 10, or 15 minutes
- Dynamic updates: Changes apply instantly without app restart
- Smart tradeoffs: Balance API usage vs. analysis frequency
- Settings location: Settings → AI Copilot → Recommendation Interval

**Use Cases:**
- Day traders: 5-minute intervals for rapid market changes
- Swing traders: 15-minute intervals to conserve API budget
- Custom strategies: Fine-tune to match your trading style

---

### 2. Customizable Confidence Threshold

Filter AI recommendations by confidence level to match your risk tolerance.

**Features:**
- Adjustable slider: 0-100% in 5% increments
- Default: 70% (proven baseline)
- Smart warnings: Alert when threshold < 50%
- Real-time filtering: Only see recommendations meeting your threshold

**Example:**
- Conservative: 80%+ threshold (fewer but higher-quality signals)
- Aggressive: 50%+ threshold (more signals, higher risk)
- Balanced: 70% threshold (recommended starting point)

---

### 3. AI Performance History & Analytics

Comprehensive analytics dashboard to track your AI copilot's performance over time.

**Features:**
- Baseball-style metrics: Batting average, W-L-P record
- Financial metrics: Average return %, total trades
- Advanced filtering: By symbol, outcome (win/loss/pending/neutral)
- Paginated history: 10 trades per page with full details
- CSV export: Download complete trade history for external analysis
- Settings integration: Full analytics view in Settings → AI Copilot

**Metrics Displayed:**
- Entry/exit prices with P/L percentages
- Days held per trade
- Confidence levels vs. actual outcomes
- Time-series performance tracking

---

### 4. Expanded SPY Chart Timeframes

Enhanced intraday analysis for SPY with 6 timeframe options.

**Available Timeframes:**
- SPY: 1M, 5M, 15M, 30M, 1H, Daily (6 options)
- Other symbols: 5M, Daily (2 options, optimized for API budget)

**Technical Details:**
- Interval-specific caching for optimal performance
- Seamless switching without page reload
- Automatic fallback to daily charts for API budget preservation

**Use Cases:**
- Scalpers: 1-minute charts for ultra-fast trades
- Day traders: 5-15 minute charts for intraday positions
- Swing traders: 1-hour + daily for trend analysis

---

### 5. API Budget Alerts & Monitoring

Proactive monitoring of Alpha Vantage API usage to prevent service interruptions.

**Components:**

**TopBar Alert** (non-intrusive):
- Appears at 80% usage (yellow warning)
- Critical alert at 100% (red, cached data mode)
- Dismissable with real-time usage stats
- Shows reset time (12:00 AM daily)

**Settings Meter** (detailed view):
- Real-time progress bar with color coding
- Breakdown: Market Data (23/25), Charts (1/25), News (1/25)
- Auto-updates every 30 seconds
- Located in Settings → API Keys

**Smart Behavior:**
- Automatically uses cached data when limits reached
- Graceful degradation (stale data better than no data)
- Clear communication of data freshness

---

## Technical Improvements

### Database
- Version 4 migration for backward compatibility
- Extended AISettings interface with new fields
- Sensible defaults: 15 min interval, 70% confidence

### Architecture
- Event-driven settings updates (zero latency)
- Interval-based caching for chart data
- Type-safe timeframe handling across codebase

### Services
- DataHeartbeatService: Dynamic interval reloading
- aiRecommendationEngine: Configurable threshold filtering
- marketData.ts: Full intraday interval support (1min-60min)

---

## Installation

### macOS

**Apple Silicon (M1/M2/M3)**:
```bash
curl -LO https://github.com/LovelaceX/richdad/releases/download/v2.4.0/RichDad_2.4.0_aarch64.dmg
open RichDad_2.4.0_aarch64.dmg
```

**Intel**:
```bash
curl -LO https://github.com/LovelaceX/richdad/releases/download/v2.4.0/RichDad_2.4.0_x64.dmg
open RichDad_2.4.0_x64.dmg
```

### Windows

**Installer (recommended)**:
```powershell
Invoke-WebRequest -Uri "https://github.com/LovelaceX/richdad/releases/download/v2.4.0/RichDad_2.4.0_x64_en-US.msi" -OutFile "RichDad_2.4.0_x64_en-US.msi"
Start-Process RichDad_2.4.0_x64_en-US.msi
```

**Portable**:
Download `RichDad_2.4.0_x64-setup.exe` and run directly.

### Linux

**Debian/Ubuntu** (.deb):
```bash
wget https://github.com/LovelaceX/richdad/releases/download/v2.4.0/rich-dad_2.4.0_amd64.deb
sudo dpkg -i rich-dad_2.4.0_amd64.deb
```

**Universal** (AppImage):
```bash
wget https://github.com/LovelaceX/richdad/releases/download/v2.4.0/rich-dad_2.4.0_amd64.AppImage
chmod +x rich-dad_2.4.0_amd64.AppImage
./rich-dad_2.4.0_amd64.AppImage
```

---

## Migration from v2.3.0

Automatic database migration will run on first launch. Your data is preserved:
- Trade history maintained
- Price alerts preserved
- Watchlist unchanged
- Settings migrated with new defaults (15 min, 70%)

**Post-migration:**
1. Review AI settings in Settings → AI Copilot
2. Adjust interval/threshold to match your strategy
3. Check API Budget Meter to understand current usage

---

## Performance & Compatibility

- **Platforms**: macOS (Intel + Apple Silicon), Windows 10/11, Linux
- **TypeScript**: Zero compilation errors
- **Bundle size**: ~773 KB (optimized)
- **Memory**: ~150 MB average runtime
- **Startup**: <3 seconds cold start

---

## Bug Fixes

- Fixed chart timeframe type mismatches
- Resolved interval caching conflicts
- Corrected confidence threshold validation edge cases

---

## Credits

Built with:
- [Tauri 2.x](https://tauri.app) - Secure desktop framework
- [React 18](https://react.dev) - UI framework
- [TypeScript](https://www.typescriptlang.org) - Type safety
- [Zustand](https://zustand-demo.pmnd.rs) - State management
- [Dexie.js](https://dexie.org) - IndexedDB wrapper
- [Alpha Vantage](https://www.alphavantage.co) - Market data API

---

## Full Changelog

**Added:**
- Customizable AI recommendation interval (5/10/15 min)
- Customizable confidence threshold slider (0-100%)
- AI Performance Detail component with analytics
- Expanded SPY timeframes (1M/5M/15M/30M/1H/Daily)
- API Budget Alert (TopBar, 80%/100% warnings)
- API Budget Meter (Settings, real-time breakdown)
- Database v4 migration
- Event-driven settings updates
- CSV export for trade history

**Changed:**
- Default SPY timeframe: 5-minute (was: intraday generic)
- AI recommendation interval: configurable (was: hardcoded 15 min)
- Confidence threshold: configurable (was: hardcoded 70%)
- Chart interval caching: per-interval keys (was: per-symbol)

**Fixed:**
- TypeScript type mismatches in ChartPanel
- Interval type handling in aiRecommendationEngine
- Cache key conflicts for different timeframes

---

## What's Next (v2.5.0)

- Multi-symbol AI analysis
- Custom alert conditions builder
- Portfolio tracking integration
- Advanced charting indicators (Bollinger Bands, Fibonacci)
- Real-time WebSocket data streams

---

## Support

- **Issues**: [GitHub Issues](https://github.com/LovelaceX/richdad/issues)
- **Discussions**: [GitHub Discussions](https://github.com/LovelaceX/richdad/discussions)
- **Documentation**: [Wiki](https://github.com/LovelaceX/richdad/wiki)

---

**Released**: December 16, 2024
**Build**: bc43a1c → 95feed3
**License**: MIT
