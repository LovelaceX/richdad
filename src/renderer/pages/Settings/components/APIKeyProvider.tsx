/**
 * APIKeyProvider Component
 *
 * Generic component for displaying and managing API key configuration.
 * Replaces 6 nearly identical UI blocks in Settings.tsx.
 */

import React from 'react'
import { ExternalLink, AlertCircle, Check, Loader2, Wifi, type LucideIcon } from 'lucide-react'
import { useAPIKeyManager, type APIProvider, type ConnectionStatus } from '../hooks/useAPIKeyManager'

export interface TierOption {
  value: string
  label: string
}

export interface APIKeyProviderProps {
  /** Provider identifier */
  provider: APIProvider
  /** Display label */
  label: string
  /** Icon component */
  icon: LucideIcon
  /** Description text */
  description: string
  /** Current API key from settings */
  currentKey: string | undefined
  /** Callback when key changes (for auto-save) */
  onKeyChange: (key: string) => void
  /** URL to get API key */
  signupUrl: string
  /** Link text (default: "Get free API key") */
  signupText?: string
  /** Optional badge text (e.g., "Recommended", "Portfolio Analytics") */
  badge?: {
    text: string
    color: 'amber' | 'purple' | 'blue' | 'green'
  }
  /** Placeholder for input */
  placeholder?: string
  /** Rate limit info text */
  rateLimitInfo?: string
  /** Message when no key is configured */
  noKeyMessage?: string
  /** Optional tier selection */
  tierOptions?: TierOption[]
  /** Current tier value */
  currentTier?: string
  /** Callback when tier changes */
  onTierChange?: (tier: string) => void
  /** Optional signup instructions (rendered as ordered list) */
  signupInstructions?: string[]
}

const BADGE_COLORS = {
  amber: 'text-terminal-amber bg-terminal-amber/10',
  purple: 'text-purple-400 bg-purple-400/10',
  blue: 'text-blue-400 bg-blue-400/10',
  green: 'text-green-400 bg-green-400/10',
}

/**
 * Status indicator based on connection state
 */
function StatusIndicator({
  hasKey,
  status,
  message,
  noKeyMessage,
}: {
  hasKey: boolean
  status: ConnectionStatus
  message: string
  noKeyMessage: string
}) {
  if (!hasKey) {
    return (
      <div className="mt-4 flex items-center gap-2 text-gray-500 text-xs">
        <AlertCircle className="w-3 h-3" />
        {noKeyMessage}
      </div>
    )
  }

  if (status === 'idle') {
    return (
      <div className="mt-4 flex items-center gap-2 text-terminal-amber text-xs">
        <Check className="w-3 h-3" />
        API key saved (click "Test" to verify)
      </div>
    )
  }

  if (status === 'valid') {
    return (
      <div className="mt-4 flex items-center gap-2 text-terminal-up text-xs">
        <Check className="w-3 h-3" />
        {message}
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="mt-4 flex items-center gap-2 text-terminal-down text-xs">
        <AlertCircle className="w-3 h-3" />
        {message}
      </div>
    )
  }

  return null
}

/**
 * Generic API key provider configuration component
 */
export function APIKeyProvider({
  provider,
  label,
  icon: Icon,
  description,
  currentKey,
  onKeyChange,
  signupUrl,
  signupText = 'Get free API key',
  badge,
  placeholder = 'Your API key',
  rateLimitInfo,
  noKeyMessage = 'No API key configured',
  tierOptions,
  currentTier,
  onTierChange,
  signupInstructions,
}: APIKeyProviderProps) {
  // Use the API key manager hook
  const {
    pendingKey,
    setPendingKey,
    isTesting,
    status,
    message,
    handleTest,
    resetStatus,
  } = useAPIKeyManager({
    provider,
    currentKey,
    onSave: async (key) => onKeyChange(key),
  })

  // Handle key input change
  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPendingKey(value)
    resetStatus() // Reset status when key changes
  }

  return (
    <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-terminal-amber" />
        <span className="text-white text-sm font-medium">{label}</span>
        {badge && (
          <span className={`text-xs px-2 py-0.5 rounded ${BADGE_COLORS[badge.color]}`}>
            {badge.text}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-gray-400 text-xs mb-4">{description}</p>

      {/* Tier Selector (optional) */}
      {tierOptions && tierOptions.length > 0 && (
        <div className="mb-4">
          <label className="text-gray-400 text-xs mb-1 block">
            API Tier (determines rate limits)
          </label>
          <select
            value={currentTier || tierOptions[0].value}
            onChange={(e) => onTierChange?.(e.target.value)}
            className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-terminal-amber/50"
          >
            {tierOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* API Key Input */}
      <div className="mb-4">
        <label className="text-gray-400 text-xs mb-1 block">API Key</label>
        <div className="flex gap-2">
          <input
            type="password"
            value={pendingKey}
            onChange={handleKeyChange}
            placeholder={placeholder}
            className="flex-1 bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-white placeholder:text-gray-600 font-mono focus:outline-none focus:border-terminal-amber/50"
          />
          <button
            onClick={handleTest}
            disabled={!pendingKey || isTesting}
            className="px-4 py-2 bg-terminal-panel border border-terminal-border rounded text-sm text-white hover:bg-terminal-border/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Wifi className="w-4 h-4" />
                Test
              </>
            )}
          </button>
        </div>
        {rateLimitInfo && (
          <p className="text-gray-600 text-xs mt-2">{rateLimitInfo}</p>
        )}
      </div>

      {/* Signup Instructions (optional) */}
      {signupInstructions && signupInstructions.length > 0 && (
        <div className="bg-terminal-bg rounded p-3 mb-4">
          <p className="text-gray-400 text-xs mb-2">To get your API key:</p>
          <ol className="text-gray-400 text-xs space-y-1 list-decimal list-inside">
            {signupInstructions.map((instruction, index) => (
              <li key={index} dangerouslySetInnerHTML={{ __html: instruction }} />
            ))}
          </ol>
        </div>
      )}

      {/* Signup Link */}
      <a
        href={signupUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-terminal-amber hover:underline text-xs"
      >
        <ExternalLink className="w-3 h-3" />
        {signupText}
      </a>

      {/* Status Indicator */}
      <StatusIndicator
        hasKey={!!currentKey}
        status={status}
        message={message}
        noKeyMessage={noKeyMessage}
      />
    </div>
  )
}
