/**
 * APIKeysSection
 *
 * Settings section for configuring market data API providers.
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
  type FinnhubTier,
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

const FINNHUB_TIERS: TierOption[] = [
  { value: 'free', label: 'Free (60 calls/min)' },
  { value: 'premium', label: 'Premium (300 calls/min)' },
]

// Map settings key to provider value for auto-default
const KEY_TO_PROVIDER: Record<string, 'polygon' | 'alphavantage' | 'twelvedata' | 'finnhub' | 'fasttrack'> = {
  polygonApiKey: 'polygon',
  alphaVantageApiKey: 'alphavantage',
  twelvedataApiKey: 'twelvedata',
  finnhubApiKey: 'finnhub',
  fasttrackApiKey: 'fasttrack',
}

export function APIKeysSection({ settings, onSave }: APIKeysSectionProps) {
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false)

  // Get list of configured API keys
  const getConfiguredProviders = (overrides: Partial<UserSettings> = {}) => {
    const merged = { ...settings, ...overrides }
    const configured: Array<'polygon' | 'alphavantage' | 'twelvedata' | 'finnhub' | 'fasttrack'> = []

    if (merged.polygonApiKey) configured.push('polygon')
    if (merged.alphaVantageApiKey) configured.push('alphavantage')
    if (merged.twelvedataApiKey) configured.push('twelvedata')
    if (merged.finnhubApiKey) configured.push('finnhub')
    if (merged.fasttrackApiKey) configured.push('fasttrack')

    return configured
  }

  // Handler to update API tier and sync with budget tracker
  const handleTierChange = async (
    provider: 'polygon' | 'alphaVantage' | 'twelveData' | 'finnhub',
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
      finnhub: newTiers.finnhub as FinnhubTier,
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
      <h2 className="text-white text-lg font-medium mb-1">API Keys</h2>
      <p className="text-gray-500 text-sm mb-6">Configure market data providers</p>

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
            Choose which provider to use for market data. Others will be used as fallbacks.
          </p>

          <select
            value={settings.marketDataProvider || 'polygon'}
            onChange={(e) =>
              onSave({
                marketDataProvider: e.target.value as
                  | 'polygon'
                  | 'alphavantage'
                  | 'finnhub'
                  | 'fasttrack'
                  | 'twelvedata',
              })
            }
            className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-terminal-amber/50"
          >
            <option value="polygon">Massive.com (Recommended - 5/min, EOD data)</option>
            <option value="twelvedata">TwelveData (800/day, real-time, all US markets)</option>
            <option value="alphavantage">Alpha Vantage (25 calls/day, real-time)</option>
            <option value="finnhub">Finnhub (60 calls/min)</option>
            <option value="fasttrack">FastTrack.net (2K/month, 37yr history, analytics)</option>
          </select>
        </div>

        <div className="border-t border-terminal-border" />

        {/* Massive.com (Polygon.io) */}
        <APIKeyProvider
          provider="polygon"
          label="Massive.com (Polygon.io)"
          icon={BarChart3}
          description="EOD & historical data. Best for charts and backtesting."
          currentKey={settings.polygonApiKey}
          onKeyChange={handleKeyChange('polygonApiKey')}
          signupUrl="https://massive.com/dashboard/signup"
          signupText="Get free Massive.com API key"
          badge={{ text: 'Recommended', color: 'amber' }}
          placeholder="e.g., abc123xyz456"
          rateLimitInfo="Free tier: 5 calls/min • 2 years historical • EOD data • Best for charts"
          noKeyMessage="No API key configured"
          tierOptions={POLYGON_TIERS}
          currentTier={settings.apiTiers?.polygon || 'free'}
          onTierChange={(tier) => handleTierChange('polygon', tier)}
        />

        <div className="border-t border-terminal-border" />

        {/* TwelveData */}
        <APIKeyProvider
          provider="twelvedata"
          label="TwelveData"
          icon={TrendingUp}
          description="Real-time data, all US markets."
          currentKey={settings.twelvedataApiKey}
          onKeyChange={handleKeyChange('twelvedataApiKey')}
          signupUrl="https://twelvedata.com/register"
          signupText="Get free TwelveData API key"
          badge={{ text: 'Recommended', color: 'amber' }}
          placeholder="Your TwelveData API key"
          rateLimitInfo="Limit based on tier selection • All US markets supported"
          noKeyMessage="No API key configured - using fallback providers"
          tierOptions={TWELVEDATA_TIERS}
          currentTier={settings.apiTiers?.twelveData || 'free'}
          onTierChange={(tier) => handleTierChange('twelveData', tier)}
        />

        <div className="border-t border-terminal-border" />

        {/* Alpha Vantage */}
        <APIKeyProvider
          provider="alphaVantage"
          label="Alpha Vantage (Market Data)"
          icon={BarChart3}
          description="Free API for real-time stock quotes."
          currentKey={settings.alphaVantageApiKey}
          onKeyChange={handleKeyChange('alphaVantageApiKey')}
          signupUrl="https://www.alphavantage.co/support/#api-key"
          signupText="Get free Alpha Vantage API key"
          placeholder="e.g., KXZZ8Y7YJAZMNA41"
          rateLimitInfo="Free tier: 25 calls/day • We cache data for 1 hour to stay within limits"
          noKeyMessage="No API key configured - using mock data"
        />

        <div className="border-t border-terminal-border" />

        {/* Finnhub */}
        <APIKeyProvider
          provider="finnhub"
          label="Finnhub"
          icon={TrendingUp}
          description="Alternative market data provider with real-time news."
          currentKey={settings.finnhubApiKey}
          onKeyChange={handleKeyChange('finnhubApiKey')}
          signupUrl="https://finnhub.io/register"
          signupText="Get free Finnhub API key"
          placeholder="e.g., abc123xyz456"
          rateLimitInfo="Limit based on tier selection • Automatic fallback when other providers exhausted"
          noKeyMessage="No API key configured - Alpha Vantage used as primary"
          tierOptions={FINNHUB_TIERS}
          currentTier={settings.apiTiers?.finnhub || 'free'}
          onTierChange={(tier) => handleTierChange('finnhub', tier)}
        />

        <div className="border-t border-terminal-border" />

        {/* FastTrack.net */}
        <APIKeyProvider
          provider="fasttrack"
          label="FastTrack.net"
          icon={TrendingUp}
          description="40,000+ securities with 37 years of history. Risk metrics: Sharpe, Sortino, Alpha, Beta."
          currentKey={settings.fasttrackApiKey}
          onKeyChange={handleKeyChange('fasttrackApiKey')}
          signupUrl="https://app.fasttrack.net/"
          signupText="Get free FastTrack API key (2,000 credits/month)"
          badge={{ text: 'Portfolio Analytics', color: 'purple' }}
          placeholder="Your FastTrack API key"
          rateLimitInfo="Free tier: 2,000 API calls/month • 37 years historical data • Risk analytics"
          noKeyMessage="No API key configured"
          signupInstructions={[
            'Sign up at <a href="https://app.fasttrack.net/" target="_blank" rel="noopener noreferrer" class="text-terminal-amber hover:underline">app.fasttrack.net</a>',
            'Navigate to API Keys section in your dashboard',
            'Generate a new API key',
          ]}
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
      </div>

      {/* Onboarding Wizard Modal */}
      <OnboardingWizard
        isOpen={showOnboardingWizard}
        onClose={() => setShowOnboardingWizard(false)}
      />
    </div>
  )
}
