import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'
import { getAIPerformanceStats, db } from '../../lib/db'
import type { TradeDecision } from '../../lib/db'

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

  if (!stats) return <div className="text-white">Loading...</div>

  const paginatedTrades = trades.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE)
  const totalPages = Math.ceil(trades.length / ROWS_PER_PAGE)

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
