import { TrendingUp, ExternalLink } from 'lucide-react'
import { ApiKeyInput } from './ApiKeyInput'

interface WizardStepProps {
  stepNumber: number
  totalSteps: number
  apiKey: string
  onApiKeyChange: (value: string) => void
}

const TIINGO_CONFIG = {
  name: 'Tiingo',
  icon: TrendingUp,
  description: 'Real-time IEX data with 30+ years of dividend-adjusted history',
  signupUrl: 'https://www.tiingo.com',
  instructions: [
    'Go to tiingo.com and click "Sign Up"',
    'Fill in your details and confirm your email',
    'Once logged in, click your username (top-right)',
    'Select "Token" from the dropdown menu',
    'Copy your API token and paste below',
  ],
  freeTier: '50 unique tickers/hour, IEX real-time data',
  budgetNote: 'Best value for retail traders. 30+ years of historical data for AI backtesting.',
}

export function WizardStep({
  stepNumber,
  totalSteps,
  apiKey,
  onApiKeyChange,
}: WizardStepProps) {
  const config = TIINGO_CONFIG
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
        provider="tiingo"
        value={apiKey}
        onChange={onApiKeyChange}
        placeholder={`Paste your ${config.name} API token here`}
      />

      {/* Budget Note */}
      <div className="bg-terminal-bg border border-terminal-border rounded p-3">
        <p className="text-gray-400 text-xs">
          <span className="text-terminal-amber">Note:</span> {config.budgetNote}
        </p>
      </div>

      {/* Rate Limit Info */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded p-3">
        <p className="text-blue-400 text-xs">
          <span className="font-medium">Rate limit:</span> Free Starter tier allows 50 unique tickers per hour.
          Upgrade to Power ($10/mo) for 5,000 tickers/hour.
        </p>
      </div>
    </div>
  )
}
