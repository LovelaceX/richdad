import { BarChart3, TrendingUp, ExternalLink } from 'lucide-react'
import { ApiKeyInput } from './ApiKeyInput'

interface WizardStepProps {
  stepNumber: number
  totalSteps: number
  provider: 'alpha-vantage' | 'finnhub'
  apiKey: string
  onApiKeyChange: (value: string) => void
}

const PROVIDER_CONFIG = {
  'alpha-vantage': {
    name: 'Alpha Vantage',
    icon: BarChart3,
    description: 'Free API for real-time stock quotes and market data',
    signupUrl: 'https://www.alphavantage.co/support/#api-key',
    instructions: [
      'Visit alphavantage.co and click "Get Free API Key"',
      'Fill out the simple registration form',
      'Copy your API key and paste it below',
      'Free tier: 25 calls/day (we cache data efficiently)',
    ],
    freeTier: '25 calls/day, 5 calls/minute',
    budgetNote: 'Sufficient for hourly quote updates + 1 chart per day',
  },
  'finnhub': {
    name: 'Finnhub',
    icon: TrendingUp,
    description: 'Alternative market data provider with higher rate limits',
    signupUrl: 'https://finnhub.io/register',
    instructions: [
      'Visit finnhub.io and click "Get free API key"',
      'Create an account (email verification required)',
      'Copy your API token from the dashboard',
      'Free tier: 60 calls/minute (more flexible than Alpha Vantage)',
    ],
    freeTier: '60 calls/minute',
    budgetNote: 'Automatic fallback when Alpha Vantage budget exhausted',
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
    <div className="space-y-6">
      {/* Step Progress */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-terminal-amber font-medium">
          Step {stepNumber} of {totalSteps}:
        </span>
        <span className="text-gray-400">Configure {config.name}</span>
      </div>

      {/* Provider Info */}
      <div className="flex items-start gap-3">
        <div className="p-3 bg-terminal-bg border border-terminal-border rounded">
          <Icon className="w-6 h-6 text-terminal-amber" />
        </div>
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
    </div>
  )
}
