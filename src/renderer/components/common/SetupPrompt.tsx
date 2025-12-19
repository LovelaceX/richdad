import { Settings, HelpCircle } from 'lucide-react'
import { useHelpStore, type HelpSection } from '../../stores/helpStore'

interface SetupPromptProps {
  icon?: React.ReactNode
  title: string
  description?: string
  helpSection?: HelpSection
  settingsPath?: string  // e.g., "Data Sources" or "AI Copilot"
  compact?: boolean
}

/**
 * SetupPrompt - A reusable component for showing "how to set up" messages
 * with links to the Help Modal. Use this instead of error messages when
 * something isn't configured (not broken).
 *
 * @example
 * // Full size (centered, with icon)
 * <SetupPrompt
 *   icon={<Newspaper />}
 *   title="No news yet"
 *   description="Connect a data source to see live news"
 *   helpSection="api-limits"
 *   settingsPath="Data Sources"
 * />
 *
 * @example
 * // Compact (inline, for tickers/small spaces)
 * <SetupPrompt
 *   compact
 *   title="FRED API needed"
 *   helpSection="api-limits"
 * />
 */
export function SetupPrompt({
  icon,
  title,
  description,
  helpSection,
  settingsPath,
  compact = false
}: SetupPromptProps) {
  const openHelp = useHelpStore(state => state.openHelp)

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500">
        {icon}
        <span>{title}</span>
        {helpSection && (
          <button
            onClick={() => openHelp(helpSection)}
            className="text-terminal-amber hover:underline flex items-center gap-1"
          >
            <HelpCircle size={12} />
            Learn more
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 rounded-full bg-terminal-border/50 flex items-center justify-center mb-3">
        {icon || <Settings className="w-6 h-6 text-gray-500" />}
      </div>
      <h3 className="text-white font-medium mb-1">{title}</h3>
      {description && (
        <p className="text-gray-500 text-sm mb-3 max-w-xs">{description}</p>
      )}
      <div className="flex items-center gap-3">
        {settingsPath && (
          <span className="text-xs text-gray-400">
            Settings → {settingsPath}
          </span>
        )}
        {helpSection && (
          <button
            onClick={() => openHelp(helpSection)}
            className="flex items-center gap-1 text-terminal-amber text-sm hover:underline"
          >
            <HelpCircle size={14} />
            Learn how
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * InlineHelpLink - A simple inline link to a Help Modal section.
 * Use this in text content to link specific words/phrases to help topics.
 *
 * @example
 * <p>Check your <InlineHelpLink section="api-limits">API settings</InlineHelpLink></p>
 */
export function InlineHelpLink({
  section,
  children
}: {
  section: HelpSection
  children: React.ReactNode
}) {
  const openHelp = useHelpStore(state => state.openHelp)

  return (
    <button
      onClick={() => openHelp(section)}
      className="text-terminal-amber hover:underline inline"
    >
      {children}
    </button>
  )
}
