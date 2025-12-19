import { useEffect, useState, lazy, Suspense } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { TopBar } from './components/TopBar'
import { useNavigationStore } from './stores/navigationStore'
import { ErrorBoundary } from './components/ErrorBoundary'

// Lazy load pages for better code splitting
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })))
const News = lazy(() => import('./pages/News').then(m => ({ default: m.News })))
const EconomicCalendar = lazy(() => import('./pages/EconomicCalendar').then(m => ({ default: m.EconomicCalendar })))
const Backtest = lazy(() => import('./pages/Backtest').then(m => ({ default: m.Backtest })))
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })))
import { useSettingsStore } from './stores/settingsStore'
import { useMarketStore } from './stores/marketStore'
import { useDataHeartbeat } from './hooks/useDataHeartbeat'
import { initializeDatabase, getSettings } from './lib/db'
import { OnboardingWizard } from './components/Onboarding/OnboardingWizard'
import { FloatingHelp } from './components/Help/FloatingHelp'
import { HelpModal } from './components/Help/HelpModal'
import { ToastContainer } from './components/Toast/ToastContainer'
import { FindInPage } from './components/FindInPage'
import { applyTheme } from './lib/themes'
import { useHelpStore } from './stores/helpStore'

export default function App() {
  const cvdMode = useSettingsStore(state => state.cvdMode)
  const theme = useSettingsStore(state => state.theme)

  // Global Help Modal state
  const helpIsOpen = useHelpStore(state => state.isOpen)
  const helpInitialSection = useHelpStore(state => state.initialSection)
  const closeHelp = useHelpStore(state => state.closeHelp)
  const currentPage = useNavigationStore(state => state.currentPage)
  const zoomLevel = useSettingsStore(state => state.zoomLevel)
  const zoomScale = zoomLevel / 100
  const zoomIn = useSettingsStore(state => state.zoomIn)
  const zoomOut = useSettingsStore(state => state.zoomOut)
  const resetZoom = useSettingsStore(state => state.resetZoom)
  const loadUserWatchlist = useMarketStore(state => state.loadUserWatchlist)
  const loadSelectedMarket = useMarketStore(state => state.loadSelectedMarket)
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true)
  const [showWizard, setShowWizard] = useState(false)
  const [showFindInPage, setShowFindInPage] = useState(false)

  // Initialize database, load user watchlist, and selected market on mount
  useEffect(() => {
    const init = async () => {
      await initializeDatabase()
      await loadUserWatchlist()
      await loadSelectedMarket()
    }
    init().catch(console.error)
  }, [loadUserWatchlist, loadSelectedMarket])

  // Check if user needs onboarding wizard on mount
  useEffect(() => {
    const checkOnboarding = async () => {
      const settings = await getSettings()
      const needsOnboarding = !settings.hasCompletedOnboarding &&
                             !settings.alphaVantageApiKey &&
                             !settings.polygonApiKey &&
                             !settings.finnhubApiKey
      setShowWizard(needsOnboarding)
      setIsCheckingOnboarding(false)
    }
    checkOnboarding()
  }, [])

  // Initialize data heartbeat service
  useDataHeartbeat()

  // Apply CVD mode on mount if saved
  useEffect(() => {
    if (cvdMode) {
      document.body.classList.add('cvd-mode')
    }
  }, [cvdMode])

  // Apply theme on mount and when changed
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Global keyboard shortcuts for zoom and new window
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault()
          zoomIn()
        } else if (e.key === '-') {
          e.preventDefault()
          zoomOut()
        } else if (e.key === '0') {
          e.preventDefault()
          resetZoom()
        } else if (e.key === 'n' || e.key === 'N') {
          e.preventDefault()
          invoke('create_new_window').catch(console.error)
        } else if (e.key === 'f' || e.key === 'F') {
          e.preventDefault()
          setShowFindInPage(true)
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [zoomIn, zoomOut, resetZoom])

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />
      case 'news':
        return <News />
      case 'economic-calendar':
        return <EconomicCalendar />
      case 'backtest':
        return <Backtest />
      case 'settings':
        return <Settings />
      default:
        return <Dashboard />
    }
  }

  // Block rendering until we know if onboarding is needed (prevents dashboard flash)
  if (isCheckingOnboarding) {
    return (
      <div className="h-screen w-screen bg-terminal-bg flex items-center justify-center">
        <div className="text-terminal-amber animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <>
      <div
        className="h-screen w-screen bg-terminal-bg flex flex-col overflow-hidden"
        style={{
          transform: `scale(${zoomScale})`,
          transformOrigin: 'top left',
          width: `${100 / zoomScale}%`,
          height: `${100 / zoomScale}%`,
        }}
      >
        {/* Top Bar */}
        <TopBar />

        {/* Page Content */}
        <ErrorBoundary fallbackTitle="Application Error">
          <Suspense fallback={
            <div className="flex-1 flex items-center justify-center bg-terminal-bg">
              <div className="text-terminal-amber animate-pulse">Loading...</div>
            </div>
          }>
            {renderPage()}
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Onboarding Wizard */}
      <OnboardingWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
      />

      {/* Floating Help Button */}
      <FloatingHelp />

      {/* Global Help Modal (controlled by helpStore) */}
      <HelpModal
        isOpen={helpIsOpen}
        onClose={closeHelp}
        initialSection={helpInitialSection}
      />

      {/* Toast Notifications (for API limit warnings, etc.) */}
      <ToastContainer />

      {/* Find in Page (Ctrl+F) */}
      <FindInPage
        isOpen={showFindInPage}
        onClose={() => setShowFindInPage(false)}
      />
    </>
  )
}
