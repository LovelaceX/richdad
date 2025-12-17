import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell } from 'lucide-react'
import { useNotificationStore } from '../../stores/notificationStore'
import { NotificationPanel } from './NotificationPanel'

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const pendingRecommendations = useNotificationStore(state => state.pendingRecommendations)
  const markAllViewed = useNotificationStore(state => state.markAllViewed)
  const panelRef = useRef<HTMLDivElement>(null)

  const pendingCount = pendingRecommendations.length
  const unviewedCount = pendingRecommendations.filter(r => !r.viewed).length

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      // Mark all as viewed when panel opens
      markAllViewed()
    }

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, markAllViewed])

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          relative flex items-center justify-center w-8 h-8 rounded transition-all
          group no-drag
          ${isOpen
            ? 'bg-terminal-amber/20 text-terminal-amber'
            : 'text-gray-500 hover:text-gray-300 hover:bg-terminal-border/50'
          }
        `}
        title={`Pending Recommendations (${pendingCount})`}
      >
        <Bell size={18} />

        {/* Badge */}
        {unviewedCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-semantic-down text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1"
          >
            {unviewedCount > 9 ? '9+' : unviewedCount}
          </motion.span>
        )}

        {/* Tooltip */}
        <div className="
          absolute top-full mt-2 left-1/2 -translate-x-1/2
          px-2 py-1 bg-terminal-panel border border-terminal-border rounded
          text-xs text-gray-300 whitespace-nowrap
          opacity-0 group-hover:opacity-100 transition-opacity
          pointer-events-none z-50
        ">
          Notifications
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <NotificationPanel onClose={() => setIsOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
