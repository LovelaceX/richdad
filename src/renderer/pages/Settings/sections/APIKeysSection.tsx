/**
 * APIKeysSection
 *
 * Settings section for configuring Tiingo market data API.
 * Single provider architecture for simplicity.
 */

import { useState } from 'react'
import { BarChart3, TrendingUp, Crown, Leaf, AlertTriangle } from 'lucide-react'
import type { UserSettings } from '../../../lib/db'
import { HelpTooltip } from '../../../components/common'
import { getTierLimitsFromPlan, setPlan } from '../../../lib/db'
import { APIKeyProvider } from '../components/APIKeyProvider'
import { APIBudgetMeter } from '../../../components/Settings/APIBudgetMeter'
import { OnboardingWizard } from '../../../components/Onboarding/OnboardingWizard'
import { updateTierSettings } from '../../../../services/apiBudgetTracker'

interface APIKeysSectionProps {
  settings: UserSettings
  onSave: (updates: Partial<UserSettings>) => Promise<void>
}

export function APIKeysSection({ settings, onSave }: APIKeysSectionProps) {
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false)
  const [showProConfirmModal, setShowProConfirmModal] = useState(false)
  const currentPlan = settings.plan || 'free'

  // Handler when user clicks a plan button
  const handlePlanClick = (plan: 'free' | 'pro') => {
    if (plan === 'pro' && currentPlan === 'free') {
      // Show confirmation modal when upgrading to Pro
      setShowProConfirmModal(true)
    } else {
      // Direct switch (Pro -> Free or same plan)
      confirmPlanChange(plan)
    }
  }

  // Actually change the plan (after confirmation if needed)
  const confirmPlanChange = async (plan: 'free' | 'pro') => {
    setShowProConfirmModal(false)

    // Use setPlan to update DB and emit 'plan-changed' event
    // This will trigger marketStore and settingsStore to update their limits
    await setPlan(plan)

    // Also update local settings state for UI
    await onSave({ plan })

    // Get derived tier limits and sync with budget tracker
    const limits = getTierLimitsFromPlan(plan)
    updateTierSettings({
      tiingo: limits.tiingo,
    })

    console.log(`[APIKeys] Plan changed to ${plan}, tier limits updated:`, limits)
  }

  // Handler for API key changes with auto-save
  const handleKeyChange = async (value: string) => {
    await onSave({ tiingoApiKey: value })
    // Notify heartbeat service to refresh data immediately
    window.dispatchEvent(new Event('api-settings-updated'))
  }

  return (
    <div>
      <h2 className="text-white text-lg font-medium mb-1">Market Data</h2>
      <p className="text-gray-500 text-sm mb-6">Configure Tiingo API for real-time quotes and charts</p>

      {/* Plan Toggle - Free / Pro */}
      <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Crown className="w-4 h-4 text-terminal-amber" />
          <span className="text-white text-sm font-medium">Your Plan</span>
          <HelpTooltip content="Free uses Tiingo Starter tier (50 tickers/hour). Pro unlocks Power tier (5,000 tickers/hour) for active traders." />
        </div>

        <p className="text-gray-400 text-xs mb-4">
          Select your plan to optimize rate limits. Free uses Tiingo Starter limits, Pro uses Power tier limits.
        </p>

        <div className="flex bg-terminal-bg rounded-lg p-1">
          <button
            onClick={() => handlePlanClick('free')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              currentPlan === 'free'
                ? 'bg-terminal-amber text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Leaf size={14} />
            Free
          </button>
          <button
            onClick={() => handlePlanClick('pro')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              currentPlan === 'pro'
                ? 'bg-terminal-amber text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Crown size={14} />
            Pro
          </button>
        </div>

        {/* Plan Description */}
        <div className="mt-4 text-xs">
          {currentPlan === 'free' ? (
            <div className="text-gray-400">
              <span className="text-terminal-amber font-medium">Free Plan:</span> Tiingo Starter (50/hour), Local AI (Ollama), RSS News
            </div>
          ) : (
            <div className="text-gray-400">
              <span className="text-terminal-amber font-medium">Pro Plan:</span> Tiingo Power (5,000/hour), Local AI (Ollama), All news sources
            </div>
          )}
        </div>
      </div>

      {/* Setup Wizard Button */}
      <button
        onClick={() => setShowOnboardingWizard(true)}
        className="w-full bg-terminal-bg border border-terminal-border rounded-lg px-4 py-3 text-white hover:border-terminal-amber transition-colors mb-6 flex items-center justify-center gap-2"
      >
        <BarChart3 className="w-4 h-4 text-terminal-amber" />
        <span className="text-sm font-medium">Setup Wizard</span>
      </button>

      <div className="space-y-6">
        {/* API Budget Meter */}
        <APIBudgetMeter />

        <div className="border-t border-terminal-border" />

        {/* Tiingo API Key */}
        <APIKeyProvider
          provider="tiingo"
          label="Tiingo"
          icon={TrendingUp}
          description="Real-time IEX data, 30+ years historical. Best value for retail traders."
          currentKey={settings.tiingoApiKey}
          onKeyChange={handleKeyChange}
          signupUrl="https://www.tiingo.com"
          signupText="Sign up for free Tiingo account"
          badge={{ text: 'Recommended', color: 'amber' }}
          placeholder="Your Tiingo API key"
          rateLimitInfo={currentPlan === 'free' ? 'Starter: 50 tickers/hour' : 'Power: 5,000 tickers/hour ($10/mo)'}
          noKeyMessage="No API key configured"
          signupInstructions={[
            'Go to <a href="https://www.tiingo.com" target="_blank" class="text-terminal-amber hover:underline">tiingo.com</a> and click "Sign Up"',
            'Fill in your details and confirm your email',
            'Once logged in, click your username (top-right) → select "Token"',
            'Copy your API token and paste below',
          ]}
        />

        {/* Pro plan info */}
        <div className="bg-terminal-bg/50 border border-terminal-border/50 rounded-lg p-4">
          <p className="text-gray-400 text-xs">
            <span className="text-terminal-amber font-medium">Pro Plan Benefits</span>
            <br />
            Tiingo Power tier ($10/mo) gives you 5,000 unique tickers per hour, perfect for active traders and AI backtesting with 30+ years of dividend-adjusted historical data.
          </p>
        </div>
      </div>

      {/* Onboarding Wizard Modal */}
      <OnboardingWizard
        isOpen={showOnboardingWizard}
        onClose={() => setShowOnboardingWizard(false)}
      />

      {/* Pro Plan Confirmation Modal */}
      {showProConfirmModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-terminal-panel border border-terminal-border rounded-lg p-6 w-96 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-terminal-amber/20 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-terminal-amber" />
              </div>
              <h3 className="text-white text-lg font-medium">Switch to Pro Path?</h3>
            </div>

            <p className="text-gray-300 text-sm mb-4">
              Pro Path removes all app limitations:
            </p>

            <ul className="text-gray-400 text-sm space-y-2 mb-4">
              <li className="flex items-center gap-2">
                <span className="text-terminal-amber">•</span>
                <span>Watchlist: 5 → <span className="text-white">20 symbols</span></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-terminal-amber">•</span>
                <span>Polling: 60s → <span className="text-white">30s interval</span></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-terminal-amber">•</span>
                <span>Backtests: 5/day → <span className="text-white">Unlimited</span></span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-terminal-amber">•</span>
                <span>API Limit: 50/hr → <span className="text-white">5,000/hr</span></span>
              </li>
            </ul>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6">
              <p className="text-red-400 text-xs font-medium mb-1">
                Important: Tiingo Power subscription recommended
              </p>
              <p className="text-gray-400 text-xs">
                Pro plan works best with Tiingo Power tier ($10/mo) to avoid rate limits.
                Free tier will be rate-limited at 50 tickers/hour.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowProConfirmModal(false)}
                className="flex-1 px-4 py-2 text-gray-400 text-sm hover:text-white transition-colors border border-terminal-border rounded-lg hover:bg-terminal-border/30"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmPlanChange('pro')}
                className="flex-1 px-4 py-2 bg-terminal-amber text-black text-sm font-medium rounded-lg hover:bg-yellow-500 transition-colors"
              >
                Switch to Pro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
