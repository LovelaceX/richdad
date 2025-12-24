import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Leaf, Crown, Brain, CheckCircle2, Download, Copy, Check, ExternalLink } from 'lucide-react'

// Platform detection (Mac and Windows only)
type Platform = 'mac' | 'windows'

const getPlatform = (): Platform => {
  const userAgent = navigator.userAgent.toLowerCase()
  if (userAgent.includes('win')) return 'windows'
  return 'mac' // Default to Mac
}

const PLATFORM_NAMES: Record<Platform, string> = {
  mac: 'macOS',
  windows: 'Windows'
}

const DOWNLOAD_URLS: Record<Platform, string> = {
  mac: 'https://ollama.ai/download/mac',
  windows: 'https://ollama.ai/download/windows'
}
import { WelcomeStep } from './WelcomeStep'
import { TermsStep } from './TermsStep'
import { WizardStep } from './WizardStep'
import { updateSettings, updateAISettings, getTierLimitsFromPlan } from '../../lib/db'
import { updateTierSettings } from '../../../services/apiBudgetTracker'

interface OnboardingWizardProps {
  isOpen: boolean
  onClose: () => void
}

type MarketDataProvider = 'polygon' | 'twelvedata'
type SetupPath = 'free' | 'pro'
type WizardStepType = 'welcome' | 'terms' | 'path-selection' | 'api-key' | 'ai-provider'

