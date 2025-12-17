import { TrendingUp, Shield, Brain } from 'lucide-react'

interface WelcomeStepProps {
  stepNumber: number
  totalSteps: number
}

export function WelcomeStep({ stepNumber, totalSteps }: WelcomeStepProps) {
  return (
    <div className="space-y-6">
      {/* Step Progress */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-terminal-amber font-medium">
          Step {stepNumber} of {totalSteps}:
        </span>
        <span className="text-gray-400">Welcome</span>
      </div>

      {/* Welcome Header */}
      <div className="text-center py-4">
        <div className="inline-flex items-center justify-center mb-4">
          <img src="/richdad-logo.png" alt="RichDad" className="w-20 h-20 object-contain" />
        </div>
        <h2 className="text-white text-2xl font-semibold mb-2">
          Welcome to RichDad
        </h2>
        <p className="text-gray-400 text-sm max-w-md mx-auto">
          Your AI-powered trading co-pilot for institutional-grade market intelligence
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 gap-4 mt-8">
        <div className="flex items-start gap-3 p-4 bg-terminal-bg border border-terminal-border rounded-lg">
          <div className="p-2 bg-terminal-panel border border-terminal-border rounded">
            <Brain className="w-5 h-5 text-terminal-amber" />
          </div>
          <div>
            <h4 className="text-white text-sm font-medium">AI Co-Pilot</h4>
            <p className="text-gray-400 text-xs mt-1">
              6 AI providers with 15+ models. Get buy/sell/hold recommendations with confidence scoring.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-terminal-bg border border-terminal-border rounded-lg">
          <div className="p-2 bg-terminal-panel border border-terminal-border rounded">
            <TrendingUp className="w-5 h-5 text-terminal-amber" />
          </div>
          <div>
            <h4 className="text-white text-sm font-medium">Real-Time Intelligence</h4>
            <p className="text-gray-400 text-xs mt-1">
              24/7 news from Bloomberg, Reuters, and 20+ sources with FinBERT sentiment analysis.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-terminal-bg border border-terminal-border rounded-lg">
          <div className="p-2 bg-terminal-panel border border-terminal-border rounded">
            <Shield className="w-5 h-5 text-terminal-amber" />
          </div>
          <div>
            <h4 className="text-white text-sm font-medium">Privacy-First</h4>
            <p className="text-gray-400 text-xs mt-1">
              All API keys stored locally. Zero server-side calls. Complete data sovereignty.
            </p>
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="bg-terminal-bg border border-terminal-border rounded p-4 text-center">
        <p className="text-gray-400 text-sm">
          Let's get started by reviewing our terms and setting up your API keys
        </p>
      </div>
    </div>
  )
}
