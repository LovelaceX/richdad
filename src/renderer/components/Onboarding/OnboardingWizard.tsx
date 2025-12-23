import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Sparkles, Zap, Leaf, Star, Crown, Brain, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { WelcomeStep } from './WelcomeStep'
import { TermsStep } from './TermsStep'
import { WizardStep } from './WizardStep'
import { updateSettings, updateAISettings } from '../../lib/db'
import { testAIKey, type AIProvider } from '../../../services/aiKeyValidator'

interface OnboardingWizardProps {
  isOpen: boolean
  onClose: () => void
}

type MarketDataProvider = 'polygon' | 'twelvedata'
type AIProviderChoice = 'openai' | 'groq' | 'anthropic'
type SetupPath = 'free' | 'standard' | 'premium'
type WizardStepType = 'welcome' | 'terms' | 'path-selection' | 'api-key' | 'ai-provider'

export function OnboardingWizard({ isOpen, onClose }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStepType>('welcome')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [setupPath, setSetupPath] = useState<SetupPath>('standard')
  const [polygonKey, setPolygonKey] = useState('')
  const [twelvedataKey, setTwelvedataKey] = useState('')
  const [selectedAIProvider, setSelectedAIProvider] = useState<AIProviderChoice>('openai')
  const [aiApiKey, setAiApiKey] = useState('')
  const [aiKeyStatus, setAiKeyStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle')
  const [aiKeyMessage, setAiKeyMessage] = useState('')

  // Derived state based on selected path
  const selectedProvider: MarketDataProvider = setupPath === 'free' ? 'twelvedata' : 'polygon'

  // Update AI provider when path changes
  const handlePathChange = (path: SetupPath) => {
    setSetupPath(path)
    setSelectedAIProvider(path === 'free' ? 'groq' : path === 'premium' ? 'anthropic' : 'openai')
    // Reset AI key status when provider changes
    setAiKeyStatus('idle')
    setAiKeyMessage('')
  }

  // Test AI API key
  const handleTestAIKey = async () => {
    if (!aiApiKey.trim()) return

    setAiKeyStatus('testing')
    setAiKeyMessage('')

    // Map wizard provider to validator provider type
    const providerMap: Record<AIProviderChoice, AIProvider> = {
      openai: 'openai',
      anthropic: 'anthropic',
      groq: 'groq'
    }

    const result = await testAIKey(providerMap[selectedAIProvider], aiApiKey)
    setAiKeyStatus(result.valid ? 'valid' : 'invalid')
    setAiKeyMessage(result.message)
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
      // Save provider choice based on path
      await updateSettings({ marketDataProvider: selectedProvider })
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
      // Save AI provider choice and complete onboarding
      if (aiApiKey) {
        // Map providers to internal names (AIProvider type uses 'claude' not 'anthropic')
        let provider: 'openai' | 'claude' | 'llama' = 'openai'
        let model = 'gpt-4.0-turbo'

        if (selectedAIProvider === 'groq') {
          provider = 'llama'
          model = 'llama-3.3-70b-versatile'
        } else if (selectedAIProvider === 'anthropic') {
          provider = 'claude'
          model = 'claude-sonnet-4-20250514'
        }

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
              <p className="text-gray-400 text-sm mb-1">Step {stepNumber} of {totalSteps}</p>
              <h3 className="text-white text-lg font-medium">Choose Your Setup</h3>
              <p className="text-gray-500 text-sm mt-2">Select a path based on your needs - you can change these later in Settings</p>
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
                      <div className="text-white font-medium">Free Path</div>
                      <span className="text-green-400 text-xs font-medium px-2 py-0.5 bg-green-400/20 rounded">
                        $0/month
                      </span>
                    </div>
                    <div className="text-gray-400 text-sm mt-1">Perfect for learning and exploring</div>
                    <div className="text-gray-500 text-xs mt-2 space-y-1">
                      <div>• TwelveData (800 calls/day free)</div>
                      <div>• Groq AI (Llama 3 - completely free)</div>
                      <div>• RSS News feeds</div>
                    </div>
                  </div>
                </div>
              </button>

              {/* Standard Path */}
              <button
                onClick={() => handlePathChange('standard')}
                className={`w-full p-4 rounded-lg border text-left transition-colors ${
                  setupPath === 'standard'
                    ? 'border-terminal-amber bg-terminal-amber/10'
                    : 'border-terminal-border hover:border-gray-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Star className="w-5 h-5 text-terminal-amber flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="text-white font-medium">Standard Path</div>
                      <span className="text-terminal-amber text-xs font-medium px-2 py-0.5 bg-terminal-amber/20 rounded">
                        Recommended
                      </span>
                    </div>
                    <div className="text-gray-400 text-sm mt-1">Best experience for most traders</div>
                    <div className="text-gray-500 text-xs mt-2 space-y-1">
                      <div>• Polygon via Massive (5 calls/min free)</div>
                      <div>• OpenAI GPT-4 (~$5-20/month usage)</div>
                      <div>• Finnhub News + Economic Calendar</div>
                    </div>
                  </div>
                </div>
              </button>

              {/* Premium Path */}
              <button
                onClick={() => handlePathChange('premium')}
                className={`w-full p-4 rounded-lg border text-left transition-colors ${
                  setupPath === 'premium'
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-terminal-border hover:border-gray-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Crown className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="text-white font-medium">Premium Path</div>
                      <span className="text-purple-400 text-xs font-medium px-2 py-0.5 bg-purple-400/20 rounded">
                        Power User
                      </span>
                    </div>
                    <div className="text-gray-400 text-sm mt-1">Maximum speed & advanced analysis</div>
                    <div className="text-gray-500 text-xs mt-2 space-y-1">
                      <div>• Polygon paid tier (faster, more data)</div>
                      <div>• Anthropic Claude (superior reasoning)</div>
                      <div>• All news sources + Alpha Vantage</div>
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <p className="text-center text-gray-500 text-xs">
              All paths can be customized later in Settings → Data Sources
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
              <p className="text-gray-400 text-sm mb-1">Step {stepNumber} of {totalSteps}</p>
              <h3 className="text-white text-lg font-medium">Choose AI Provider</h3>
              <p className="text-gray-500 text-sm mt-2">Select your AI copilot for trading recommendations</p>
            </div>

            <div className="space-y-3">
              {/* OpenAI Option */}
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
                    <Sparkles className="w-5 h-5 text-terminal-amber flex-shrink-0" />
                    <div>
                      <div className="text-white font-medium">OpenAI (GPT-4)</div>
                      <div className="text-gray-400 text-sm mt-1">Most capable, ~$5-20/month</div>
                    </div>
                  </div>
                  {setupPath === 'standard' && (
                    <span className="text-terminal-amber text-xs font-medium px-2 py-1 bg-terminal-amber/20 rounded">
                      Recommended
                    </span>
                  )}
                </div>
              </button>

              {/* Anthropic Option */}
              <button
                onClick={() => setSelectedAIProvider('anthropic')}
                className={`w-full p-4 rounded-lg border text-left transition-colors ${
                  selectedAIProvider === 'anthropic'
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-terminal-border hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Brain className="w-5 h-5 text-purple-400 flex-shrink-0" />
                    <div>
                      <div className="text-white font-medium">Anthropic (Claude)</div>
                      <div className="text-gray-400 text-sm mt-1">Superior reasoning, ~$10-30/month</div>
                    </div>
                  </div>
                  {setupPath === 'premium' && (
                    <span className="text-purple-400 text-xs font-medium px-2 py-1 bg-purple-400/20 rounded">
                      Premium Pick
                    </span>
                  )}
                </div>
              </button>

              {/* Groq Option */}
              <button
                onClick={() => setSelectedAIProvider('groq')}
                className={`w-full p-4 rounded-lg border text-left transition-colors ${
                  selectedAIProvider === 'groq'
                    ? 'border-green-500 bg-green-500/10'
                    : 'border-terminal-border hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <div>
                      <div className="text-white font-medium">Groq (Llama 3)</div>
                      <div className="text-gray-400 text-sm mt-1">Fast inference, completely free</div>
                    </div>
                  </div>
                  {setupPath === 'free' && (
                    <span className="text-green-400 text-xs font-medium px-2 py-1 bg-green-400/20 rounded">
                      Free
                    </span>
                  )}
                </div>
              </button>
            </div>

            {/* API Key Input with Test Button */}
            <div className="space-y-2">
              <label className="text-gray-400 text-sm">
                {selectedAIProvider === 'openai' ? 'OpenAI API Key' : selectedAIProvider === 'anthropic' ? 'Anthropic API Key' : 'Groq API Key'}
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => {
                    setAiApiKey(e.target.value)
                    setAiKeyStatus('idle')
                    setAiKeyMessage('')
                  }}
                  placeholder={selectedAIProvider === 'openai' ? 'sk-...' : selectedAIProvider === 'anthropic' ? 'sk-ant-...' : 'gsk_...'}
                  className={`flex-1 bg-terminal-bg border rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none transition-colors ${
                    aiKeyStatus === 'valid' ? 'border-terminal-up' :
                    aiKeyStatus === 'invalid' ? 'border-terminal-down' :
                    'border-terminal-border focus:border-terminal-amber'
                  }`}
                />
                <button
                  onClick={handleTestAIKey}
                  disabled={!aiApiKey.trim() || aiKeyStatus === 'testing'}
                  className={`px-4 py-3 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                    aiKeyStatus === 'testing'
                      ? 'bg-terminal-border text-gray-400 cursor-wait'
                      : aiKeyStatus === 'valid'
                      ? 'bg-terminal-up/20 text-terminal-up border border-terminal-up/30'
                      : aiKeyStatus === 'invalid'
                      ? 'bg-terminal-down/20 text-terminal-down border border-terminal-down/30'
                      : 'bg-terminal-amber/20 text-terminal-amber hover:bg-terminal-amber/30 border border-terminal-amber/30'
                  }`}
                >
                  {aiKeyStatus === 'testing' ? (
                    <><Loader2 size={14} className="animate-spin" /> Testing...</>
                  ) : aiKeyStatus === 'valid' ? (
                    <><CheckCircle2 size={14} /> Valid</>
                  ) : aiKeyStatus === 'invalid' ? (
                    <><XCircle size={14} /> Invalid</>
                  ) : (
                    'Test'
                  )}
                </button>
              </div>
              {aiKeyMessage && (
                <p className={`text-xs ${aiKeyStatus === 'valid' ? 'text-terminal-up' : 'text-terminal-down'}`}>
                  {aiKeyMessage}
                </p>
              )}
              <p className="text-gray-500 text-xs">
                {selectedAIProvider === 'openai'
                  ? 'Get your key at platform.openai.com/api-keys'
                  : selectedAIProvider === 'anthropic'
                  ? 'Get your key at console.anthropic.com/settings/keys'
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
                    ← Back
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
