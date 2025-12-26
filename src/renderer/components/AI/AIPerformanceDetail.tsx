import { useState, useEffect, useMemo } from 'react'
import { Download, Lightbulb, TrendingUp, Target, Trophy } from 'lucide-react'
import { getAIPerformanceStats, db } from '../../lib/db'
import type { TradeDecision } from '../../lib/db'

// Generate insights from trade data
interface Insights {
  strengths: string[]
  opportunities: string[]
  highlight: string | null
}

function generateInsights(trades: TradeDecision[], stats: any): Insights {
  const insights: Insights = {
    strengths: [],
    opportunities: [],
    highlight: null
  }

  if (trades.length < 3) {
    return insights // Not enough data
  }

  // 1. Find best performing symbols (2+ trades with outcomes)
  const symbolStats: Record<string, { wins: number; losses: number; total: number; avgReturn: number }> = {}
  trades.forEach(t => {
    if (!symbolStats[t.symbol]) {
      symbolStats[t.symbol] = { wins: 0, losses: 0, total: 0, avgReturn: 0 }
    }
    if (t.outcome === 'win') symbolStats[t.symbol].wins++
    if (t.outcome === 'loss') symbolStats[t.symbol].losses++
    if (t.outcome === 'win' || t.outcome === 'loss') {
      symbolStats[t.symbol].total++
      symbolStats[t.symbol].avgReturn += t.profitLoss || 0
    }
  })

  // Calculate averages
  Object.values(symbolStats).forEach(s => {
    if (s.total > 0) s.avgReturn = s.avgReturn / s.total
  })

  const topSymbols = Object.entries(symbolStats)
    .filter(([_, s]) => s.total >= 2 && s.wins > s.losses)
    .sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total))
    .slice(0, 3)

  if (topSymbols.length > 0) {
    const symbols = topSymbols.map(([sym]) => sym).join(', ')
    const best = topSymbols[0]
    insights.strengths.push(
      `Strong on ${symbols} – ${best[1].wins}/${best[1].total} wins on ${best[0]}`
    )
  }

  // 2. BUY vs SELL analysis
  const completedTrades = trades.filter(t => t.outcome === 'win' || t.outcome === 'loss')
  const buyTrades = completedTrades.filter(t => t.action === 'BUY')
  const sellTrades = completedTrades.filter(t => t.action === 'SELL')

  if (buyTrades.length >= 2) {
    const buyWinRate = buyTrades.filter(t => t.outcome === 'win').length / buyTrades.length
    if (buyWinRate >= 0.6) {
      insights.strengths.push(`BUY signals working well (${Math.round(buyWinRate * 100)}% win rate)`)
    } else if (buyWinRate < 0.4) {
      insights.opportunities.push(`BUY signals underperforming (${Math.round(buyWinRate * 100)}% win rate)`)
    }
  }

  if (sellTrades.length >= 2) {
    const sellWinRate = sellTrades.filter(t => t.outcome === 'win').length / sellTrades.length
    if (sellWinRate >= 0.6) {
      insights.strengths.push(`SELL signals on point (${Math.round(sellWinRate * 100)}% win rate)`)
    } else if (sellWinRate < 0.4) {
      insights.opportunities.push(`SELL signals need work (${Math.round(sellWinRate * 100)}% win rate)`)
    }
  }

  // 3. Holding period analysis
  const tradesWithDays = completedTrades.filter(t => t.daysHeld && t.daysHeld > 0)
  if (tradesWithDays.length >= 3) {
    const avgDaysHeld = tradesWithDays.reduce((sum, t) => sum + (t.daysHeld || 0), 0) / tradesWithDays.length
    if (avgDaysHeld > 10) {
      insights.opportunities.push(`Consider shorter holds – avg ${avgDaysHeld.toFixed(0)} days may be too long`)
    } else if (avgDaysHeld <= 3 && stats.winRate < 50) {
      insights.opportunities.push(`Trades closing too fast (${avgDaysHeld.toFixed(0)} days avg) – give them more time`)
    }
  }

  // 4. Confidence correlation
  const highConfTrades = completedTrades.filter(t => t.confidence >= 75)
  const lowConfTrades = completedTrades.filter(t => t.confidence < 60)
  if (highConfTrades.length >= 3) {
    const highConfWinRate = highConfTrades.filter(t => t.outcome === 'win').length / highConfTrades.length
    if (highConfWinRate >= 0.7) {
      insights.strengths.push(`High confidence trades (75%+) hitting ${Math.round(highConfWinRate * 100)}%`)
    }
  }
  if (lowConfTrades.length >= 3) {
    const lowConfWinRate = lowConfTrades.filter(t => t.outcome === 'win').length / lowConfTrades.length
    if (lowConfWinRate < 0.4) {
      insights.opportunities.push(`Low confidence trades (<60%) dragging you down – consider skipping`)
    }
  }

  // 5. Best recent trade (highlight)
  const recentWins = trades
    .filter(t => t.outcome === 'win' && t.profitLoss && t.profitLoss > 0)
    .sort((a, b) => (b.profitLoss || 0) - (a.profitLoss || 0))

  if (recentWins.length > 0) {
    const best = recentWins[0]
    const date = new Date(best.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    insights.highlight = `${best.symbol} on ${date} → +${best.profitLoss?.toFixed(1)}%${best.daysHeld ? ` in ${best.daysHeld}d` : ''}`
  }

  // Fallback messages if no specific insights
  if (insights.strengths.length === 0 && stats.winRate >= 50) {
    insights.strengths.push(`Solid ${stats.winRate.toFixed(0)}% win rate – keep it up!`)
  }
  if (insights.opportunities.length === 0 && trades.length < 10) {
    insights.opportunities.push(`More trades needed for deeper insights`)
  }

  return insights
}

