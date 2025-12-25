import { BarChart3, ExternalLink, Database } from 'lucide-react'
import { ApiKeyInput } from './ApiKeyInput'

interface WizardStepProps {
  stepNumber: number
  totalSteps: number
  provider: 'twelvedata' | 'polygon'
  apiKey: string
  onApiKeyChange: (value: string) => void
}

const PROVIDER_CONFIG = {
  'polygon': {
    name: 'Massive.com (Polygon.io)',
    icon: Database,
    description: 'Professional market data with 2 years of history',
    signupUrl: 'https://massive.com/dashboard/signup',
    instructions: [
      'Visit massive.com/dashboard/signup',
      'Create an account or sign in with Google',
      'Click "API Keys" in your dashboard',
      'Copy your API key and paste it below',
    ],
    freeTier: '5 calls/min, EOD data, 2 years history',
    budgetNote: 'Best for charts and historical analysis. Reliable EOD data.',
  },
  'twelvedata': {
    name: 'TwelveData',
    icon: BarChart3,
    description: 'Real-time data for all US markets with generous free tier',
    signupUrl: 'https://twelvedata.com/register',
    instructions: [
      'Visit twelvedata.com/register',
      'Enter your details or sign up with Google/Apple',
      'Under "Current plan", click "API keys"',
      'Click "Reveal" and copy your key',
    ],
    freeTier: '800 calls/day, real-time data',
    budgetNote: 'Best free tier for real-time data. Great for live trading.',
  },
}

export function WizardStep({
  stepNumber,
  totalSteps,
  provider,
  apiKey,
  onApiKeyChange,
}: WizardStepProps) {
  const config = PROVIDER_CONFIG[provider]
  const Icon = config.icon

  return (
    <div className="space-y-4">
      {/* Step Progress */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-terminal-amber font-medium">
          Step {stepNumber} of {totalSteps}:
        </span>
        <span className="text-gray-400">Configure {config.name}</span>
      </div>

      {/* Provider Info */}
      <div className="flex items-start gap-3">
        <Icon className="w-6 h-6 text-terminal-amber flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-white text-lg font-medium">{config.name}</h3>
          <p className="text-gray-400 text-sm mt-1">{config.description}</p>
          <p className="text-gray-500 text-xs mt-2">
            Free tier: {config.freeTier}
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-terminal-bg border border-terminal-border rounded-lg p-4">
        <h4 className="text-white text-sm font-medium mb-3">
          Setup Instructions:
        </h4>
        <ol className="space-y-2">
          {config.instructions.map((instruction, index) => (
            <li key={index} className="flex gap-3 text-sm">
              <span className="text-terminal-amber font-mono flex-shrink-0">
                {index + 1}.
              </span>
              <span className="text-gray-300">{instruction}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Signup Link */}
      <a
        href={config.signupUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-terminal-amber hover:text-amber-400 transition-colors text-sm"
      >
        <ExternalLink size={16} />
        <span>Get your free {config.name} API key</span>
      </a>

      {/* API Key Input */}
      <ApiKeyInput
        provider={provider}
        value={apiKey}
        onChange={onApiKeyChange}
        placeholder={`Paste your ${config.name} API key here`}
      />

      {/* Budget Note */}
      <div className="bg-terminal-bg border border-terminal-border rounded p-3">
        <p className="text-gray-400 text-xs">
          <span className="text-terminal-amber">Note:</span> {config.budgetNote}
        </p>
      </div>

      {/* Rate Limit Warning for TwelveData */}
      {provider === 'twelvedata' && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-3">
          <p className="text-yellow-400 text-xs">
            <span className="font-medium">Rate limit:</span> Free tier allows 8 API calls per minute.
            You may briefly see rate limit messages while initial data loads — this is normal and will resolve quickly.
          </p>
        </div>
      )}
    </div>
  )
}
