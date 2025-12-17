import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Trophy, User, Bot } from 'lucide-react'
import { getPerformanceStatsBySource } from '../../lib/db'

interface SourceStats {
  source: 'manual' | 'ai'
  totalTrades: number
  completed: number
  pending: number
  wins: number
  losses: number
  neutral: number
  winRate: number
  avgProfitLoss: number
  totalInvested: number
  totalShares: number
}

export function AIPerformance() {
  const [humanStats, setHumanStats] = useState<SourceStats | null>(null)
  const [aiStats, setAiStats] = useState<SourceStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()

    // Refresh stats every 5 minutes
    const interval = setInterval(loadStats, 300000)
    return () => clearInterval(interval)
  }, [])

  async function loadStats() {
    try {
      const [human, ai] = await Promise.all([
        getPerformanceStatsBySource('manual', 30),
        getPerformanceStatsBySource('ai', 30)
      ])
      setHumanStats(human)
      setAiStats(ai)
    } catch (error) {
      console.error('Failed to load performance stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="panel h-full">
        <div className="panel-header">
          <Trophy size={14} />
          <span>Performance</span>
        </div>
        <div className="p-4 text-center">
          <p className="text-gray-400 text-sm">Loading stats...</p>
        </div>
      </div>
    )
  }

  const hasHumanTrades = humanStats && humanStats.completed > 0
  const hasAiTrades = aiStats && aiStats.completed > 0

  // No trades at all
  if (!hasHumanTrades && !hasAiTrades) {
    return (
      <div className="panel h-full">
        <div className="panel-header">
          <Trophy size={14} />
          <span>Performance (30d)</span>
        </div>
        <div className="p-4 text-center">
          <p className="text-gray-400 text-sm">No completed trades yet</p>
          <p className="text-gray-500 text-xs mt-1">
            Use Buy/Sell buttons or AI recommendations to start tracking
          </p>
        </div>
      </div>
    )
  }

  // Calculate who's winning
  const humanBatting = humanStats ? humanStats.winRate / 100 : 0
  const aiBatting = aiStats ? aiStats.winRate / 100 : 0
  const humanLeads = humanBatting > aiBatting
  const difference = Math.abs(humanBatting - aiBatting)
  const differencePercent = (difference * 100).toFixed(1)

  // Generate insight message
  let insight = ''
  if (hasHumanTrades && hasAiTrades) {
    if (difference < 0.01) {
      insight = "Neck and neck! You and AI are evenly matched."
    } else if (humanLeads) {
      insight = `You're beating the AI! +${differencePercent}% ahead`
    } else {
      insight = `AI is ahead by ${differencePercent}%. Time to level up!`
    }
  } else if (hasHumanTrades) {
    insight = "Start using AI recommendations to compare performance"
  } else {
    insight = "Try manual trades to see how you stack up against AI"
  }

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <Trophy size={14} />
        <span>Performance (30d)</span>
      </div>

      <div className="flex-1 p-3 space-y-3 overflow-y-auto">
        {/* Side-by-side comparison header */}
        <div className="grid grid-cols-2 gap-3">
          {/* Human Column */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <User size={12} className="text-blue-400" />
              <span className="text-xs text-gray-400">You</span>
            </div>
          </div>

          {/* AI Column */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Bot size={12} className="text-terminal-amber" />
              <span className="text-xs text-gray-400">AI Copilot</span>
            </div>
          </div>
        </div>

        {/* Batting Average Comparison */}
        <div className="grid grid-cols-2 gap-3">
          {/* Human Batting */}
          <div className={`bg-terminal-bg border rounded-lg p-3 text-center ${
            hasHumanTrades && hasAiTrades && humanLeads
              ? 'border-blue-500/50'
              : 'border-terminal-border'
          }`}>
            <p className={`text-2xl font-bold font-mono ${
              hasHumanTrades ? 'text-blue-400' : 'text-gray-600'
            }`}>
              {hasHumanTrades ? humanBatting.toFixed(3) : '---'}
            </p>
            {hasHumanTrades && (
              <p className="text-gray-500 text-xs mt-1">
                {humanStats.wins}-{humanStats.losses}
                {humanStats.pending > 0 && `-${humanStats.pending}`}
              </p>
            )}
          </div>

          {/* AI Batting */}
          <div className={`bg-terminal-bg border rounded-lg p-3 text-center ${
            hasHumanTrades && hasAiTrades && !humanLeads && difference > 0.01
              ? 'border-terminal-amber/50'
              : 'border-terminal-border'
          }`}>
            <p className={`text-2xl font-bold font-mono ${
              hasAiTrades ? 'text-terminal-amber' : 'text-gray-600'
            }`}>
              {hasAiTrades ? aiBatting.toFixed(3) : '---'}
            </p>
            {hasAiTrades && (
              <p className="text-gray-500 text-xs mt-1">
                {aiStats.wins}-{aiStats.losses}
                {aiStats.pending > 0 && `-${aiStats.pending}`}
              </p>
            )}
          </div>
        </div>

        {/* Average Return Comparison */}
        <div className="grid grid-cols-2 gap-3">
          {/* Human Avg Return */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-2">
            <p className="text-gray-500 text-xs text-center mb-1">Avg Return</p>
            <div className="flex items-center justify-center gap-1">
              {hasHumanTrades ? (
                <>
                  {humanStats.avgProfitLoss >= 0 ? (
                    <TrendingUp size={12} className="text-semantic-up" />
                  ) : (
                    <TrendingDown size={12} className="text-semantic-down" />
                  )}
                  <span className={`text-sm font-bold ${
                    humanStats.avgProfitLoss >= 0 ? 'text-semantic-up' : 'text-semantic-down'
                  }`}>
                    {humanStats.avgProfitLoss >= 0 ? '+' : ''}
                    {humanStats.avgProfitLoss.toFixed(1)}%
                  </span>
                </>
              ) : (
                <span className="text-gray-600 text-sm">---</span>
              )}
            </div>
          </div>

          {/* AI Avg Return */}
          <div className="bg-terminal-bg border border-terminal-border rounded-lg p-2">
            <p className="text-gray-500 text-xs text-center mb-1">Avg Return</p>
            <div className="flex items-center justify-center gap-1">
              {hasAiTrades ? (
                <>
                  {aiStats.avgProfitLoss >= 0 ? (
                    <TrendingUp size={12} className="text-semantic-up" />
                  ) : (
                    <TrendingDown size={12} className="text-semantic-down" />
                  )}
                  <span className={`text-sm font-bold ${
                    aiStats.avgProfitLoss >= 0 ? 'text-semantic-up' : 'text-semantic-down'
                  }`}>
                    {aiStats.avgProfitLoss >= 0 ? '+' : ''}
                    {aiStats.avgProfitLoss.toFixed(1)}%
                  </span>
                </>
              ) : (
                <span className="text-gray-600 text-sm">---</span>
              )}
            </div>
          </div>
        </div>

        {/* Insight Banner */}
        <div className={`rounded-lg p-3 text-center ${
          hasHumanTrades && hasAiTrades && humanLeads
            ? 'bg-blue-500/10 border border-blue-500/30'
            : hasHumanTrades && hasAiTrades
            ? 'bg-terminal-amber/10 border border-terminal-amber/30'
            : 'bg-terminal-bg border border-terminal-border'
        }`}>
          <p className={`text-xs font-medium ${
            hasHumanTrades && hasAiTrades && humanLeads
              ? 'text-blue-400'
              : hasHumanTrades && hasAiTrades
              ? 'text-terminal-amber'
              : 'text-gray-400'
          }`}>
            {insight}
          </p>
        </div>

        {/* Trade Counts */}
        <div className="text-center">
          <p className="text-gray-500 text-xs">
            {hasHumanTrades ? `${humanStats.totalTrades} manual` : '0 manual'}
            {' • '}
            {hasAiTrades ? `${aiStats.totalTrades} AI` : '0 AI'}
          </p>
        </div>
      </div>
    </div>
  )
}
