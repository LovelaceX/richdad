import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { WizardStep } from './WizardStep'
import { updateSettings } from '../../lib/db'

interface OnboardingWizardProps {
  isOpen: boolean
  onClose: () => void
}

type WizardStepType = 'alpha-vantage' | 'finnhub'

export function OnboardingWizard({ isOpen, onClose }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStepType>('alpha-vantage')
  const [alphaVantageKey, setAlphaVantageKey] = useState('')
  const [finnhubKey, setFinnhubKey] = useState('')

  const handleSkip = async () => {
    // Mark onboarding complete even without keys
    await updateSettings({ hasCompletedOnboarding: true })
    onClose()
  }

  const handleContinue = async () => {
    if (currentStep === 'alpha-vantage') {
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

  const stepConfig = {
    'alpha-vantage': {
      stepNumber: 1,
      totalSteps: 2,
      provider: 'alpha-vantage' as const,
      value: alphaVantageKey,
      onChange: setAlphaVantageKey,
    },
    'finnhub': {
      stepNumber: 2,
      totalSteps: 2,
      provider: 'finnhub' as const,
      value: finnhubKey,
      onChange: setFinnhubKey,
    },
  }

  const config = stepConfig[currentStep]

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50"
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
                    API Setup Wizard
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    Configure free market data sources
                  </p>
                </div>
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
                <WizardStep
                  stepNumber={config.stepNumber}
                  totalSteps={config.totalSteps}
                  provider={config.provider}
                  apiKey={config.value}
                  onApiKeyChange={config.onChange}
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-6 border-t border-terminal-border">
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Skip Setup
                </button>

                <button
                  onClick={handleContinue}
                  className="px-6 py-2 bg-terminal-amber text-black rounded font-medium hover:bg-amber-500 transition-colors"
                >
                  {currentStep === 'finnhub' ? 'Finish' : 'Continue'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
