import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { WelcomeStep } from './WelcomeStep'
import { TermsStep } from './TermsStep'
import { WizardStep } from './WizardStep'
import { updateSettings } from '../../lib/db'

interface OnboardingWizardProps {
  isOpen: boolean
  onClose: () => void
}

type WizardStepType = 'welcome' | 'terms' | 'alpha-vantage' | 'finnhub'

export function OnboardingWizard({ isOpen, onClose }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStepType>('welcome')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [alphaVantageKey, setAlphaVantageKey] = useState('')
  const [finnhubKey, setFinnhubKey] = useState('')

  const handleSkip = async () => {
    // Mark onboarding complete even without keys
    await updateSettings({ hasCompletedOnboarding: true })
    onClose()
  }

  const handleContinue = async () => {
    if (currentStep === 'welcome') {
      setCurrentStep('terms')
    } else if (currentStep === 'terms') {
      setCurrentStep('alpha-vantage')
    } else if (currentStep === 'alpha-vantage') {
      // Save Alpha Vantage key (if provided)
      if (alphaVantageKey) {
        await updateSettings({ alphaVantageApiKey: alphaVantageKey })
      }
      setCurrentStep('finnhub')
    } else {
      // Save Finnhub key and complete onboarding
      if (finnhubKey) {
        await updateSettings({ finnhubApiKey: finnhubKey })
      }
      await updateSettings({ hasCompletedOnboarding: true })
      onClose()
    }
  }

  const getStepNumber = () => {
    const stepOrder = { welcome: 1, terms: 2, 'alpha-vantage': 3, finnhub: 4 }
    return stepOrder[currentStep]
  }

  const canContinue = () => {
    if (currentStep === 'terms') {
      return termsAccepted
    }
    return true
  }

  const getButtonText = () => {
    if (currentStep === 'finnhub') return 'Finish'
    return 'Continue'
  }

  const renderStep = () => {
    const totalSteps = 4
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
      case 'alpha-vantage':
        return (
          <WizardStep
            stepNumber={stepNumber}
            totalSteps={totalSteps}
            provider="alpha-vantage"
            apiKey={alphaVantageKey}
            onApiKeyChange={setAlphaVantageKey}
          />
        )
      case 'finnhub':
        return (
          <WizardStep
            stepNumber={stepNumber}
            totalSteps={totalSteps}
            provider="finnhub"
            apiKey={finnhubKey}
            onApiKeyChange={setFinnhubKey}
          />
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
