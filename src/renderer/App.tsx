import { useEffect, useState } from 'react'
import { TopBar } from './components/TopBar'
import { Dashboard, News, Settings } from './pages'
import { useNavigationStore } from './stores/navigationStore'
import { useSettingsStore } from './stores/settingsStore'
import { useDataHeartbeat } from './hooks/useDataHeartbeat'
import { initializeDatabase, getSettings } from './lib/db'
import { OnboardingWizard } from './components/Onboarding/OnboardingWizard'
import { FloatingHelp } from './components/Help/FloatingHelp'
import { applyTheme } from './lib/themes'

export default function App() {
  const cvdMode = useSettingsStore(state => state.cvdMode)
  const theme = useSettingsStore(state => state.theme)
  const currentPage = useNavigationStore(state => state.currentPage)
  const zoomLevel = useSettingsStore(state => state.zoomLevel)
  const zoomScale = zoomLevel / 100
  const zoomIn = useSettingsStore(state => state.zoomIn)
  const zoomOut = useSettingsStore(state => state.zoomOut)
  const resetZoom = useSettingsStore(state => state.resetZoom)
  const [showWizard, setShowWizard] = useState(false)

  // Initialize database on mount
  useEffect(() => {
    initializeDatabase().catch(console.error)
  }, [])

  // Check if user needs onboarding wizard on mount
  useEffect(() => {
    const checkOnboarding = async () => {
      const settings = await getSettings()
      const needsOnboarding = !settings.hasCompletedOnboarding &&
                             !settings.alphaVantageApiKey &&
                             !settings.finnhubApiKey
      setShowWizard(needsOnboarding)
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

  // Global keyboard shortcuts for zoom
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
      case 'settings':
        return <Settings />
      default:
        return <Dashboard />
    }
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
        {renderPage()}
      </div>

      {/* Onboarding Wizard */}
      <OnboardingWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
      />

      {/* Floating Help Button */}
      <FloatingHelp />
    </>
  )
}
