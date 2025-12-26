import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Leaf, Crown, Brain, CheckCircle2, Download, Copy, Check, Target, BarChart2, Microscope, type LucideIcon } from 'lucide-react'
import { PERSONA_PROMPTS } from '../../lib/ai'
import type { PersonaType } from '../../types'

// Platform detection (Mac and Windows)
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
  mac: 'https://ollama.com/download/mac',
  windows: 'https://ollama.com/download/windows'
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

type SetupPath = 'free' | 'pro'
type WizardStepType = 'welcome' | 'terms' | 'path-selection' | 'api-key' | 'ai-provider' | 'persona'

// Lucide icon mapping for personas
const PERSONA_ICONS: Record<PersonaType, LucideIcon> = {
  jax: Target,
  sterling: BarChart2,
  cipher: Microscope,
}

// Color class mapping for personas
const PERSONA_COLORS: Record<PersonaType, string> = {
  jax: 'text-orange-400',
  sterling: 'text-blue-400',
  cipher: 'text-green-400',
}

export function OnboardingWizard({ isOpen, onClose }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStepType>('welcome')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [setupPath, setSetupPath] = useState<SetupPath>('free')
  const [tiingoKey, setTiingoKey] = useState('')
  const [copied, setCopied] = useState(false)
  const [selectedPersona, setSelectedPersona] = useState<PersonaType>('jax')

  // Platform detection for download links
  const platform = getPlatform()
  const platformName = PLATFORM_NAMES[platform]

  const copyCommand = () => {
    navigator.clipboard.writeText('ollama pull dolphin-llama3:8b')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
      // Save plan choice (tiingo is always the provider)
      const limits = getTierLimitsFromPlan(setupPath)
      await updateSettings({
        marketDataProvider: 'tiingo',
        plan: setupPath
      })
      // Sync tier limits with budget tracker
      updateTierSettings({
        tiingo: limits.tiingo,
      })
      setCurrentStep('api-key')
    } else if (currentStep === 'api-key') {
      // Save Tiingo API key
      if (tiingoKey) {
        await updateSettings({ tiingoApiKey: tiingoKey })
      }
      setCurrentStep('ai-provider')
    } else if (currentStep === 'ai-provider') {
      // Save Ollama as the AI provider and go to persona selection
      await updateAISettings({
        provider: 'ollama',
        apiKey: '',  // Not needed for Ollama
        model: 'dolphin-llama3:8b'
      })
      setCurrentStep('persona')
    } else {
      // Save persona selection and complete onboarding
      await updateSettings({
        persona: selectedPersona,
        hasCompletedOnboarding: true
      })
      onClose()
    }
  }

  const getStepNumber = () => {
    // Welcome has no step number (returns 0)
    // All other steps are numbered 1-5
    const stepOrder: Record<WizardStepType, number> = {
      welcome: 0,           // Not numbered
      terms: 1,             // Step 1 of 5
      'path-selection': 2,  // Step 2 of 5
      'api-key': 3,         // Step 3 of 5
      'ai-provider': 4,     // Step 4 of 5
      'persona': 5          // Step 5 of 5
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
    if (currentStep === 'persona') return 'Finish'
    return 'Continue'
  }

  const renderStep = () => {
    const totalSteps = 5  // Welcome doesn't count as a numbered step
    const stepNumber = getStepNumber()

    switch (currentStep) {
      case 'welcome':
        return <WelcomeStep />
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
                      <div>• Tiingo Starter (50 tickers/hour)</div>
                      <div>• Ollama AI (local, free, private)</div>
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
                        $10/mo API
                      </span>
                    </div>
                    <div className="text-gray-400 text-sm mt-1">For active traders</div>
                    <div className="text-gray-500 text-xs mt-2 space-y-1">
                      <div>• Tiingo Power (5,000 tickers/hour)</div>
                      <div>• Ollama AI (local, free, private)</div>
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
            apiKey={tiingoKey}
            onApiKeyChange={setTiingoKey}
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
                  <div className="w-6 h-6 rounded-full bg-terminal-border flex items-center justify-center text-xs font-bold text-white">1</div>
                  <span className="text-white font-medium text-sm">Download Ollama</span>
                </div>
                <p className="text-gray-400 text-sm ml-8 mb-2">
                  Free AI that runs on your computer - no account needed
                </p>
                <a
                  href={DOWNLOAD_URLS[platform]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-8 px-4 py-2 bg-terminal-amber text-black rounded font-medium hover:bg-amber-500 transition-colors inline-flex items-center gap-2 text-sm"
                >
                  Download for {platformName}
                  <Download size={16} />
                </a>
              </div>

              {/* Step 2: Install Model */}
              <div className="p-3 rounded-lg border border-terminal-border">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-terminal-border flex items-center justify-center text-xs font-bold text-white">2</div>
                  <span className="text-white font-medium text-sm">Install the AI Model</span>
                </div>

                {/* Platform-specific instructions */}
                {platform === 'mac' && (
                  <div className="text-gray-400 text-xs ml-8 mb-3 space-y-1">
                    <p className="text-white font-medium">How to open Terminal:</p>
                    <ol className="list-decimal list-inside ml-2 space-y-0.5">
                      <li>Press <kbd className="bg-terminal-bg px-1.5 py-0.5 rounded text-terminal-amber">⌘ Cmd</kbd> + <kbd className="bg-terminal-bg px-1.5 py-0.5 rounded text-terminal-amber">Space</kbd></li>
                      <li>Type "Terminal" and press Enter</li>
                      <li>Paste the command below and press Enter</li>
                    </ol>
                  </div>
                )}

                {platform === 'windows' && (
                  <div className="text-gray-400 text-xs ml-8 mb-3 space-y-1">
                    <p className="text-white font-medium">How to open Command Prompt:</p>
                    <ol className="list-decimal list-inside ml-2 space-y-0.5">
                      <li>Press the <kbd className="bg-terminal-bg px-1.5 py-0.5 rounded text-terminal-amber">Windows</kbd> key</li>
                      <li>Type "cmd" and press Enter</li>
                      <li>Paste the command below and press Enter</li>
                    </ol>
                  </div>
                )}

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
                Click Continue to choose your AI copilot's personality.
              </p>
            </div>
          </div>
        )
      case 'persona':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-terminal-amber text-sm mb-1">Step {stepNumber} of {totalSteps}</p>
              <h3 className="text-white text-lg font-medium">Choose Your AI Copilot</h3>
              <p className="text-gray-500 text-sm mt-2">Pick a personality for your trading assistant</p>
            </div>

            <div className="space-y-3">
              {(['jax', 'sterling', 'cipher'] as PersonaType[]).map((personaId) => {
                const persona = PERSONA_PROMPTS[personaId]
                const isSelected = selectedPersona === personaId
                const IconComponent = PERSONA_ICONS[personaId]
                const iconColor = PERSONA_COLORS[personaId]

                return (
                  <button
                    key={personaId}
                    onClick={() => setSelectedPersona(personaId)}
                    className={`w-full p-4 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? 'border-terminal-amber bg-terminal-amber/10'
                        : 'border-terminal-border hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <IconComponent className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-white font-medium">{persona.name}</span>
                            <span className="text-gray-500 text-sm ml-2">{persona.title}</span>
                          </div>
                          {isSelected && <Check size={16} className="text-terminal-amber" />}
                        </div>
                        <p className="text-gray-400 text-sm mt-1">
                          {persona.description.split('.')[0]}.
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                          Best for {persona.bestFor.toLowerCase()}.
                        </p>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            <p className="text-center text-gray-500 text-xs">
              You can change your AI persona anytime in Settings → AI Copilot
            </p>
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
                    {currentStep === 'path-selection' || currentStep === 'api-key' || currentStep === 'ai-provider' || currentStep === 'persona'
                      ? 'Setup Wizard'
                      : ''}
                  </h2>
                  {(currentStep === 'path-selection' || currentStep === 'api-key' || currentStep === 'ai-provider' || currentStep === 'persona') && (
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
                      const stepOrder: WizardStepType[] = ['welcome', 'terms', 'path-selection', 'api-key', 'ai-provider', 'persona']
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
