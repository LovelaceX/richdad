import { memo } from 'react'
import { LayoutDashboard, Newspaper, FlaskConical, Settings } from 'lucide-react'
import { useNavigationStore } from '../../stores/navigationStore'
import type { PageId } from '../../types'
import { NotificationBell } from './NotificationBell'

interface NavItemProps {
  id: PageId
  icon: React.ReactNode
  label: string
  shortcut: string
}

/**
 * NavItem - Memoized since props (id, icon, label, shortcut) are static
 * Only re-renders when currentPage changes for THIS item
 */
const NavItem = memo(function NavItem({ id, icon, label, shortcut }: NavItemProps) {
  const currentPage = useNavigationStore(state => state.currentPage)
  const setPage = useNavigationStore(state => state.setPage)
  const isActive = currentPage === id

  return (
    <button
      onClick={() => setPage(id)}
      className={`
        relative flex items-center justify-center w-8 h-8 rounded transition-all
        group no-drag
        ${isActive
          ? 'bg-terminal-amber/20 text-terminal-amber'
          : 'text-gray-500 hover:text-gray-300 hover:bg-terminal-border/50'
        }
      `}
      title={`${label} (${shortcut})`}
      aria-label={`Navigate to ${label}`}
      aria-current={isActive ? 'page' : undefined}
    >
      {icon}

      {/* Tooltip */}
      <div className="
        absolute top-full mt-2 left-1/2 -translate-x-1/2
        px-2 py-1 bg-terminal-panel border border-terminal-border rounded
        text-xs text-gray-300 whitespace-nowrap
        opacity-0 group-hover:opacity-100 transition-opacity
        pointer-events-none z-50
      ">
        {label}
        <span className="ml-2 text-gray-500">{shortcut}</span>
      </div>
    </button>
  )
})

/**
 * NavBar - Memoized since it has no props
 * Child NavItems handle their own state subscriptions
 */
export const NavBar = memo(function NavBar() {
  return (
    <div className="flex items-center gap-1 px-2 no-drag">
      <NavItem
        id="dashboard"
        icon={<LayoutDashboard size={18} />}
        label="Dashboard"
        shortcut="⌘1"
      />
      <NavItem
        id="news"
        icon={<Newspaper size={18} />}
        label="News"
        shortcut="⌘2"
      />
      <NavItem
        id="backtest"
        icon={<FlaskConical size={18} />}
        label="Backtest"
        shortcut="⌘3"
      />
      <NavItem
        id="settings"
        icon={<Settings size={18} />}
        label="Settings"
        shortcut="⌘4"
      />

      {/* Divider */}
      <div className="w-px h-4 bg-terminal-border mx-1" />

      {/* Notification Bell */}
      <NotificationBell />
    </div>
  )
})
