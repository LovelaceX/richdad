/**
 * Backtest Trade Table Component
 * Displays all trades from a backtest in a sortable table
 */

import { useState } from 'react'
import { ChevronUp, ChevronDown, TrendingUp, TrendingDown, Clock } from 'lucide-react'
import type { BacktestTrade } from '../../types'

interface BacktestTradeTableProps {
  trades: BacktestTrade[]
}

type SortKey = 'entryDate' | 'action' | 'confidence' | 'profitLossPercent' | 'daysHeld' | 'outcome'
type SortDirection = 'asc' | 'desc'

export function BacktestTradeTable({ trades }: BacktestTradeTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('entryDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Sort trades
  const sortedTrades = [...trades].sort((a, b) => {
    let comparison = 0
    switch (sortKey) {
      case 'entryDate':
        comparison = a.entryDate - b.entryDate
        break
      case 'action':
        comparison = a.action.localeCompare(b.action)
        break
      case 'confidence':
        comparison = a.confidence - b.confidence
        break
      case 'profitLossPercent':
        comparison = a.profitLossPercent - b.profitLossPercent
        break
      case 'daysHeld':
        comparison = a.daysHeld - b.daysHeld
        break
      case 'outcome':
        comparison = a.outcome.localeCompare(b.outcome)
        break
    }
    return sortDirection === 'asc' ? comparison : -comparison
  })

  // Handle sort click
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDirection('desc')
    }
  }

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit'
    })
  }

  // Get outcome badge
  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case 'win':
        return <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">WIN</span>
      case 'loss':
        return <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">LOSS</span>
      case 'pending':
        return <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">PENDING</span>
      case 'expired':
        return <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 rounded text-xs">EXPIRED</span>
      default:
        return null
    }
  }

  // Sort indicator
  const SortIndicator = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return null
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3 h-3 inline" />
    ) : (
      <ChevronDown className="w-3 h-3 inline" />
    )
  }

  if (trades.length === 0) {
    return (
      <div className="bg-terminal-panel border border-terminal-border rounded-lg p-8 text-center">
        <p className="text-gray-400">No trades executed during this backtest period.</p>
      </div>
    )
  }

  return (
    <div className="bg-terminal-panel border border-terminal-border rounded-lg overflow-hidden">
      <div className="p-4 border-b border-terminal-border">
        <h3 className="text-sm font-medium text-white">Trade Log ({trades.length} trades)</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-terminal-bg/50">
            <tr className="text-left text-gray-400">
              <th
                className="px-4 py-3 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('entryDate')}
              >
                Date <SortIndicator columnKey="entryDate" />
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('action')}
              >
                Action <SortIndicator columnKey="action" />
              </th>
              <th className="px-4 py-3">Entry</th>
              <th className="px-4 py-3">Exit</th>
              <th
                className="px-4 py-3 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('confidence')}
              >
                Conf <SortIndicator columnKey="confidence" />
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('outcome')}
              >
                Outcome <SortIndicator columnKey="outcome" />
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:text-white transition-colors text-right"
                onClick={() => handleSort('profitLossPercent')}
              >
                P&L <SortIndicator columnKey="profitLossPercent" />
              </th>
              <th
                className="px-4 py-3 cursor-pointer hover:text-white transition-colors text-right"
                onClick={() => handleSort('daysHeld')}
              >
                Days <SortIndicator columnKey="daysHeld" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-terminal-border">
            {sortedTrades.map((trade) => (
              <>
                <tr
                  key={trade.id}
                  className="hover:bg-terminal-border/30 cursor-pointer transition-colors"
                  onClick={() => setExpandedId(expandedId === trade.id ? null : trade.id)}
                >
                  <td className="px-4 py-3 text-gray-300">
                    {formatDate(trade.entryDate)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 ${
                      trade.action === 'BUY' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {trade.action === 'BUY' ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {trade.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white font-mono">
                    ${trade.entryPrice.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-white font-mono">
                    {trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {trade.confidence}%
                  </td>
                  <td className="px-4 py-3">
                    {getOutcomeBadge(trade.outcome)}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${
                    trade.profitLossPercent >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {trade.profitLossPercent >= 0 ? '+' : ''}{trade.profitLossPercent.toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-right text-gray-400">
                    <span className="flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3" />
                      {trade.daysHeld.toFixed(1)}
                    </span>
                  </td>
                </tr>

                {/* Expanded row for rationale */}
                {expandedId === trade.id && (
                  <tr className="bg-terminal-bg/30">
                    <td colSpan={8} className="px-4 py-3">
                      <div className="space-y-2">
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span>Target: ${trade.priceTarget.toFixed(2)}</span>
                          <span>Stop: ${trade.stopLoss.toFixed(2)}</span>
                          <span>P&L: ${trade.profitLossDollar.toFixed(2)}</span>
                        </div>
                        <div className="text-sm text-gray-300">
                          <span className="text-gray-500">Rationale: </span>
                          {trade.rationale}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary footer */}
      <div className="px-4 py-3 bg-terminal-bg/30 border-t border-terminal-border flex items-center justify-between text-xs text-gray-400">
        <span>
          {trades.filter(t => t.outcome === 'win').length} wins,{' '}
          {trades.filter(t => t.outcome === 'loss').length} losses,{' '}
          {trades.filter(t => t.outcome === 'pending' || t.outcome === 'expired').length} other
        </span>
        <span>
          Total P&L: {' '}
          <span className={trades.reduce((sum, t) => sum + t.profitLossDollar, 0) >= 0 ? 'text-green-400' : 'text-red-400'}>
            ${trades.reduce((sum, t) => sum + t.profitLossDollar, 0).toFixed(2)}
          </span>
        </span>
      </div>
    </div>
  )
}
