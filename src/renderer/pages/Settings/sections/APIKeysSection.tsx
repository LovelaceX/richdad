/**
 * APIKeysSection
 *
 * Settings section for configuring market data API providers.
 * Simplified architecture: TwelveData (free) or Polygon (paid)
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

// Map settings key to provider value for auto-default
const KEY_TO_PROVIDER: Record<string, 'polygon' | 'twelvedata'> = {
  polygonApiKey: 'polygon',
  twelvedataApiKey: 'twelvedata',
}

export function APIKeysSection({ settings, onSave }: APIKeysSectionProps) {
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false)
  const [showProConfirmModal, setShowProConfirmModal] = useState(false)
  const currentPlan = settings.plan || 'free'

  // Get list of configured API keys
  const getConfiguredProviders = (overrides: Partial<UserSettings> = {}) => {
    const merged = { ...settings, ...overrides }
    const configured: Array<'polygon' | 'twelvedata'> = []

    if (merged.polygonApiKey) configured.push('polygon')
    if (merged.twelvedataApiKey) configured.push('twelvedata')

    return configured
  }

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
      polygon: limits.polygon,
      twelveData: limits.twelveData,
      finnhub: limits.finnhub,
    })

    // If switching to free, recommend TwelveData
    if (plan === 'free' && settings.marketDataProvider === 'polygon') {
      await onSave({ plan, marketDataProvider: 'twelvedata' })
    }

    console.log(`[APIKeys] Plan changed to ${plan}, tier limits updated:`, limits)
  }

  // Handler for API key changes with auto-save and auto-default
  const handleKeyChange = (key: keyof UserSettings) => async (value: string) => {
    const updates: Partial<UserSettings> = { [key]: value }

    // Check if this is the only configured API key - if so, auto-set as default
    const configuredAfter = getConfiguredProviders(updates)
    const provider = KEY_TO_PROVIDER[key]

    if (configuredAfter.length === 1 && provider && value) {
      // Only one provider configured, auto-select it as default
      updates.marketDataProvider = provider
      console.log(`[APIKeys] Auto-selecting ${provider} as default (only configured provider)`)
    }

    await onSave(updates)
    // Notify heartbeat service to refresh data immediately
    window.dispatchEvent(new Event('api-settings-updated'))
  }

  return (
    <div>
      <h2 className="text-white text-lg font-medium mb-1">Market Data</h2>
      <p className="text-gray-500 text-sm mb-6">Configure market data providers for quotes and charts</p>

      {/* Plan Toggle - Free / Pro */}
      <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Crown className="w-4 h-4 text-terminal-amber" />
          <span className="text-white text-sm font-medium">Your Plan</span>
          <HelpTooltip content="Free uses conservative API limits to stay within free tiers. Pro unlocks higher rate limits for paid API subscriptions." />
        </div>

        <p className="text-gray-400 text-xs mb-4">
          Select your plan to optimize rate limits. Free uses conservative limits, Pro unlocks unlimited API calls.
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
              <span className="text-terminal-amber font-medium">Free Plan:</span> TwelveData (800 calls/day), Local AI (Ollama), RSS News
            </div>
          ) : (
            <div className="text-gray-400">
              <span className="text-terminal-amber font-medium">Pro Plan:</span> Polygon (unlimited), Local AI (Ollama), All news sources
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

        {/* Default Market Data Provider */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-terminal-amber" />
            <span className="text-white text-sm font-medium">Default Market Data Provider</span>
            <HelpTooltip content="Primary source for stock quotes and charts. TwelveData is free (800/day), Polygon requires paid subscription but offers real-time WebSocket." />
          </div>

          <p className="text-gray-400 text-xs mb-4">
            Choose which provider to use for market data. TwelveData is recommended for Free plan users.
          </p>

          <select
            value={settings.marketDataProvider || 'twelvedata'}
            onChange={(e) =>
              onSave({
                marketDataProvider: e.target.value as 'polygon' | 'twelvedata',
              })
            }
            className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-terminal-amber/50"
          >
            <option value="twelvedata">TwelveData (800/day free - Recommended for Free plan)</option>
            <option value="polygon">Polygon (Unlimited - Recommended for Pro plan)</option>
          </select>
        </div>

        <div className="border-t border-terminal-border" />

        {/* TwelveData - Recommended for free users */}
        <APIKeyProvider
          provider="twelvedata"
          label="TwelveData"
          icon={TrendingUp}
          description="Real-time data, all US markets. Best free tier for retail traders."
          currentKey={settings.twelvedataApiKey}
          onKeyChange={handleKeyChange('twelvedataApiKey')}
          signupUrl="https://twelvedata.com/register"
          signupText="Get free TwelveData API key"
          badge={currentPlan === 'free' ? { text: 'Recommended', color: 'amber' } : undefined}
          placeholder="Your TwelveData API key"
          rateLimitInfo={currentPlan === 'free' ? 'Free: 800 calls/day, 8/min' : 'Pro: Unlimited calls'}
          noKeyMessage="No API key configured"
        />

        <div className="border-t border-terminal-border" />

        {/* Polygon - For paid users */}
        <APIKeyProvider
          provider="polygon"
          label="Polygon.io"
          icon={BarChart3}
          description="Unlimited calls with paid subscription. Best for active traders."
          currentKey={settings.polygonApiKey}
          onKeyChange={handleKeyChange('polygonApiKey')}
          signupUrl="https://polygon.io/dashboard/signup"
          signupText="Get Polygon API key"
          badge={currentPlan === 'pro' ? { text: 'Recommended', color: 'amber' } : { text: 'Paid', color: 'purple' }}
          placeholder="Your Polygon API key"
          rateLimitInfo={currentPlan === 'free' ? 'Free: 5/min (limited)' : 'Pro: Unlimited • Real-time WebSocket'}
          noKeyMessage="No API key configured"
        />

        {/* Info about Finnhub */}
        <div className="bg-terminal-bg/50 border border-terminal-border/50 rounded-lg p-4">
          <p className="text-gray-400 text-xs">
            <span className="text-terminal-amber font-medium">Looking for Economic Calendar or News?</span>
            <br />
            Configure your Finnhub API key in Settings → News Sources to enable Economic Calendar and ticker-specific news.
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
            </ul>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6">
              <p className="text-red-400 text-xs font-medium mb-1">
                Important: Paid API keys required
              </p>
              <p className="text-gray-400 text-xs">
                Make sure you have paid API subscriptions (TwelveData Pro, Polygon, etc.).
                Free-tier API keys will hit rate limits and cause errors.
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
                I have paid API keys
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