export function AIPerformanceDetail() {
  const [stats, setStats] = useState<any>(null)
  const [trades, setTrades] = useState<TradeDecision[]>([])
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    symbol: '',
    outcome: 'all' as 'all' | 'win' | 'loss' | 'pending' | 'neutral'
  })
  const [page, setPage] = useState(0)
  const ROWS_PER_PAGE = 10

  useEffect(() => {
    loadData()
  }, [filters])

  const loadData = async () => {
    const perfStats = await getAIPerformanceStats(365) // Last year
    setStats(perfStats)

    let query = db.tradeDecisions.where('decision').equals('execute')

    if (filters.symbol) {
      query = query.and(t => t.symbol === filters.symbol.toUpperCase())
    }
    if (filters.outcome !== 'all') {
      query = query.and(t => t.outcome === filters.outcome)
    }

    const results = await query.reverse().sortBy('timestamp')
    setTrades(results)
  }

  const exportCSV = () => {
    const headers = ['Date', 'Symbol', 'Executor', 'Action', 'Confidence', 'Entry', 'Exit', 'P/L %', 'Days Held', 'Outcome']
    const rows = trades.map(t => [
      new Date(t.timestamp).toISOString().split('T')[0],
      t.symbol,
      t.source === 'manual' ? 'You' : 'AI Copilot',
      t.action,
      `${t.confidence}%`,
      `$${t.priceAtDecision?.toFixed(2) ?? 'N/A'}`,
      `$${t.priceAtOutcome?.toFixed(2) ?? 'N/A'}`,
      t.profitLoss ? `${t.profitLoss.toFixed(2)}%` : 'N/A',
      t.daysHeld ?? 'N/A',
      t.outcome ?? 'pending'
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai_performance_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  // Generate insights from trade data
  const insights = useMemo(() => {
    if (!stats || trades.length === 0) return null
    return generateInsights(trades, stats)
  }, [trades, stats])

  if (!stats) return <div className="text-white">Loading...</div>

  const paginatedTrades = trades.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE)
  const totalPages = Math.ceil(trades.length / ROWS_PER_PAGE)
  const hasInsights = insights && (insights.strengths.length > 0 || insights.opportunities.length > 0 || insights.highlight)

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
          <div className="text-gray-400 text-xs">Batting Avg</div>
          <div className="text-terminal-amber text-2xl font-bold font-mono">
            {(stats.winRate / 100).toFixed(3)}
          </div>
        </div>
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
          <div className="text-gray-400 text-xs">Record</div>
          <div className="text-white text-xl font-mono">
            {stats.wins}-{stats.losses}-{stats.pending}
          </div>
        </div>
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
          <div className="text-gray-400 text-xs">Avg Return</div>
          <div className={`text-xl font-mono ${stats.avgProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {stats.avgProfitLoss >= 0 ? '+' : ''}{stats.avgProfitLoss.toFixed(2)}%
          </div>
        </div>
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
          <div className="text-gray-400 text-xs">Total Trades</div>
          <div className="text-white text-xl font-mono">
            {stats.wins + stats.losses + stats.pending}
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      {hasInsights && (
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb size={16} className="text-terminal-amber" />
            <span className="text-white font-medium">Performance Insights</span>
          </div>

          <div className="space-y-4">
            {/* Strengths */}
            {insights.strengths.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={14} className="text-green-400" />
                  <span className="text-green-400 text-sm font-medium">Strengths</span>
                </div>
                <ul className="space-y-1.5 ml-6">
                  {insights.strengths.map((s, i) => (
                    <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                      <span className="text-green-400 mt-1">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Opportunities */}
            {insights.opportunities.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Target size={14} className="text-yellow-400" />
                  <span className="text-yellow-400 text-sm font-medium">Opportunities</span>
                </div>
                <ul className="space-y-1.5 ml-6">
                  {insights.opportunities.map((o, i) => (
                    <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                      <span className="text-yellow-400 mt-1">•</span>
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Best Trade Highlight */}
            {insights.highlight && (
              <div className="mt-3 pt-3 border-t border-terminal-border">
                <div className="flex items-center gap-2">
                  <Trophy size={14} className="text-terminal-amber" />
                  <span className="text-gray-400 text-sm">Best trade:</span>
                  <span className="text-terminal-amber text-sm font-medium">{insights.highlight}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-4 gap-4">
        <input
          type="text"
          placeholder="Symbol (e.g., SPY)"
          value={filters.symbol}
          onChange={(e) => setFilters({ ...filters, symbol: e.target.value })}
          className="bg-terminal-bg border border-terminal-border text-white px-3 py-2 rounded text-sm"
        />
        <select
          value={filters.outcome}
          onChange={(e) => setFilters({ ...filters, outcome: e.target.value as any })}
          className="bg-terminal-bg border border-terminal-border text-white px-3 py-2 rounded text-sm"
        >
          <option value="all">All Outcomes</option>
          <option value="win">Wins Only</option>
          <option value="loss">Losses Only</option>
          <option value="pending">Pending Only</option>
          <option value="neutral">Neutral Only</option>
        </select>
        <div /> {/* Spacer */}
        <button
          onClick={exportCSV}
          className="flex items-center justify-center gap-2 bg-terminal-amber text-terminal-bg px-4 py-2 rounded text-sm font-medium hover:bg-yellow-500 transition-colors"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      {/* Trade History Table */}
      <div className="bg-terminal-panel border border-terminal-border rounded-lg overflow-x-auto
        [&::-webkit-scrollbar]:h-2
        [&::-webkit-scrollbar-track]:bg-terminal-bg
        [&::-webkit-scrollbar-thumb]:bg-terminal-border
        [&::-webkit-scrollbar-thumb]:rounded-full
        [&::-webkit-scrollbar-thumb]:hover:bg-gray-600">
        <table className="w-full text-sm min-w-max">
          <thead className="bg-terminal-bg border-b border-terminal-border">
            <tr>
              <th className="text-left text-gray-400 px-4 py-3">Date</th>
              <th className="text-left text-gray-400 px-4 py-3">Symbol</th>
              <th className="text-left text-gray-400 px-4 py-3">Executor</th>
              <th className="text-left text-gray-400 px-4 py-3">Action</th>
              <th className="text-right text-gray-400 px-4 py-3">Confidence</th>
              <th className="text-right text-gray-400 px-4 py-3">Entry</th>
              <th className="text-right text-gray-400 px-4 py-3">Exit</th>
              <th className="text-right text-gray-400 px-4 py-3">P/L %</th>
              <th className="text-right text-gray-400 px-4 py-3">Days</th>
              <th className="text-center text-gray-400 px-4 py-3">Outcome</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTrades.map((trade) => (
              <tr key={trade.id} className="border-b border-terminal-border hover:bg-terminal-bg">
                <td className="text-white px-4 py-3">
                  {new Date(trade.timestamp).toLocaleDateString()}
                </td>
                <td className="text-white px-4 py-3 font-mono">{trade.symbol}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs ${
                    trade.source === 'manual'
                      ? 'bg-blue-900/30 text-blue-400'
                      : 'bg-purple-900/30 text-purple-400'
                  }`}>
                    {trade.source === 'manual' ? 'You' : 'AI Copilot'}
                  </span>
                </td>
                <td className={`px-4 py-3 ${
                  trade.action === 'BUY' ? 'text-green-400' :
                  trade.action === 'SELL' ? 'text-red-400' : 'text-yellow-400'
                }`}>
                  {trade.action}
                </td>
                <td className="text-white text-right px-4 py-3">{trade.confidence}%</td>
                <td className="text-white text-right px-4 py-3 font-mono">
                  ${trade.priceAtDecision?.toFixed(2) ?? 'N/A'}
                </td>
                <td className="text-white text-right px-4 py-3 font-mono">
                  ${trade.priceAtOutcome?.toFixed(2) ?? 'N/A'}
                </td>
                <td className={`text-right px-4 py-3 font-mono ${
                  (trade.profitLoss ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {trade.profitLoss ? `${trade.profitLoss >= 0 ? '+' : ''}${trade.profitLoss.toFixed(2)}%` : 'N/A'}
                </td>
                <td className="text-white text-right px-4 py-3">{trade.daysHeld ?? '-'}</td>
                <td className="text-center px-4 py-3">
                  <span className={`inline-block px-2 py-1 rounded text-xs ${
                    trade.outcome === 'win' ? 'bg-green-900/30 text-green-400' :
                    trade.outcome === 'loss' ? 'bg-red-900/30 text-red-400' :
                    trade.outcome === 'pending' ? 'bg-yellow-900/30 text-yellow-400' :
                    'bg-gray-900/30 text-gray-400'
                  }`}>
                    {trade.outcome ?? 'pending'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-gray-400 text-sm">
          Showing {page * ROWS_PER_PAGE + 1}-{Math.min((page + 1) * ROWS_PER_PAGE, trades.length)} of {trades.length}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-3 py-1 bg-terminal-bg border border-terminal-border text-white rounded text-sm disabled:opacity-30"
          >
            Previous
          </button>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1 bg-terminal-bg border border-terminal-border text-white rounded text-sm disabled:opacity-30"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
