/**
 * MyProfileSection
 *
 * Settings section for profile and trading data export.
 */

import { useState, useEffect } from 'react'
import { Download, ChevronDown } from 'lucide-react'
import { AIPerformanceDetail } from '../../../components/AI/AIPerformanceDetail'
import { getProfile, getTradeDecisions, type UserProfile, type TradeDecision } from '../../../lib/db'
import { exportDecisions } from '../../../lib/export'

export function MyProfileSection() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [exportStartDate, setExportStartDate] = useState('')
  const [exportEndDate, setExportEndDate] = useState('')
  const [exportPreviewData, setExportPreviewData] = useState<TradeDecision[]>([])
  const [showExportDropdown, setShowExportDropdown] = useState(false)

  // Load profile
  useEffect(() => {
    getProfile().then(setProfile)
  }, [])

  // Load export preview data when dates change
  useEffect(() => {
    const loadExportPreview = async () => {
      if (exportStartDate || exportEndDate) {
        const allTrades = await getTradeDecisions(1000)
        let filtered = allTrades

        if (exportStartDate) {
          const startTime = new Date(exportStartDate).getTime()
          filtered = filtered.filter((t) => t.timestamp >= startTime)
        }

        if (exportEndDate) {
          const endTime = new Date(exportEndDate).getTime() + 86400000 // Add 1 day to include end date
          filtered = filtered.filter((t) => t.timestamp < endTime)
        }

        setExportPreviewData(filtered)
      } else {
        setExportPreviewData([])
      }
    }

    loadExportPreview()
  }, [exportStartDate, exportEndDate])

  const handleExport = async (format: 'txt' | 'csv') => {
    const startDate = exportStartDate ? new Date(exportStartDate) : undefined
    const endDate = exportEndDate ? new Date(exportEndDate) : undefined
    await exportDecisions(format, startDate, endDate)
    setShowExportDropdown(false)
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-white text-lg font-medium mb-1">My Profile</h2>
      <p className="text-gray-500 text-sm mb-6">Manage your profile and export trading data</p>

      {/* Performance History */}
      <div className="bg-terminal-panel border border-terminal-border rounded-lg p-6 mb-6">
        <h3 className="text-white font-medium mb-4">Performance History</h3>
        <AIPerformanceDetail />
      </div>

      {/* Export Section */}
      <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-4">
          <Download className="w-4 h-4 text-terminal-amber" />
          <span className="text-white text-sm font-medium">Export Decisions</span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-gray-400 text-xs mb-1 block">From Date</label>
            <input
              type="date"
              value={exportStartDate}
              onChange={(e) => setExportStartDate(e.target.value)}
              className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1 block">To Date</label>
            <input
              type="date"
              value={exportEndDate}
              onChange={(e) => setExportEndDate(e.target.value)}
              className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-white"
            />
          </div>
        </div>

        {/* Preview Table */}
        {exportPreviewData.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-gray-400 text-xs font-medium">Preview</h4>
              <span className="text-terminal-amber text-xs">
                {exportPreviewData.length} trade{exportPreviewData.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="bg-terminal-bg border border-terminal-border rounded overflow-hidden">
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-terminal-panel">
                      <th className="text-left text-gray-400 font-medium px-3 py-2">Date</th>
                      <th className="text-left text-gray-400 font-medium px-3 py-2">Symbol</th>
                      <th className="text-left text-gray-400 font-medium px-3 py-2">Action</th>
                      <th className="text-right text-gray-400 font-medium px-3 py-2">Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exportPreviewData.slice(0, 10).map((trade) => (
                      <tr key={trade.id} className="border-t border-terminal-border">
                        <td className="px-3 py-2 text-gray-400">
                          {new Date(trade.timestamp).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2 text-terminal-amber font-mono">{trade.symbol}</td>
                        <td
                          className={`px-3 py-2 ${
                            trade.action === 'BUY'
                              ? 'text-terminal-up'
                              : trade.action === 'SELL'
                              ? 'text-terminal-down'
                              : 'text-gray-400'
                          }`}
                        >
                          {trade.action}
                        </td>
                        <td className="px-3 py-2 text-right text-white">{trade.confidence}%</td>
                      </tr>
                    ))}
                    {exportPreviewData.length > 10 && (
                      <tr className="border-t border-terminal-border">
                        <td colSpan={4} className="px-3 py-2 text-center text-gray-500">
                          ... and {exportPreviewData.length - 10} more
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Export Button */}
        <div className="relative">
          <button
            onClick={() => setShowExportDropdown(!showExportDropdown)}
            disabled={exportPreviewData.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-terminal-amber text-black rounded hover:bg-terminal-amber/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            Export
            <ChevronDown size={14} />
          </button>

          {showExportDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-terminal-panel border border-terminal-border rounded shadow-lg z-10">
              <button
                onClick={() => handleExport('csv')}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-terminal-border/50"
              >
                Export as CSV
              </button>
              <button
                onClick={() => handleExport('txt')}
                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-terminal-border/50"
              >
                Export as TXT
              </button>
            </div>
          )}
        </div>

        {exportPreviewData.length === 0 && (exportStartDate || exportEndDate) && (
          <p className="text-gray-500 text-xs mt-2">
            No trades found in the selected date range.
          </p>
        )}

        {!exportStartDate && !exportEndDate && (
          <p className="text-gray-500 text-xs mt-2">
            Select a date range to preview and export your trading decisions.
          </p>
        )}
      </div>
    </div>
  )
}
