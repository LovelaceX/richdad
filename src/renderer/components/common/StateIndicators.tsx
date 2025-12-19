import { Loader2, AlertTriangle, type LucideIcon } from 'lucide-react'

// ============================================================================
// LoadingState - Spinner with optional message
// ============================================================================

interface LoadingStateProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: { icon: 12, text: 'text-[10px]' },
  md: { icon: 16, text: 'text-xs' },
  lg: { icon: 24, text: 'text-sm' }
}

export function LoadingState({ message, size = 'md', className = '' }: LoadingStateProps) {
  const { icon, text } = sizeClasses[size]

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Loader2 size={icon} className="animate-spin text-terminal-amber" />
      {message && (
        <span className={`text-gray-400 ${text}`}>{message}</span>
      )}
    </div>
  )
}

// ============================================================================
// ErrorState - Alert with message and optional retry
// ============================================================================

interface ErrorStateProps {
  message: string
  onRetry?: () => void
  compact?: boolean
  className?: string
}

export function ErrorState({ message, onRetry, compact = false, className = '' }: ErrorStateProps) {
  if (compact) {
    return (
      <div className={`flex items-center gap-2 text-red-400 ${className}`}>
        <AlertTriangle size={12} />
        <span className="text-[10px]">{message}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-terminal-amber hover:underline text-[10px]"
          >
            Retry
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center justify-center p-4 ${className}`}>
      <div className="w-10 h-10 rounded-full bg-red-900/20 flex items-center justify-center mb-2">
        <AlertTriangle className="w-5 h-5 text-red-400" />
      </div>
      <p className="text-red-400 text-sm mb-2">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1 text-xs bg-terminal-border hover:bg-terminal-border/80 text-white rounded transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  )
}

// ============================================================================
// EmptyState - Icon + title + optional description and action
// ============================================================================

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  compact?: boolean
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  className = ''
}: EmptyStateProps) {
  if (compact) {
    return (
      <div className={`text-center text-gray-500 text-xs py-4 ${className}`}>
        {Icon && <Icon size={14} className="inline mr-1.5 opacity-50" />}
        {title}
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center justify-center p-6 text-center ${className}`}>
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-terminal-border/50 flex items-center justify-center mb-3">
          <Icon className="w-6 h-6 text-gray-500" />
        </div>
      )}
      <h3 className="text-gray-400 font-medium mb-1">{title}</h3>
      {description && (
        <p className="text-gray-500 text-sm max-w-xs">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-3 px-3 py-1 text-xs bg-terminal-border hover:bg-terminal-border/80 text-white rounded transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

// ============================================================================
// FreshnessBadge - Small dot indicator for data age
// ============================================================================

interface FreshnessBadgeProps {
  /** Timestamp when data was last updated (ms) */
  lastUpdated?: number | null
  /** Whether data is fresh (overrides calculation if provided) */
  isFresh?: boolean
  /** Cache age in ms (overrides calculation if provided) */
  cacheAge?: number
  /** Show tooltip on hover */
  showTooltip?: boolean
  className?: string
}

/**
 * FreshnessBadge - Visual indicator for data staleness
 *
 * - Green: Fresh (<5 min)
 * - Yellow: Stale (5-15 min)
 * - Red: Very stale (>15 min)
 */
export function FreshnessBadge({
  lastUpdated,
  isFresh,
  cacheAge,
  showTooltip = true,
  className = ''
}: FreshnessBadgeProps) {
  // Calculate age if not provided
  const age = cacheAge ?? (lastUpdated ? Date.now() - lastUpdated : 0)
  const fresh = isFresh ?? age < 5 * 60 * 1000 // 5 minutes

  // Determine color based on age
  let colorClass = 'bg-green-400' // Fresh
  if (!fresh) {
    if (age < 15 * 60 * 1000) {
      colorClass = 'bg-yellow-400' // Stale (5-15 min)
    } else {
      colorClass = 'bg-red-400' // Very stale (>15 min)
    }
  }

  // Format tooltip text
  const getTooltipText = () => {
    if (!lastUpdated && !cacheAge) return 'Unknown age'
    const minutes = Math.floor(age / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ago`
  }

  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full ${colorClass} ${className}`}
      title={showTooltip ? getTooltipText() : undefined}
    />
  )
}
