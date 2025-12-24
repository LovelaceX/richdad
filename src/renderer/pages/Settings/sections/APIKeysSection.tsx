/**
 * APIKeysSection
 *
 * Settings section for configuring market data API providers.
 * Simplified architecture: TwelveData (free) or Polygon (paid)
 */

import { useState } from 'react'
import { BarChart3, TrendingUp } from 'lucide-react'
import type { UserSettings } from '../../../lib/db'
import { APIKeyProvider, type TierOption } from '../components/APIKeyProvider'
import { APIBudgetMeter } from '../../../components/Settings/APIBudgetMeter'
import { OnboardingWizard } from '../../../components/Onboarding/OnboardingWizard'
import {
  updateTierSettings,
  type PolygonTier,
  type TwelveDataTier,
} from '../../../../services/apiBudgetTracker'

interface APIKeysSectionProps {
  settings: UserSettings
  onSave: (updates: Partial<UserSettings>) => Promise<void>
}

// Tier options for each provider
const POLYGON_TIERS: TierOption[] = [
  { value: 'free', label: 'Free (5 calls/min)' },
  { value: 'starter', label: 'Starter (100 calls/min)' },
  { value: 'developer', label: 'Developer (1K calls/min)' },
  { value: 'advanced', label: 'Advanced (Unlimited)' },
]

const TWELVEDATA_TIERS: TierOption[] = [
  { value: 'free', label: 'Free (8/min, 800/day)' },
  { value: 'basic', label: 'Basic (30/min, 5K/day)' },
  { value: 'pro', label: 'Pro (80/min, Unlimited daily)' },
]

// Map settings key to provider value for auto-default
const KEY_TO_PROVIDER: Record<string, 'polygon' | 'twelvedata'> = {
  polygonApiKey: 'polygon',
  twelvedataApiKey: 'twelvedata',
}

export function APIKeysSection({ settings, onSave }: APIKeysSectionProps) {
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false)

  // Get list of configured API keys
  const getConfiguredProviders = (overrides: Partial<UserSettings> = {}) => {
    const merged = { ...settings, ...overrides }
    const configured: Array<'polygon' | 'twelvedata'> = []

    if (merged.polygonApiKey) configured.push('polygon')
    if (merged.twelvedataApiKey) configured.push('twelvedata')

    return configured
  }

  // Handler to update API tier and sync with budget tracker
  const handleTierChange = async (
    provider: 'polygon' | 'twelveData',
    tier: string
  ) => {
    const newTiers = {
      ...settings.apiTiers,
      [provider]: tier,
    }

    // Update database
    await onSave({ apiTiers: newTiers as typeof settings.apiTiers })

    // Sync with budget tracker immediately
    updateTierSettings({
      polygon: newTiers.polygon as PolygonTier,
      twelveData: newTiers.twelveData as TwelveDataTier,
    })
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
          </div>

          <p className="text-gray-400 text-xs mb-4">
            Choose which provider to use for market data. TwelveData is recommended for free users.
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
            <option value="twelvedata">TwelveData (800/day free - Recommended)</option>
            <option value="polygon">Polygon (Unlimited - Paid plans)</option>
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
          badge={{ text: 'Recommended', color: 'amber' }}
          placeholder="Your TwelveData API key"
          rateLimitInfo="Free tier: 800 calls/day, 8/min • All US markets supported"
          noKeyMessage="No API key configured"
          tierOptions={TWELVEDATA_TIERS}
          currentTier={settings.apiTiers?.twelveData || 'free'}
          onTierChange={(tier) => handleTierChange('twelveData', tier)}
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
          badge={{ text: 'Paid', color: 'purple' }}
          placeholder="Your Polygon API key"
          rateLimitInfo="Free: 5/min (limited) • Paid: Unlimited • Real-time WebSocket streaming"
          noKeyMessage="No API key configured"
          tierOptions={POLYGON_TIERS}
          currentTier={settings.apiTiers?.polygon || 'free'}
          onTierChange={(tier) => handleTierChange('polygon', tier)}
        />

        <div className="border-t border-terminal-border" />

        {/* FRED (Federal Reserve) */}
        <APIKeyProvider
          provider="fred"
          label="FRED (Federal Reserve Economic Data)"
          icon={BarChart3}
          description="Economic indicators, interest rates, and macro data from the Federal Reserve."
          currentKey={settings.fredApiKey}
          onKeyChange={handleKeyChange('fredApiKey')}
          signupUrl="https://fred.stlouisfed.org/docs/api/api_key.html"
          signupText="Get free FRED API key"
          badge={{ text: 'Economic Data', color: 'blue' }}
          placeholder="Your FRED API key"
          rateLimitInfo="Free: 120 requests/minute • GDP, inflation, unemployment, Fed funds rate"
          noKeyMessage="No API key configured - economic indicators unavailable"
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
    </div>
  )
}
