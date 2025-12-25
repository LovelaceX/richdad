import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { HelpCircle, X, Maximize2, Keyboard, Zap, Gauge, BookOpen, ClipboardCheck } from 'lucide-react'
import { useHelpStore, type HelpSection } from '../../stores/helpStore'

interface QuickLink {
  icon: React.ReactNode
  label: string
  section: HelpSection | 'full'
}

const quickLinks: QuickLink[] = [
  { icon: <Zap size={14} />, label: 'Getting Started', section: 'get-started' },
  { icon: <ClipboardCheck size={14} />, label: 'Verify Setup', section: 'verify-setup' },
  { icon: <Keyboard size={14} />, label: 'Shortcuts', section: 'shortcuts' },
  { icon: <Gauge size={14} />, label: 'API Limits', section: 'api-limits' },
  { icon: <BookOpen size={14} />, label: 'Full Guide', section: 'full' },
]

export function FloatingHelp() {
  // Local state for mini panel only
  const [isOpen, setIsOpen] = useState(false)

  // Global help modal state
  const openHelp = useHelpStore(state => state.openHelp)

  // Keyboard shortcut: Cmd+? to open help
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + / (which is ?)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '/') {
        e.preventDefault()
        openHelp()
        setIsOpen(false)
      }
      // Escape to close mini panel
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, openHelp])

  const handleQuickLink = (section: HelpSection | 'full') => {
    if (section === 'full') {
      openHelp()
    } else {
      openHelp(section)
    }
    setIsOpen(false)
  }

  const handleExpand = () => {
    openHelp()
    setIsOpen(false)
  }

  return (
    <>
      {/* Floating Help Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-14 right-0 w-56 bg-terminal-panel border border-terminal-border rounded-lg shadow-2xl overflow-hidden"
            >
              {/* Mini Panel Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-terminal-border bg-terminal-bg/50">
                <span className="text-white text-sm font-medium">Quick Help</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleExpand}
                    className="p-1 hover:bg-terminal-border rounded transition-colors"
                    title="Open Full Guide"
                  >
                    <Maximize2 size={14} className="text-gray-400 hover:text-terminal-amber" />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-terminal-border rounded transition-colors"
                  >
                    <X size={14} className="text-gray-400 hover:text-white" />
                  </button>
                </div>
              </div>

              {/* Quick Links */}
              <div className="p-2 space-y-1">
                {quickLinks.map((link) => (
                  <button
                    key={link.section}
                    onClick={() => handleQuickLink(link.section)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-terminal-border/50 transition-colors text-left"
                  >
                    <span className="text-terminal-amber">{link.icon}</span>
                    <span className="text-gray-300 text-sm">{link.label}</span>
                  </button>
                ))}
              </div>

              {/* Keyboard Hint */}
              <div className="px-3 py-2 border-t border-terminal-border bg-terminal-bg/30">
                <p className="text-gray-500 text-xs text-center">
                  Press <span className="text-terminal-amber font-mono">Cmd+?</span> for full guide
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Button */}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-12 h-12 rounded-full shadow-lg flex items-center justify-center
            transition-all duration-200 hover:scale-105
            ${isOpen
              ? 'bg-terminal-amber text-black'
              : 'bg-terminal-panel border border-terminal-border text-gray-400 hover:text-terminal-amber hover:border-terminal-amber/50'
            }
          `}
          whileTap={{ scale: 0.95 }}
          title="Help & Documentation (Cmd+?)"
        >
          <HelpCircle size={24} />
        </motion.button>
      </div>

      {/* HelpModal is now rendered in App.tsx and controlled by helpStore */}
    </>
  )
}
