import { HelpCircle } from 'lucide-react'

interface HelpTooltipProps {
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  size?: number
}

/**
 * HelpTooltip - Inline help icon with hover tooltip
 *
 * Use this next to settings and controls to explain what they do.
 *
 * @example
 * <div className="flex items-center gap-2">
 *   <label>Stop Loss %</label>
 *   <HelpTooltip content="Default stop loss percentage for new positions" />
 * </div>
 */
export function HelpTooltip({ content, position = 'top', size = 14 }: HelpTooltipProps) {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  }

  return (
    <span className="relative inline-flex group">
      <HelpCircle
        size={size}
        className="text-gray-500 hover:text-terminal-amber cursor-help transition-colors"
      />
      <span
        className={`
          absolute ${positionClasses[position]} z-50
          hidden group-hover:block
          w-48 px-3 py-2
          bg-terminal-bg border border-terminal-border rounded-lg shadow-lg
          text-xs text-gray-300 leading-relaxed
          pointer-events-none
        `}
      >
        {content}
        {/* Arrow */}
        <span
          className={`
            absolute w-2 h-2 bg-terminal-bg border-terminal-border rotate-45
            ${position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1 border-r border-b' : ''}
            ${position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-l border-t' : ''}
            ${position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1 border-t border-r' : ''}
            ${position === 'right' ? 'right-full top-1/2 -translate-y-1/2 -mr-1 border-b border-l' : ''}
          `}
        />
      </span>
    </span>
  )
}
