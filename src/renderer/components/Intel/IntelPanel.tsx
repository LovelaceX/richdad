/**
 * Intel Panel
 * Displays intelligence from background agents (News Intel + Pattern Scanner)
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Zap,
  X,
  ExternalLink,
  Loader2,
  ScanLine,
  Target,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import {
  useIntelStore,
  selectSentimentRatio,
  selectUrgencyLevel,
  selectTopBullishSetups,
  selectTopBearishSetups,
  selectHighReliabilitySetups,
  selectHasPatternAlerts
} from '../../stores/intelStore'
import type { NewsAlert, PatternSetup, PatternScanReport } from '../../../services/agents/types'

export function IntelPanel() {
  // News Intel state
  const newsIntel = useIntelStore(state => state.newsIntel)
  const newsLoading = useIntelStore(state => state.newsIntelLoading)
  const lastNewsUpdate = useIntelStore(state => state.lastNewsIntelUpdate)
  const activeAlerts = useIntelStore(state => state.activeBreakingAlerts)
  const dismissAlert = useIntelStore(state => state.dismissBreakingAlert)

  // Pattern Scanner state
  const patternScan = useIntelStore(state => state.patternScan)
  const patternLoading = useIntelStore(state => state.patternScanLoading)
  const lastPatternUpdate = useIntelStore(state => state.lastPatternScanUpdate)

  // UI state
  const expanded = useIntelStore(state => state.intelPanelExpanded)
  const togglePanel = useIntelStore(state => state.toggleIntelPanel)
  const activeIntelTab = useIntelStore(state => state.activeIntelTab)
  const setActiveIntelTab = useIntelStore(state => state.setActiveIntelTab)

  // Selectors - use useShallow for object/array selectors to prevent infinite re-renders
  const sentimentRatio = useIntelStore(useShallow(selectSentimentRatio))
  const urgencyLevel = useIntelStore(selectUrgencyLevel)
  const topBullishSetups = useIntelStore(useShallow(selectTopBullishSetups))
  const topBearishSetups = useIntelStore(useShallow(selectTopBearishSetups))
  const highReliabilitySetups = useIntelStore(useShallow(selectHighReliabilitySetups))
  const hasPatternAlerts = useIntelStore(selectHasPatternAlerts)

  const [newsSubTab, setNewsSubTab] = useState<'overview' | 'symbols' | 'alerts'>('overview')
  const [patternSubTab, setPatternSubTab] = useState<'overview' | 'bullish' | 'bearish'>('overview')

  const loading = activeIntelTab === 'news' ? newsLoading : patternLoading
  const lastUpdate = activeIntelTab === 'news' ? lastNewsUpdate : lastPatternUpdate

  // Format last update time
  const formatLastUpdate = () => {
    if (!lastUpdate) return 'Never'
    const diff = Date.now() - lastUpdate
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    return `${Math.floor(minutes / 60)}h ago`
  }

  // Check if data is stale (patterns: >30 min, news: >10 min)
  const isDataStale = () => {
    if (!lastUpdate) return false
    const diff = Date.now() - lastUpdate
    const staleThreshold = activeIntelTab === 'patterns' ? 30 * 60000 : 10 * 60000
    return diff > staleThreshold
  }

  // Get urgency indicator color
  const getUrgencyColor = () => {
    if (activeIntelTab === 'patterns') {
      return hasPatternAlerts ? 'text-purple-400 bg-purple-900/30' : 'text-gray-400 bg-gray-900/30'
    }
    switch (urgencyLevel) {
      case 'high': return 'text-red-400 bg-red-900/30'
      case 'medium': return 'text-yellow-400 bg-yellow-900/30'
      default: return 'text-green-400 bg-green-900/30'
    }
  }

  const getUrgencyLabel = () => {
    if (activeIntelTab === 'patterns') {
      if (!patternScan) return 'Scanning...'
      const total = patternScan.summary.bullishCount + patternScan.summary.bearishCount
      return total > 0 ? `${total} Setups` : 'No Setups'
    }
    return urgencyLevel === 'high' ? 'ALERT' : urgencyLevel === 'medium' ? 'Active' : 'Quiet'
  }

  return (
    <div className="bg-terminal-panel border border-terminal-border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={togglePanel}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-terminal-bg transition-colors"
        aria-expanded={expanded}
        aria-label={`${activeIntelTab === 'news' ? 'News Intel' : 'Pattern Scanner'} panel, ${expanded ? 'collapse' : 'expand'}`}
      >
        <div className="flex items-center gap-2">
          {activeIntelTab === 'news' ? (
            <Brain size={14} className="text-purple-400" />
          ) : (
            <ScanLine size={14} className="text-cyan-400" />
          )}
          <span className="text-xs font-medium text-white">
            {activeIntelTab === 'news' ? 'News Intel' : 'Pattern Scanner'}
          </span>

          {/* Urgency indicator */}
          {(newsIntel || patternScan) && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${getUrgencyColor()}`}>
              {getUrgencyLabel()}
            </span>
          )}

          {loading && <Loader2 size={12} className="animate-spin text-gray-400" />}
        </div>

        <div className="flex items-center gap-2">
          {isDataStale() && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-900/30 text-yellow-400">
              Cached
            </span>
          )}
          <span className="text-[10px] text-gray-500">{formatLastUpdate()}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Top-level Intel Type Toggle */}
            <div className="border-t border-terminal-border flex" role="tablist" aria-label="Intelligence type">
              <button
                onClick={() => setActiveIntelTab('news')}
                className={`flex-1 text-[10px] py-1.5 flex items-center justify-center gap-1 transition-colors ${
                  activeIntelTab === 'news'
                    ? 'bg-purple-900/30 text-purple-400 border-b border-purple-400'
                    : 'text-gray-400 hover:text-white'
                }`}
                role="tab"
                aria-selected={activeIntelTab === 'news'}
                aria-label={`News Intel${activeAlerts.length > 0 ? `, ${activeAlerts.length} alerts` : ''}`}
              >
                <Brain size={10} aria-hidden="true" />
                News
                {activeAlerts.length > 0 && (
                  <span className="bg-red-500 text-white text-[8px] px-1 rounded-full" aria-hidden="true">
                    {activeAlerts.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveIntelTab('patterns')}
                className={`flex-1 text-[10px] py-1.5 flex items-center justify-center gap-1 transition-colors ${
                  activeIntelTab === 'patterns'
                    ? 'bg-cyan-900/30 text-cyan-400 border-b border-cyan-400'
                    : 'text-gray-400 hover:text-white'
                }`}
                role="tab"
                aria-selected={activeIntelTab === 'patterns'}
                aria-label={`Pattern Scanner${hasPatternAlerts ? ', has alerts' : ''}`}
              >
                <ScanLine size={10} aria-hidden="true" />
                Patterns
                {hasPatternAlerts && (
                  <span className="bg-cyan-500 text-black text-[8px] px-1 rounded-full" aria-hidden="true">!</span>
                )}
              </button>
            </div>

            {/* Breaking Alerts Banner (News only) */}
            {activeIntelTab === 'news' && activeAlerts.length > 0 && (
              <div className="border-t border-terminal-border bg-red-900/20 px-3 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={12} className="text-red-400" />
                  <span className="text-[10px] font-medium text-red-400">
                    {activeAlerts.length} Breaking Alert{activeAlerts.length > 1 ? 's' : ''}
                  </span>
                </div>
                {activeAlerts.slice(0, 2).map(alert => (
                  <BreakingAlertItem
                    key={alert.id}
                    alert={alert}
                    onDismiss={() => dismissAlert(alert.id)}
                  />
                ))}
              </div>
            )}

            {/* High Priority Pattern Alert Banner */}
            {activeIntelTab === 'patterns' && hasPatternAlerts && highReliabilitySetups.length > 0 && (
              <div className="border-t border-terminal-border bg-cyan-900/20 px-3 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <Target size={12} className="text-cyan-400" />
                  <span className="text-[10px] font-medium text-cyan-400">
                    High Reliability Setup{highReliabilitySetups.length > 1 ? 's' : ''} Detected
                  </span>
                </div>
                {highReliabilitySetups.slice(0, 2).map(setup => (
                  <PatternAlertItem key={`${setup.symbol}-${setup.pattern}`} setup={setup} />
                ))}
              </div>
            )}

            {/* Sub-tabs */}
            {activeIntelTab === 'news' ? (
              <div className="border-t border-terminal-border flex">
                {(['overview', 'symbols', 'alerts'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setNewsSubTab(tab)}
                    className={`flex-1 text-[10px] py-1.5 transition-colors ${
                      newsSubTab === tab
                        ? 'bg-terminal-bg text-white border-b border-terminal-amber'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab === 'overview' ? 'Overview' : tab === 'symbols' ? 'By Symbol' : 'Alerts'}
                  </button>
                ))}
              </div>
            ) : (
              <div className="border-t border-terminal-border flex">
                {(['overview', 'bullish', 'bearish'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setPatternSubTab(tab)}
                    className={`flex-1 text-[10px] py-1.5 transition-colors ${
                      patternSubTab === tab
                        ? 'bg-terminal-bg text-white border-b border-terminal-amber'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab === 'overview' ? 'Overview' : tab === 'bullish' ? 'Bullish' : 'Bearish'}
                  </button>
                ))}
              </div>
            )}

            {/* Tab Content */}
            <div className="p-3 border-t border-terminal-border">
              {activeIntelTab === 'news' ? (
                !newsIntel ? (
                  <div className="text-center text-gray-500 text-xs py-4">
                    No intel yet. Analyzing news...
                  </div>
                ) : newsSubTab === 'overview' ? (
                  <NewsOverviewTab newsIntel={newsIntel} sentimentRatio={sentimentRatio} />
                ) : newsSubTab === 'symbols' ? (
                  <SymbolsTab newsIntel={newsIntel} />
                ) : (
                  <AlertsTab newsIntel={newsIntel} />
                )
              ) : (
                !patternScan ? (
                  <div className="text-center text-gray-500 text-xs py-4">
                    Scanning for patterns...
                  </div>
                ) : patternSubTab === 'overview' ? (
                  <PatternOverviewTab report={patternScan} />
                ) : patternSubTab === 'bullish' ? (
                  <PatternSetupsTab setups={topBullishSetups} type="bullish" />
                ) : (
                  <PatternSetupsTab setups={topBearishSetups} type="bearish" />
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Breaking Alert Item
function BreakingAlertItem({
  alert,
  onDismiss
}: {
  alert: NewsAlert
  onDismiss: () => void
}) {
  return (
    <div className="flex items-start gap-2 text-[10px] mb-1 last:mb-0">
      <Zap size={10} className="text-yellow-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-white truncate">{alert.headline}</p>
        <div className="flex items-center gap-2 text-gray-500">
          <span>{alert.source}</span>
          {alert.symbol && <span className="text-terminal-amber">${alert.symbol}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {alert.url && (
          <a
            href={alert.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 hover:bg-terminal-border rounded"
          >
            <ExternalLink size={10} className="text-gray-400" />
          </a>
        )}
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-terminal-border rounded"
        >
          <X size={10} className="text-gray-400" />
        </button>
      </div>
    </div>
  )
}

// Pattern Alert Item
function PatternAlertItem({ setup }: { setup: PatternSetup }) {
  return (
    <div className="flex items-center gap-2 text-[10px] mb-1 last:mb-0 bg-terminal-bg/50 rounded px-2 py-1">
      <span className="text-terminal-amber font-mono font-medium">${setup.symbol}</span>
      <span className={`${setup.type === 'bullish' ? 'text-green-400' : 'text-red-400'}`}>
        {setup.pattern}
      </span>
      <div className="flex items-center gap-1 ml-auto">
        {setup.volumeConfirmed && (
          <span className="text-[8px] bg-blue-900/30 text-blue-400 px-1 rounded">VOL</span>
        )}
        {setup.regimeAligned && (
          <span className="text-[8px] bg-purple-900/30 text-purple-400 px-1 rounded">ALIGNED</span>
        )}
      </div>
    </div>
  )
}

// News Overview Tab
function NewsOverviewTab({
  newsIntel,
  sentimentRatio
}: {
  newsIntel: NonNullable<ReturnType<typeof useIntelStore.getState>['newsIntel']>
  sentimentRatio: { bullish: number; bearish: number; neutral: number } | null
}) {
  return (
    <div className="space-y-3">
      {/* Sentiment Gauge */}
      <div>
        <div className="text-[10px] text-gray-400 mb-1">Market Sentiment</div>
        {sentimentRatio && (
          <div className="space-y-1">
            <div className="flex h-2 rounded-full overflow-hidden bg-terminal-bg">
              <div
                className="bg-green-500 transition-all"
                style={{ width: `${sentimentRatio.bullish}%` }}
              />
              <div
                className="bg-gray-500 transition-all"
                style={{ width: `${sentimentRatio.neutral}%` }}
              />
              <div
                className="bg-red-500 transition-all"
                style={{ width: `${sentimentRatio.bearish}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-green-400">{sentimentRatio.bullish}% Bull</span>
              <span className="text-gray-400">{sentimentRatio.neutral}% Neutral</span>
              <span className="text-red-400">{sentimentRatio.bearish}% Bear</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-terminal-bg rounded p-2 text-center">
          <div className="text-lg font-mono text-white">{newsIntel.totalAnalyzed}</div>
          <div className="text-[9px] text-gray-400">Articles</div>
        </div>
        <div className="bg-terminal-bg rounded p-2 text-center">
          <div className="text-lg font-mono text-yellow-400">{newsIntel.breakingAlerts.length}</div>
          <div className="text-[9px] text-gray-400">Breaking</div>
        </div>
        <div className="bg-terminal-bg rounded p-2 text-center">
          <div className="text-lg font-mono text-purple-400">{newsIntel.velocitySpikes.length}</div>
          <div className="text-[9px] text-gray-400">Spikes</div>
        </div>
      </div>

      {/* Top Movers */}
      {(newsIntel.topBullish.length > 0 || newsIntel.topBearish.length > 0) && (
        <div className="grid grid-cols-2 gap-2">
          {newsIntel.topBullish.length > 0 && (
            <div className="bg-green-900/20 rounded p-2">
              <div className="flex items-center gap-1 text-[10px] text-green-400 mb-1">
                <TrendingUp size={10} />
                Top Bullish
              </div>
              <div className="text-xs text-white font-mono">
                {newsIntel.topBullish.slice(0, 3).join(', ')}
              </div>
            </div>
          )}
          {newsIntel.topBearish.length > 0 && (
            <div className="bg-red-900/20 rounded p-2">
              <div className="flex items-center gap-1 text-[10px] text-red-400 mb-1">
                <TrendingDown size={10} />
                Top Bearish
              </div>
              <div className="text-xs text-white font-mono">
                {newsIntel.topBearish.slice(0, 3).join(', ')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Velocity Spikes */}
      {newsIntel.velocitySpikes.length > 0 && (
        <div>
          <div className="text-[10px] text-gray-400 mb-1">News Velocity Spikes</div>
          {newsIntel.velocitySpikes.map(spike => (
            <div
              key={spike.symbol}
              className="flex items-center justify-between text-[10px] py-1"
            >
              <span className="text-terminal-amber font-mono">${spike.symbol}</span>
              <span className="text-white">
                {spike.articleCount} articles
                <span className="text-purple-400 ml-1">(+{spike.percentAboveNormal}%)</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Symbols Tab
function SymbolsTab({
  newsIntel
}: {
  newsIntel: NonNullable<ReturnType<typeof useIntelStore.getState>['newsIntel']>
}) {
  const symbols = Object.entries(newsIntel.symbolSentiment)
    .filter(([_, data]) => data.bullishCount + data.bearishCount + data.neutralCount > 0)
    .sort((a, b) => {
      const totalA = a[1].bullishCount + a[1].bearishCount + a[1].neutralCount
      const totalB = b[1].bullishCount + b[1].bearishCount + b[1].neutralCount
      return totalB - totalA
    })

  if (symbols.length === 0) {
    return (
      <div className="text-center text-gray-500 text-xs py-4">
        No symbol-specific news found
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {symbols.map(([symbol, data]) => (
        <div key={symbol} className="bg-terminal-bg rounded p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-terminal-amber font-mono text-xs">${symbol}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
              data.sentiment === 'bullish' ? 'bg-green-900/30 text-green-400' :
              data.sentiment === 'bearish' ? 'bg-red-900/30 text-red-400' :
              data.sentiment === 'mixed' ? 'bg-yellow-900/30 text-yellow-400' :
              'bg-gray-900/30 text-gray-400'
            }`}>
              {data.sentiment}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-green-400">{data.bullishCount} bull</span>
            <span className="text-gray-400">{data.neutralCount} neutral</span>
            <span className="text-red-400">{data.bearishCount} bear</span>
          </div>
          {data.headlines.length > 0 && (
            <div className="mt-1 text-[9px] text-gray-500 truncate">
              "{data.headlines[0]}"
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// Alerts Tab
function AlertsTab({
  newsIntel
}: {
  newsIntel: NonNullable<ReturnType<typeof useIntelStore.getState>['newsIntel']>
}) {
  const allAlerts = newsIntel.breakingAlerts

  if (allAlerts.length === 0) {
    return (
      <div className="text-center text-gray-500 text-xs py-4">
        No breaking alerts in the last hour
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {allAlerts.map(alert => (
        <div key={alert.id} className="bg-terminal-bg rounded p-2">
          <div className="flex items-start gap-2">
            <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
              alert.sentiment === 'positive' ? 'bg-green-400' :
              alert.sentiment === 'negative' ? 'bg-red-400' :
              'bg-gray-400'
            }`} />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-white">{alert.headline}</p>
              <div className="flex items-center gap-2 mt-1 text-[9px] text-gray-500">
                <span>{alert.source}</span>
                {alert.symbol && <span className="text-terminal-amber">${alert.symbol}</span>}
                <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
              </div>
              {alert.impactKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {alert.impactKeywords.slice(0, 3).map(kw => (
                    <span
                      key={kw}
                      className="text-[8px] bg-purple-900/30 text-purple-400 px-1 rounded"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {alert.url && (
              <a
                href={alert.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 hover:bg-terminal-border rounded flex-shrink-0"
              >
                <ExternalLink size={12} className="text-gray-400" />
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// Pattern Overview Tab
function PatternOverviewTab({ report }: { report: PatternScanReport }) {
  const { summary, topBullishSetups, topBearishSetups, scannedSymbols, failedSymbols } = report

  return (
    <div className="space-y-3">
      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-terminal-bg rounded p-2 text-center">
          <div className="text-lg font-mono text-white">{scannedSymbols}</div>
          <div className="text-[9px] text-gray-400">Scanned</div>
        </div>
        <div className="bg-terminal-bg rounded p-2 text-center">
          <div className="text-lg font-mono text-green-400">{summary.bullishCount}</div>
          <div className="text-[9px] text-gray-400">Bullish</div>
        </div>
        <div className="bg-terminal-bg rounded p-2 text-center">
          <div className="text-lg font-mono text-red-400">{summary.bearishCount}</div>
          <div className="text-[9px] text-gray-400">Bearish</div>
        </div>
        <div className="bg-terminal-bg rounded p-2 text-center">
          <div className="text-lg font-mono text-yellow-400">{summary.highReliabilityCount}</div>
          <div className="text-[9px] text-gray-400">High Rel</div>
        </div>
      </div>

      {/* Top Setups Preview */}
      <div className="grid grid-cols-2 gap-2">
        {topBullishSetups.length > 0 && (
          <div className="bg-green-900/20 rounded p-2">
            <div className="flex items-center gap-1 text-[10px] text-green-400 mb-2">
              <TrendingUp size={10} />
              Top Bullish
            </div>
            {topBullishSetups.slice(0, 2).map(setup => (
              <SetupPreviewItem key={`${setup.symbol}-${setup.pattern}`} setup={setup} />
            ))}
          </div>
        )}
        {topBearishSetups.length > 0 && (
          <div className="bg-red-900/20 rounded p-2">
            <div className="flex items-center gap-1 text-[10px] text-red-400 mb-2">
              <TrendingDown size={10} />
              Top Bearish
            </div>
            {topBearishSetups.slice(0, 2).map(setup => (
              <SetupPreviewItem key={`${setup.symbol}-${setup.pattern}`} setup={setup} />
            ))}
          </div>
        )}
      </div>

      {/* No setups message */}
      {summary.bullishCount === 0 && summary.bearishCount === 0 && (
        <div className="text-center text-gray-500 text-xs py-2">
          No significant patterns detected
        </div>
      )}

      {/* Failed symbols warning */}
      {failedSymbols.length > 0 && (
        <div className="text-[9px] text-gray-500 text-center">
          Could not scan: {failedSymbols.join(', ')}
        </div>
      )}
    </div>
  )
}

// Setup Preview Item
function SetupPreviewItem({ setup }: { setup: PatternSetup }) {
  return (
    <div className="flex items-center justify-between text-[10px] py-0.5">
      <div className="flex items-center gap-1">
        <span className="text-terminal-amber font-mono">${setup.symbol}</span>
        <span className="text-gray-300">{setup.pattern}</span>
      </div>
      <div className="flex items-center gap-1">
        {setup.regimeAligned && <CheckCircle2 size={8} className="text-green-400" />}
        <span className={`text-[8px] px-1 rounded ${
          setup.reliability === 'High' ? 'bg-yellow-900/30 text-yellow-400' :
          setup.reliability === 'Medium' ? 'bg-blue-900/30 text-blue-400' :
          'bg-gray-900/30 text-gray-400'
        }`}>
          {setup.reliabilityScore}%
        </span>
      </div>
    </div>
  )
}

// Pattern Setups Tab
function PatternSetupsTab({
  setups,
  type
}: {
  setups: PatternSetup[]
  type: 'bullish' | 'bearish'
}) {
  if (setups.length === 0) {
    return (
      <div className="text-center text-gray-500 text-xs py-4">
        No {type} setups found
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {setups.map(setup => (
        <div
          key={`${setup.symbol}-${setup.pattern}-${setup.detectedAt}`}
          className="bg-terminal-bg rounded p-2"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="text-terminal-amber font-mono text-xs">${setup.symbol}</span>
              <span className={`text-xs ${type === 'bullish' ? 'text-green-400' : 'text-red-400'}`}>
                {setup.pattern}
              </span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
              setup.reliability === 'High' ? 'bg-yellow-900/30 text-yellow-400' :
              setup.reliability === 'Medium' ? 'bg-blue-900/30 text-blue-400' :
              'bg-gray-900/30 text-gray-400'
            }`}>
              {setup.reliability} ({setup.reliabilityScore}%)
            </span>
          </div>

          {/* Indicators */}
          <div className="flex items-center gap-2 mb-1">
            <div className="flex items-center gap-1 text-[9px]">
              {setup.volumeConfirmed ? (
                <><CheckCircle2 size={8} className="text-blue-400" /> <span className="text-blue-400">Vol</span></>
              ) : (
                <><XCircle size={8} className="text-gray-500" /> <span className="text-gray-500">Vol</span></>
              )}
            </div>
            <div className="flex items-center gap-1 text-[9px]">
              {setup.regimeAligned ? (
                <><CheckCircle2 size={8} className="text-purple-400" /> <span className="text-purple-400">Regime</span></>
              ) : (
                <><XCircle size={8} className="text-gray-500" /> <span className="text-gray-500">Regime</span></>
              )}
            </div>
            <span className={`text-[9px] px-1 rounded ${
              setup.trendContext === 'with_trend' ? 'bg-green-900/30 text-green-400' :
              setup.trendContext === 'against_trend' ? 'bg-red-900/30 text-red-400' :
              'bg-gray-900/30 text-gray-400'
            }`}>
              {setup.trendContext === 'with_trend' ? 'With Trend' :
               setup.trendContext === 'against_trend' ? 'Counter-Trend' : 'Neutral'}
            </span>
          </div>

          {/* Price and notes */}
          <div className="text-[9px] text-gray-500">
            <span>@ ${setup.priceAtDetection.toFixed(2)}</span>
            {setup.notes && (
              <span className="ml-2 text-gray-400">{setup.notes.split('.')[0]}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
