import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Sparkles, Zap } from 'lucide-react'
import { WelcomeStep } from './WelcomeStep'
import { TermsStep } from './TermsStep'
import { WizardStep } from './WizardStep'
import { updateSettings, updateAISettings } from '../../lib/db'

interface OnboardingWizardProps {
  isOpen: boolean
  onClose: () => void
}

type MarketDataProvider = 'polygon' | 'alphavantage'
type AIProviderChoice = 'openai' | 'groq'
type WizardStepType = 'welcome' | 'terms' | 'provider-choice' | 'api-key' | 'ai-provider'

export function OnboardingWizard({ isOpen, onClose }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStepType>('welcome')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<MarketDataProvider>('polygon')
  const [polygonKey, setPolygonKey] = useState('')
  const [alphaVantageKey, setAlphaVantageKey] = useState('')
  const [selectedAIProvider, setSelectedAIProvider] = useState<AIProviderChoice>('openai')
  const [aiApiKey, setAiApiKey] = useState('')

  const handleSkip = async () => {
    // Mark onboarding complete even without keys
    await updateSettings({ hasCompletedOnboarding: true })
    onClose()
  }

  const handleContinue = async () => {
    if (currentStep === 'welcome') {
      setCurrentStep('terms')
    } else if (currentStep === 'terms') {
      setCurrentStep('provider-choice')
    } else if (currentStep === 'provider-choice') {
      // Save provider choice
      await updateSettings({ marketDataProvider: selectedProvider })
      setCurrentStep('api-key')
    } else if (currentStep === 'api-key') {
      // Save the appropriate API key based on selected provider
      if (selectedProvider === 'polygon' && polygonKey) {
        await updateSettings({ polygonApiKey: polygonKey })
      } else if (selectedProvider === 'alphavantage' && alphaVantageKey) {
        await updateSettings({ alphaVantageApiKey: alphaVantageKey })
      }
      setCurrentStep('ai-provider')
    } else {
      // Save AI provider choice and complete onboarding
      if (aiApiKey) {
        // Map groq to llama provider (Groq hosts Llama models)
        const provider = selectedAIProvider === 'groq' ? 'llama' : 'openai'
        const model = selectedAIProvider === 'groq' ? 'llama-3.3-70b-versatile' : 'gpt-4.0-turbo'
        await updateAISettings({ provider, apiKey: aiApiKey, model })
      }
      await updateSettings({ hasCompletedOnboarding: true })
      onClose()
    }
  }

  const getStepNumber = () => {
    const stepOrder: Record<WizardStepType, number> = {
      welcome: 1,
      terms: 2,
      'provider-choice': 3,
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
      case 'provider-choice':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-1">Step {stepNumber} of {totalSteps}</p>
              <h3 className="text-white text-lg font-medium">Choose Market Data Provider</h3>
              <p className="text-gray-500 text-sm mt-2">Select your preferred source for stock prices and charts</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setSelectedProvider('polygon')}
                className={`w-full p-4 rounded-lg border text-left transition-colors ${
                  selectedProvider === 'polygon'
                    ? 'border-terminal-amber bg-terminal-amber/10'
                    : 'border-terminal-border hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">Massive.com (formerly Polygon.io)</div>
                    <div className="text-gray-400 text-sm mt-1">Unlimited API calls, 15-min delayed data</div>
                  </div>
                  <span className="text-terminal-amber text-xs font-medium px-2 py-1 bg-terminal-amber/20 rounded">
                    Recommended
                  </span>
                </div>
              </button>

              <button
                onClick={() => setSelectedProvider('alphavantage')}
                className={`w-full p-4 rounded-lg border text-left transition-colors ${
                  selectedProvider === 'alphavantage'
                    ? 'border-terminal-amber bg-terminal-amber/10'
                    : 'border-terminal-border hover:border-gray-600'
                }`}
              >
                <div>
                  <div className="text-white font-medium">Alpha Vantage</div>
                  <div className="text-gray-400 text-sm mt-1">Real-time data, 25 calls/day limit</div>
                </div>
              </button>
            </div>
          </div>
        )
      case 'api-key':
        return (
          <WizardStep
            stepNumber={stepNumber}
            totalSteps={totalSteps}
            provider={selectedProvider === 'polygon' ? 'polygon' : 'alpha-vantage'}
            apiKey={selectedProvider === 'polygon' ? polygonKey : alphaVantageKey}
            onApiKeyChange={selectedProvider === 'polygon' ? setPolygonKey : setAlphaVantageKey}
          />
        )
      case 'ai-provider':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-1">Step {stepNumber} of {totalSteps}</p>
              <h3 className="text-white text-lg font-medium">Choose AI Provider</h3>
              <p className="text-gray-500 text-sm mt-2">Select your AI copilot for trading recommendations</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setSelectedAIProvider('openai')}
                className={`w-full p-4 rounded-lg border text-left transition-colors ${
                  selectedAIProvider === 'openai'
                    ? 'border-terminal-amber bg-terminal-amber/10'
                    : 'border-terminal-border hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-terminal-bg border border-terminal-border rounded">
                      <Sparkles className="w-5 h-5 text-terminal-amber" />
                    </div>
                    <div>
                      <div className="text-white font-medium">OpenAI (GPT-4)</div>
                      <div className="text-gray-400 text-sm mt-1">Most capable reasoning</div>
                    </div>
                  </div>
                  <span className="text-terminal-amber text-xs font-medium px-2 py-1 bg-terminal-amber/20 rounded">
                    Recommended
                  </span>
                </div>
              </button>

              <button
                onClick={() => setSelectedAIProvider('groq')}
                className={`w-full p-4 rounded-lg border text-left transition-colors ${
                  selectedAIProvider === 'groq'
                    ? 'border-terminal-amber bg-terminal-amber/10'
                    : 'border-terminal-border hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-terminal-bg border border-terminal-border rounded">
                    <Zap className="w-5 h-5 text-terminal-up" />
                  </div>
                  <div>
                    <div className="text-white font-medium">Groq (Free)</div>
                    <div className="text-gray-400 text-sm mt-1">Fast Llama 3 inference, completely free</div>
                  </div>
                </div>
              </button>
            </div>

            {/* API Key Input */}
            <div className="space-y-2">
              <label className="text-gray-400 text-sm">
                {selectedAIProvider === 'openai' ? 'OpenAI API Key' : 'Groq API Key'}
              </label>
              <input
                type="password"
                value={aiApiKey}
                onChange={(e) => setAiApiKey(e.target.value)}
                placeholder={selectedAIProvider === 'openai' ? 'sk-...' : 'gsk_...'}
                className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:border-terminal-amber focus:outline-none"
              />
              <p className="text-gray-500 text-xs">
                {selectedAIProvider === 'openai'
                  ? 'Get your key at platform.openai.com/api-keys'
                  : 'Get your free key at console.groq.com/keys'}
              </p>
            </div>

            <div className="text-center">
              <p className="text-gray-500 text-xs">
                You can skip this and set up AI later in Settings
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
              <div className="flex items-center justify-between p-6 border-b border-terminal-border">
                <div>
                  <h2 className="text-white text-xl font-semibold">
                    {currentStep === 'welcome' || currentStep === 'terms'
                      ? 'Getting Started'
                      : 'API Setup Wizard'}
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    {currentStep === 'welcome' || currentStep === 'terms'
                      ? 'Welcome to RichDad'
                      : 'Configure free market data sources'}
                  </p>
                </div>
                {currentStep !== 'terms' && (
                  <button
                    onClick={handleSkip}
                    className="p-2 hover:bg-terminal-border rounded transition-colors"
                    title="Skip setup"
                  >
                    <X size={20} className="text-gray-400" />
                  </button>
                )}
              </div>

              {/* Step Content */}
              <div className="p-6">
                {renderStep()}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-6 border-t border-terminal-border">
                {currentStep !== 'welcome' && currentStep !== 'terms' && (
                  <button
                    onClick={handleSkip}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Skip Setup
                  </button>
                )}
                {(currentStep === 'welcome' || currentStep === 'terms') && <div />}

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
