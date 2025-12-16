import { db, type TradeDecision } from './db'

export async function exportDecisions(
  format: 'txt' | 'csv',
  startDate?: Date,
  endDate?: Date
): Promise<void> {
  // Get decisions with optional date filter
  let decisions = await db.tradeDecisions
    .orderBy('timestamp')
    .reverse()
    .toArray()

  if (startDate) {
    decisions = decisions.filter(d => d.timestamp >= startDate.getTime())
  }
  if (endDate) {
    decisions = decisions.filter(d => d.timestamp <= endDate.getTime())
  }

  const content = format === 'csv'
    ? generateCSV(decisions)
    : generateTXT(decisions)

  const filename = `trading-decisions-${formatDateForFilename(new Date())}.${format}`
  downloadFile(content, filename, format === 'csv' ? 'text/csv' : 'text/plain')
}

function generateCSV(decisions: TradeDecision[]): string {
  const headers = ['Date', 'Time', 'Symbol', 'Action', 'Decision', 'Confidence', 'Price', 'Rationale']
  const rows = decisions.map(d => {
    const date = new Date(d.timestamp)
    return [
      date.toLocaleDateString(),
      date.toLocaleTimeString(),
      d.symbol,
      d.action,
      d.decision,
      `${d.confidence}%`,
      d.priceAtDecision ? `$${d.priceAtDecision.toFixed(2)}` : '',
      `"${d.rationale.replace(/"/g, '""')}"` // Escape quotes in CSV
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}

function generateTXT(decisions: TradeDecision[]): string {
  const header = `
================================================================================
                           TRADING DECISIONS EXPORT
                           richdad.app
                           Generated: ${new Date().toLocaleString()}
================================================================================

Total Decisions: ${decisions.length}
${decisions.filter(d => d.decision === 'execute').length} Executed | ${decisions.filter(d => d.decision === 'skip').length} Skipped

================================================================================
`

  const entries = decisions.map(d => {
    const date = new Date(d.timestamp)
    return `
[${date.toLocaleDateString()} ${date.toLocaleTimeString()}]
Symbol: ${d.symbol}
Action: ${d.action}
Decision: ${d.decision.toUpperCase()}
Confidence: ${d.confidence}%
${d.priceAtDecision ? `Price: $${d.priceAtDecision.toFixed(2)}` : ''}
Rationale: ${d.rationale}
--------------------------------------------------------------------------------`
  })

  return header + entries.join('\n')
}

function formatDateForFilename(date: Date): string {
  return date.toISOString().split('T')[0]
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