export function OnboardingWizard({ isOpen, onClose }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStepType>('welcome')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [setupPath, setSetupPath] = useState<SetupPath>('free')
  const [polygonKey, setPolygonKey] = useState('')
  const [twelvedataKey, setTwelvedataKey] = useState('')
  const [copied, setCopied] = useState(false)

  // Platform detection for download links
  const platform = getPlatform()
  const platformName = PLATFORM_NAMES[platform]

  const copyCommand = () => {
    navigator.clipboard.writeText('ollama pull dolphin-llama3:8b')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Derived state based on selected path
  // Free uses TwelveData, Pro uses Polygon
  const selectedProvider: MarketDataProvider = setupPath === 'pro' ? 'polygon' : 'twelvedata'

  // Update path selection
  const handlePathChange = (path: SetupPath) => {
    setSetupPath(path)
  }

  const handleSkip = async () => {
    // Mark onboarding complete even without keys
    await updateSettings({ hasCompletedOnboarding: true })
    onClose()
  }

  const handleContinue = async () => {
    if (currentStep === 'welcome') {
      setCurrentStep('terms')
    } else if (currentStep === 'terms') {
      setCurrentStep('path-selection')
    } else if (currentStep === 'path-selection') {
      // Save provider choice and plan
      const limits = getTierLimitsFromPlan(setupPath)
      await updateSettings({
        marketDataProvider: selectedProvider,
        plan: setupPath
      })
      // Sync tier limits with budget tracker
      updateTierSettings({
        polygon: limits.polygon,
        twelveData: limits.twelveData,
        finnhub: limits.finnhub,
      })
      setCurrentStep('api-key')
    } else if (currentStep === 'api-key') {
      // Save the appropriate API key based on selected provider
      if (selectedProvider === 'polygon' && polygonKey) {
        await updateSettings({ polygonApiKey: polygonKey })
      } else if (selectedProvider === 'twelvedata' && twelvedataKey) {
        await updateSettings({ twelvedataApiKey: twelvedataKey })
      }
      setCurrentStep('ai-provider')
    } else {
      // Save Ollama as the AI provider and complete onboarding
      await updateAISettings({
        provider: 'ollama',
        apiKey: '',  // Not needed for Ollama
        model: 'dolphin-llama3:8b'
      })
      await updateSettings({ hasCompletedOnboarding: true })
      onClose()
    }
  }

  const getStepNumber = () => {
    const stepOrder: Record<WizardStepType, number> = {
      welcome: 1,
      terms: 2,
      'path-selection': 3,
      'api-key': 4,
      'ai-provider': 5
    }
    return stepOrder[currentStep]
  }

  const canContinue = () => {
    if (currentStep === 'terms') {
      return termsAccepted
    }
    return true
  }

  const getButtonText = () => {
    if (currentStep === 'ai-provider') return 'Finish'
    return 'Continue'
  }

  const renderStep = () => {
    const totalSteps = 5
    const stepNumber = getStepNumber()

    switch (currentStep) {
      case 'welcome':
        return <WelcomeStep stepNumber={stepNumber} totalSteps={totalSteps} />
      case 'terms':
        return (
          <TermsStep
            stepNumber={stepNumber}
            totalSteps={totalSteps}
            accepted={termsAccepted}
            onAcceptChange={setTermsAccepted}
          />
        )
      case 'path-selection':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-terminal-amber text-sm mb-1">Step {stepNumber} of {totalSteps}</p>
              <h3 className="text-white text-lg font-medium">Choose Your Plan</h3>
              <p className="text-gray-500 text-sm mt-2">Select based on your needs - you can change this later in Settings</p>
            </div>

            <div className="space-y-3">
              {/* Free Path */}
              <button
                onClick={() => handlePathChange('free')}
                className={`w-full p-4 rounded-lg border text-left transition-colors ${
                  setupPath === 'free'
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-terminal-border hover:border-gray-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Leaf className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="text-white font-medium">Free</div>
                      <span className="text-green-400 text-xs font-medium px-2 py-0.5 bg-green-400/20 rounded">
                        $0
                      </span>
                    </div>
                    <div className="text-gray-400 text-sm mt-1">Perfect for getting started</div>
                    <div className="text-gray-500 text-xs mt-2 space-y-1">
                      <div>• TwelveData (800 calls/day)</div>
                      <div>• Groq AI (Llama 3 - free)</div>
                      <div>• RSS News feeds</div>
                    </div>
                  </div>
                </div>
              </button>

              {/* Pro Path */}
              <button
                onClick={() => handlePathChange('pro')}
                className={`w-full p-4 rounded-lg border text-left transition-colors ${
                  setupPath === 'pro'
                    ? 'border-terminal-amber bg-terminal-amber/10'
                    : 'border-terminal-border hover:border-gray-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Crown className="w-5 h-5 text-terminal-amber flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="text-white font-medium">Pro</div>
                      <span className="text-terminal-amber text-xs font-medium px-2 py-0.5 bg-terminal-amber/20 rounded">
                        API costs only
                      </span>
                    </div>
                    <div className="text-gray-400 text-sm mt-1">Unlimited data + premium AI</div>
                    <div className="text-gray-500 text-xs mt-2 space-y-1">
                      <div>• Polygon (unlimited calls)</div>
                      <div>• OpenAI or Claude</div>
                      <div>• All news sources</div>
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <p className="text-center text-gray-500 text-xs">
              All plans can be customized later in Settings → Market Data
            </p>
          </div>
        )
      case 'api-key':
        return (
          <WizardStep
            stepNumber={stepNumber}
            totalSteps={totalSteps}
            provider={selectedProvider === 'polygon' ? 'polygon' : 'twelvedata'}
            apiKey={selectedProvider === 'polygon' ? polygonKey : twelvedataKey}
            onApiKeyChange={selectedProvider === 'polygon' ? setPolygonKey : setTwelvedataKey}
          />
        )
      case 'ai-provider':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-terminal-amber text-sm mb-1">Step {stepNumber} of {totalSteps}</p>
              <h3 className="text-white text-lg font-medium">AI Copilot Setup</h3>
              <p className="text-gray-500 text-sm mt-2">RichDad uses local AI for trading recommendations</p>
            </div>

            {/* Ollama Info Card */}
            <div className="p-4 rounded-lg border border-terminal-amber bg-terminal-amber/10">
              <div className="flex items-center gap-3 mb-3">
                <Brain className="w-6 h-6 text-terminal-amber flex-shrink-0" />
                <div>
                  <div className="text-white font-medium">Ollama (Local AI)</div>
                  <div className="text-gray-400 text-sm">Free, private, uncensored trading analysis</div>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-terminal-up" />
                  <span>No API costs - runs entirely on your computer</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-terminal-up" />
                  <span>Private - your data never leaves your machine</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-terminal-up" />
                  <span>Gives direct trading recommendations (no disclaimers)</span>
                </div>
              </div>
            </div>

            {/* Step-by-Step Setup Guide */}
            <div className="space-y-3">
              {/* Step 1: Download */}
              <div className="p-3 rounded-lg border border-terminal-border">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-terminal-amber flex items-center justify-center text-xs font-bold text-black">1</div>
                  <span className="text-white font-medium text-sm">Download Ollama</span>
                </div>
                <p className="text-gray-400 text-sm ml-8 mb-2">
                  Free AI that runs on your computer - no account needed
                </p>
                <button
                  onClick={() => window.open(DOWNLOAD_URLS[platform], '_blank')}
                  className="ml-8 px-4 py-2 bg-terminal-amber text-black rounded font-medium hover:bg-amber-500 transition-colors flex items-center gap-2 text-sm"
                >
                  <Download size={16} />
                  Download for {platformName}
                  <ExternalLink size={12} />
                </button>
              </div>

              {/* Step 2: Install Model */}
              <div className="p-3 rounded-lg border border-terminal-border">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-terminal-border flex items-center justify-center text-xs font-bold text-white">2</div>
                  <span className="text-white font-medium text-sm">Install the AI Model</span>
                </div>
                <p className="text-gray-400 text-sm ml-8 mb-2">
                  Open {platform === 'mac' ? 'Terminal' : platform === 'windows' ? 'Command Prompt' : 'Terminal'} and paste this:
                </p>
                <div className="ml-8 flex items-center gap-2">
                  <code className="flex-1 bg-terminal-bg px-3 py-2 rounded text-sm text-terminal-amber font-mono">
                    ollama pull dolphin-llama3:8b
                  </code>
                  <button
                    onClick={copyCommand}
                    className="px-3 py-2 bg-terminal-border hover:bg-gray-600 rounded text-white text-sm flex items-center gap-1.5 transition-colors"
                  >
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p className="text-gray-500 text-xs ml-8 mt-2">
                  This downloads ~5GB - grab a coffee while it installs
                </p>
              </div>

              {/* Step 3: Done */}
              <div className="p-3 rounded-lg border border-terminal-border">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-terminal-border flex items-center justify-center text-xs font-bold text-white">3</div>
                  <span className="text-white font-medium text-sm">You're All Set!</span>
                </div>
                <p className="text-gray-400 text-sm ml-8">
                  Keep Ollama running in the background (it starts automatically)
                </p>
              </div>
            </div>

            <div className="text-center">
              <p className="text-gray-500 text-xs">
                Click Finish to complete setup. You can configure AI later in Settings.
              </p>
            </div>
          </div>
        )
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - Solid background so no dashboard data shows */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-terminal-bg z-50"
            onClick={handleSkip}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-terminal-panel border border-terminal-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between p-6">
                <div>
                  <h2 className="text-white text-xl font-semibold">
                    {currentStep === 'path-selection' || currentStep === 'api-key' || currentStep === 'ai-provider'
                      ? 'Setup Wizard'
                      : ''}
                  </h2>
                  {(currentStep === 'path-selection' || currentStep === 'api-key' || currentStep === 'ai-provider') && (
                    <p className="text-gray-400 text-sm mt-1">
                      Configure your market data and AI sources
                    </p>
                  )}
                </div>
                {/* Close button always visible */}
                <button
                  onClick={handleSkip}
                  className="p-2 hover:bg-terminal-border rounded transition-colors"
                  title="Skip setup"
                >
                  <X size={20} className="text-gray-400" />
                </button>
              </div>

              {/* Step Content */}
              <div className="p-6">
                {renderStep()}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-6">
                {currentStep !== 'welcome' ? (
                  <button
                    onClick={() => {
                      const stepOrder: WizardStepType[] = ['welcome', 'terms', 'path-selection', 'api-key', 'ai-provider']
                      const currentIndex = stepOrder.indexOf(currentStep)
                      if (currentIndex > 0) {
                        setCurrentStep(stepOrder[currentIndex - 1])
                      }
                    }}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Back
                  </button>
                ) : (
                  <div />
                )}

                <button
                  onClick={handleContinue}
                  disabled={!canContinue()}
                  className={`px-6 py-2 rounded font-medium transition-colors ${
                    canContinue()
                      ? 'bg-terminal-amber text-black hover:bg-amber-500'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {getButtonText()}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
