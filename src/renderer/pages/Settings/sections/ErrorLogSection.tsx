/**
 * ErrorLogSection (Activity Log)
 *
 * Settings section for viewing and resolving activity/errors.
 * Provides self-service troubleshooting with actionable resolution hints.
 */

import { useState, useEffect } from 'react'
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  HelpCircle,
  Settings,
  Trash2,
  Mail,
  ExternalLink
} from 'lucide-react'
import { useErrorLogStore } from '../../../stores/errorLogStore'
import { useHelpStore } from '../../../stores/helpStore'
import { clearAPICache, type ErrorLogEntry, type ErrorResolutionType } from '../../../lib/db'
import { getResolutionLabel } from '../../../lib/errorLogHelpers'

export function ErrorLogSection() {
  const {
    errors,
    loading,
    currentPage,
    totalPages,
    totalErrors,
    loadErrors,
    resolveError,
    resolveAll
  } = useErrorLogStore()

  const openHelp = useHelpStore((s) => s.openHelp)
  const [showResolveAllConfirm, setShowResolveAllConfirm] = useState(false)
  const [actionLoading, setActionLoading] = useState<number | null>(null)

  useEffect(() => {
    loadErrors()
  }, [loadErrors])

  // Handle resolution action
  const handleResolutionAction = async (error: ErrorLogEntry) => {
    switch (error.resolutionType) {
      case 'help_article':
        if (error.resolutionTarget) {
          openHelp(error.resolutionTarget as 'get-started' | 'troubleshooting' | 'api-limits' | 'ai-copilot' | 'faq')
        }
        break
      case 'clear_cache':
        clearAPICache()
        // Could show a toast here
        break
      case 'open_settings':
        // Navigate to settings section
        window.dispatchEvent(
          new CustomEvent('navigate-settings', {
            detail: { section: error.resolutionTarget }
          })
        )
        break
      case 'contact_support':
        window.open('mailto:support@richdad.app', '_blank')
        break
      case 'retry':
        window.dispatchEvent(new Event(`retry-${error.service}`))
        break
    }
  }

  const handleResolve = async (id: number) => {
    setActionLoading(id)
    await resolveError(id)
    setActionLoading(null)
  }

  const handleResolveAll = async () => {
    setShowResolveAllConfirm(false)
    await resolveAll()
  }

  const formatTimestamp = (ts: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(ts)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'text-red-400'
      case 'warning':
        return 'text-yellow-400'
      default:
        return 'text-blue-400'
    }
  }

  const getServiceLabel = (service: string) => {
    const labels: Record<string, string> = {
      market: 'Market Data',
      news: 'News Feed',
      sentiment: 'Sentiment',
      ai: 'AI Copilot',
      websocket: 'WebSocket',
      system: 'System'
    }
    return labels[service] || service
  }

  const getActionIcon = (type?: ErrorResolutionType) => {
    switch (type) {
      case 'help_article':
        return <HelpCircle size={14} />
      case 'open_settings':
        return <Settings size={14} />
      case 'clear_cache':
        return <Trash2 size={14} />
      case 'contact_support':
        return <Mail size={14} />
      case 'retry':
        return <RefreshCw size={14} />
      default:
        return <ExternalLink size={14} />
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-white text-lg font-medium">Activity Log</h2>
        {totalErrors > 0 && (
          <button
            onClick={() => setShowResolveAllConfirm(true)}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Resolve All ({totalErrors})
          </button>
        )}
      </div>
      <p className="text-gray-500 text-sm mb-6">Review recent activity and resolve any issues</p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-5 h-5 text-gray-500 animate-spin" />
        </div>
      ) : errors.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Error List */}
          <div className="space-y-3">
            {errors.map((error) => (
              <div
                key={error.id}
                className="bg-terminal-panel border border-terminal-border rounded-lg p-4"
              >
                <div className="flex items-start gap-4">
                  {/* Date Column */}
                  <div className="text-gray-500 text-xs whitespace-nowrap w-28 pt-0.5">
                    {formatTimestamp(error.timestamp)}
                  </div>

                  {/* Error Message Column */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-xs font-medium uppercase ${getSeverityColor(error.severity)}`}
                      >
                        {getServiceLabel(error.service)}
                      </span>
                      {error.context?.provider && (
                        <span className="text-xs text-gray-500">({error.context.provider})</span>
                      )}
                    </div>
                    <p className="text-white text-sm line-clamp-2">{error.message}</p>
                  </div>

                  {/* How to Fix Column */}
                  <div className="w-32 flex-shrink-0">
                    {error.resolutionHint && (
                      <button
                        onClick={() => handleResolutionAction(error)}
                        className="flex items-center gap-1.5 text-terminal-amber text-xs hover:underline"
                        title={error.resolutionHint}
                      >
                        {getActionIcon(error.resolutionType)}
                        <span className="truncate">{getResolutionLabel(error.resolutionType)}</span>
                      </button>
                    )}
                  </div>

                  {/* Resolve Button */}
                  <button
                    onClick={() => handleResolve(error.id!)}
                    disabled={actionLoading === error.id}
                    className="px-3 py-1.5 text-xs bg-terminal-border text-white rounded hover:bg-terminal-border/70 transition-colors disabled:opacity-50 flex-shrink-0"
                  >
                    {actionLoading === error.id ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      'Resolve'
                    )}
                  </button>
                </div>

                {/* Resolution Hint (expanded) */}
                {error.resolutionHint && (
                  <div className="mt-2 ml-32 text-xs text-gray-400">{error.resolutionHint}</div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => loadErrors(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
                Prev
              </button>

              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => loadErrors(page)}
                    className={`w-8 h-8 rounded text-sm ${
                      page === currentPage
                        ? 'bg-terminal-amber text-black'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => loadErrors(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Resolve All Confirmation Modal */}
      {showResolveAllConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-terminal-panel border border-terminal-border rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-terminal-amber" />
              <h3 className="text-white font-medium">Resolve All Errors?</h3>
            </div>
            <p className="text-gray-400 text-sm mb-6">
              This will mark all {totalErrors} error{totalErrors > 1 ? 's' : ''} as resolved. They
              will be removed from the log.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowResolveAllConfirm(false)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveAll}
                className="px-4 py-2 text-sm bg-terminal-amber text-black rounded hover:bg-terminal-amber/90 transition-colors"
              >
                Resolve All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Empty state component
function EmptyState() {
  return (
    <div className="text-center py-12 bg-terminal-panel border border-terminal-border rounded-lg">
      <CheckCircle className="w-12 h-12 text-terminal-up mx-auto mb-4" />
      <h3 className="text-white font-medium mb-2">All Clear!</h3>
      <p className="text-gray-500 text-sm">No errors to report. Your connections are working smoothly.</p>
    </div>
  )
}
