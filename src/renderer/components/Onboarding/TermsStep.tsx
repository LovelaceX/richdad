import { FileText, CheckCircle2, Shield, Lock, Eye, Server } from 'lucide-react'

interface TermsStepProps {
  stepNumber: number
  totalSteps: number
  accepted: boolean
  onAcceptChange: (accepted: boolean) => void
}

export function TermsStep({ stepNumber, totalSteps, accepted, onAcceptChange }: TermsStepProps) {
  return (
    <div className="space-y-4">
      {/* Step Progress */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-terminal-amber font-medium">
          Step {stepNumber} of {totalSteps}:
        </span>
        <span className="text-gray-400">Terms & Conditions</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-3">
        <FileText className="w-6 h-6 text-terminal-amber flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-white text-lg font-medium">Terms & Conditions</h3>
          <p className="text-gray-400 text-sm mt-1">
            Please review and accept our terms before continuing
          </p>
        </div>
      </div>

      {/* Terms Content */}
      <div className="bg-terminal-bg border border-terminal-border rounded-lg p-4 max-h-[400px] overflow-y-auto">
        <div className="space-y-4 text-sm text-gray-300">
          <div>
            <h4 className="text-white font-medium mb-2">1. Acceptance of Terms</h4>
            <p className="text-gray-400">
              By using RichDad, you agree to these terms and conditions. This software is provided "as is"
              without warranty of any kind. Trading involves risk and you should never invest more than you
              can afford to lose.
            </p>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">2. Investment Disclaimer</h4>
            <p className="text-gray-400">
              RichDad is an informational tool and does not provide financial advice. All AI-generated
              recommendations are for educational purposes only. You are solely responsible for your trading
              decisions. Past performance does not guarantee future results.
            </p>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">3. API Keys & Privacy</h4>
            <p className="text-gray-400">
              Your API keys are stored locally on your device using IndexedDB. We never transmit your keys
              to external servers. You are responsible for keeping your API keys secure and complying with
              each provider's terms of service.
            </p>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">4. Data Usage</h4>
            <p className="text-gray-400">
              RichDad operates in a local-first manner. Market data and news are fetched from your configured
              API providers. We do not collect, store, or share your trading data, decisions, or personal
              information on any remote servers.
            </p>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">5. Risk Acknowledgment</h4>
            <p className="text-gray-400">
              Trading stocks, options, and other financial instruments involves substantial risk of loss.
              You acknowledge that you understand these risks and that RichDad's AI recommendations should
              not be your sole basis for making investment decisions.
            </p>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">6. Limitation of Liability</h4>
            <p className="text-gray-400">
              The developers of RichDad shall not be liable for any direct, indirect, incidental, special,
              or consequential damages arising from your use of this software, including but not limited to
              financial losses.
            </p>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">7. License</h4>
            <p className="text-gray-400">
              RichDad is provided under the MIT License. You are free to use, modify, and distribute this
              software in accordance with the license terms. See the LICENSE file for complete details.
            </p>
          </div>

          <div>
            <h4 className="text-white font-medium mb-2">8. Updates & Changes</h4>
            <p className="text-gray-400">
              We reserve the right to modify these terms at any time. Continued use of RichDad after
              changes constitutes acceptance of the updated terms.
            </p>
          </div>
        </div>
      </div>

      {/* Privacy Highlights */}
      <div className="bg-terminal-up/5 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-terminal-up" />
          <span className="text-terminal-up text-sm font-medium">Privacy Promise</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-start gap-2">
            <Lock className="w-3.5 h-3.5 text-terminal-up mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white text-xs font-medium">No Ads, No Trackers</p>
              <p className="text-gray-500 text-xs">Ever. Period.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Eye className="w-3.5 h-3.5 text-terminal-up mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white text-xs font-medium">Your Trades Are Yours</p>
              <p className="text-gray-500 text-xs">Local storage only</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Server className="w-3.5 h-3.5 text-terminal-up mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white text-xs font-medium">No Cloud Servers</p>
              <p className="text-gray-500 text-xs">Data stays on your machine</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Shield className="w-3.5 h-3.5 text-terminal-up mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-white text-xs font-medium">No Crowdsourcing</p>
              <p className="text-gray-500 text-xs">Your strategy stays private</p>
            </div>
          </div>
        </div>
      </div>

      {/* Acceptance Checkbox */}
      <div>
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="relative flex-shrink-0 mt-0.5">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => onAcceptChange(e.target.checked)}
              className="w-5 h-5 bg-terminal-bg border-2 border-terminal-border rounded cursor-pointer
                       accent-[#FFB000] checked:bg-[#FFB000] checked:border-[#FFB000]
                       focus:outline-none focus:ring-2 focus:ring-terminal-amber focus:ring-offset-2 focus:ring-offset-terminal-panel
                       transition-colors appearance-none"
              style={{ backgroundColor: accepted ? '#FFB000' : undefined }}
            />
            {accepted && (
              <CheckCircle2 className="absolute inset-0 w-5 h-5 text-black pointer-events-none" />
            )}
          </div>
          <div className="flex-1">
            <span className={`text-sm font-medium transition-colors ${
              accepted ? 'text-terminal-amber' : 'text-white group-hover:text-terminal-amber'
            }`}>
              I have read and agree to the Terms & Conditions
            </span>
            <p className="text-gray-500 text-xs mt-1">
              You must accept the terms to continue using RichDad
            </p>
          </div>
        </label>
      </div>

      {/* Additional Info */}
      <p className="text-gray-500 text-xs">
        <span className="text-terminal-amber">Note:</span> By accepting, you confirm that you understand
        the risks of trading and that RichDad is for informational purposes only.
      </p>
    </div>
  )
}
