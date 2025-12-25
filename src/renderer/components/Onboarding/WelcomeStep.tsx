import { TrendingUp, Shield, Brain } from 'lucide-react'

// WelcomeStep has no props - it's just the welcome screen without step numbers
export function WelcomeStep() {
  return (
    <div className="space-y-4">
      {/* Welcome Header - no step indicator */}
      <div className="text-center py-2">
        <div className="inline-flex items-center justify-center mb-4">
          <img src="/richdad-logo.png" alt="RichDad" className="w-20 h-20 object-contain" />
        </div>
        <h2 className="text-white text-2xl font-semibold mb-2">
          Welcome to RichDad
        </h2>
        <p className="text-gray-400 text-sm">
          AI-Powered Trading Co-Pilot for Retail Investors
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 gap-4 mt-8">
        <div className="flex items-start gap-3 p-4 bg-terminal-bg border border-terminal-border rounded-lg">
          <Brain className="w-6 h-6 text-terminal-amber flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-white text-sm font-medium">Local AI Co-Pilot</h4>
            <p className="text-gray-400 text-xs mt-1">
              Ollama runs 100% locally. Free, private, uncensored trading recommendations.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-terminal-bg border border-terminal-border rounded-lg">
          <TrendingUp className="w-6 h-6 text-terminal-amber flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-white text-sm font-medium">Real-Time Intelligence</h4>
            <p className="text-gray-400 text-xs mt-1">
              RSS news from 20+ sources with local AI sentiment analysis. Headlines never leave your machine.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-terminal-bg border border-terminal-border rounded-lg">
          <Shield className="w-6 h-6 text-terminal-amber flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-white text-sm font-medium">Privacy-First</h4>
            <p className="text-gray-400 text-xs mt-1">
              All API keys stored locally. Zero server-side calls. Complete data sovereignty.
            </p>
          </div>
        </div>
      </div>

      {/* Note */}
      <div className="text-center">
        <p className="text-gray-400 text-sm">
          Let's get started by reviewing our terms and setting up your API keys
        </p>
      </div>
    </div>
  )
}
