/**
 * AICopilotSection
 *
 * Settings section for AI provider configuration, response style, and budgets.
 */

// React import not needed for JSX in modern TypeScript
import { Cpu, AlertCircle, Check, Search, HelpCircle } from 'lucide-react'
import { MultiProviderManager } from '../../../components/Settings/MultiProviderManager'
import { AIBudgetMeter } from '../../../components/Settings/AIBudgetMeter'
import type {
  UserSettings,
  AISettings,
  AIProviderConfig,
  RecommendationFormat,
} from '../../../lib/db'
import type { ToneType } from '../../../types'

interface AICopilotSectionProps {
  settings: UserSettings
  aiSettings: AISettings
  onSaveSettings: (updates: Partial<UserSettings>) => Promise<void>
  onSaveAISettings: (updates: Partial<AISettings>) => Promise<void>
}

const TONE_DESCRIPTIONS: Record<ToneType, { label: string; example: string }> = {
  conservative: {
    label: 'Conservative',
    example:
      '"Consider waiting for confirmation before entering. Risk/reward ratio suggests caution."',
  },
  aggressive: {
    label: 'Aggressive',
    example:
      '"Strong momentum detected! This could run fast. Consider sizing up on this one."',
  },
  humorous: {
    label: 'Humorous',
    example:
      '"This stock is looking spicier than my grandma\'s salsa. Might want to take a bite"',
  },
  professional: {
    label: 'Professional',
    example:
      '"Technical indicators suggest bullish divergence. Volume supports upward movement."',
  },
}

export function AICopilotSection({
  settings,
  aiSettings,
  onSaveSettings,
  onSaveAISettings,
}: AICopilotSectionProps) {
  const handleProvidersChange = (providers: AIProviderConfig[]) => {
    // Update both legacy and new format for compatibility
    const primary = providers.find((p) => p.priority === 1 && p.enabled)
    onSaveAISettings({
      providers,
      // Keep legacy fields in sync with primary provider
      provider: primary?.provider || aiSettings.provider,
      apiKey: primary?.apiKey || '',
      model: primary?.model,
    })
  }

  return (
    <div>
      <h2 className="text-white text-lg font-medium mb-1">AI Copilot</h2>
      <p className="text-gray-500 text-sm mb-6">
        Configure your AI providers with automatic fallback
      </p>

      <div className="space-y-8">
        {/* Multi-Provider Manager */}
        <MultiProviderManager
          providers={
            aiSettings.providers ||
            (aiSettings.apiKey
              ? [
                  {
                    provider: aiSettings.provider,
                    apiKey: aiSettings.apiKey,
                    model: aiSettings.model,
                    enabled: true,
                    priority: 1,
                  },
                ]
              : [])
          }
          onChange={handleProvidersChange}
        />

        <div className="border-t border-terminal-border" />

        {/* Recommendation Format */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Cpu className="w-4 h-4 text-terminal-amber" />
            <span className="text-white text-sm font-medium">AI Output Settings</span>
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1 block">Recommendation Format</label>
            <select
              value={aiSettings.recommendationFormat || 'standard'}
              onChange={(e) =>
                onSaveAISettings({ recommendationFormat: e.target.value as RecommendationFormat })
              }
              className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-white"
            >
              <option value="standard">Standard (With Sources)</option>
              <option value="concise">Concise (No Sources)</option>
              <option value="detailed">Detailed Analysis</option>
            </select>
            <p className="text-gray-600 text-xs mt-1">
              Control how AI recommendations are formatted and presented
            </p>
          </div>
        </div>

        <div className="border-t border-terminal-border" />

        {/* AI Recommendation Interval */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
          <label className="text-white text-sm block mb-3">Recommendation Interval</label>
          <div className="flex gap-2">
            {([5, 10, 15] as const).map((interval) => (
              <button
                key={interval}
                onClick={() => onSaveAISettings({ recommendationInterval: interval })}
                className={`flex-1 px-4 py-2 rounded transition-colors ${
                  (aiSettings.recommendationInterval ?? 15) === interval
                    ? 'bg-terminal-amber text-terminal-bg'
                    : 'bg-terminal-bg border border-terminal-border text-white hover:bg-terminal-border'
                }`}
              >
                {interval} min
              </button>
            ))}
          </div>
          <p className="text-gray-500 text-xs mt-2">
            How often AI analyzes the market during trading hours (lower = more API usage)
          </p>
        </div>

        {/* Confidence Threshold */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white text-sm">Minimum Confidence Threshold</span>
            <span className="text-terminal-amber font-mono">
              {aiSettings.confidenceThreshold ?? 80}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={aiSettings.confidenceThreshold ?? 80}
            onChange={(e) => onSaveAISettings({ confidenceThreshold: parseInt(e.target.value) })}
            className="w-full accent-terminal-amber"
          />
          <p className="text-gray-500 text-xs mt-2">
            Only show AI recommendations with confidence ≥ {aiSettings.confidenceThreshold ?? 80}%
          </p>
          {(aiSettings.confidenceThreshold ?? 80) < 50 && (
            <p className="text-yellow-500 text-xs mt-1 flex items-center gap-1">
              <AlertCircle size={12} /> Low threshold may show unreliable signals
            </p>
          )}
        </div>

        {/* Options-Aware Suggestions Toggle */}
        <div>
          <h3 className="text-white text-sm font-medium mb-3">Options-Aware Suggestions</h3>
          <label className="flex items-center justify-between p-3 rounded-lg border border-terminal-border hover:border-gray-600 cursor-pointer">
            <div>
              <span className="text-white text-sm">Include options alternatives</span>
              <p className="text-gray-500 text-xs mt-1">
                When enabled, high-confidence recommendations include options language (e.g., "BUY
                or Buy Call for leverage")
              </p>
            </div>
            <input
              type="checkbox"
              checked={aiSettings.includeOptionsLanguage ?? false}
              onChange={(e) => onSaveAISettings({ includeOptionsLanguage: e.target.checked })}
              className="w-5 h-5 accent-terminal-amber"
            />
          </label>
        </div>

        <div className="border-t border-terminal-border" />

        {/* Automatic Pattern Scanning */}
        <div className="bg-terminal-panel border border-terminal-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-terminal-amber" />
              <span className="text-white text-sm font-medium">Automatic Pattern Scanning</span>
              <div className="relative group">
                <HelpCircle size={14} className="text-gray-500 cursor-help" />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-terminal-bg border border-terminal-border rounded-lg text-xs text-gray-300 w-64 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                  Uses 1 API call per symbol every 15 minutes. Only enable if you have a paid API tier with higher rate limits.
                </div>
              </div>
            </div>
            <button
              onClick={() => onSaveSettings({ autoPatternScan: !settings.autoPatternScan })}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.autoPatternScan ? 'bg-terminal-amber' : 'bg-terminal-border'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.autoPatternScan ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <p className="text-gray-400 text-xs mb-3">
            Automatically scan all watchlist symbols for chart patterns every 15 minutes.
            <span className="text-terminal-amber font-medium"> Disabled by default</span> to conserve API calls.
          </p>

          {!settings.autoPatternScan && (
            <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-400 mb-3">
              <strong>Manual mode:</strong> Use the 🔍 button in the chart toolbar to scan patterns on-demand.
            </div>
          )}

          {settings.autoPatternScan && (
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded text-xs text-amber-400">
              <strong>⚠️ Warning:</strong> This uses ~15 API calls every 15 minutes (1 per symbol).
              Only enable if you have Polygon Starter+ or TwelveData Pro+ tier.
            </div>
          )}
        </div>

        {/* AI Budget (Free Tier Protection) */}
        <div>
          <h3 className="text-white text-sm font-medium mb-3">AI Budget (Free Tier Protection)</h3>
          <p className="text-gray-400 text-xs mb-4">
            Limit daily AI API calls to protect free tier usage. Adjust based on your API plan.
          </p>
          <AIBudgetMeter showControls={true} />
        </div>

        <div className="border-t border-terminal-border" />

        {/* Response Style / Personality */}
        <div>
          <h3 className="text-white text-sm font-medium mb-3">Response Style</h3>
          <p className="text-gray-400 text-xs mb-4">
            Choose how your AI co-pilot communicates with you
          </p>
          <div className="space-y-3">
            {(Object.keys(TONE_DESCRIPTIONS) as ToneType[]).map((tone) => (
              <button
                key={tone}
                onClick={() => onSaveSettings({ tone })}
                className={`w-full p-4 rounded-lg border text-left transition-colors ${
                  settings.tone === tone
                    ? 'border-terminal-amber bg-terminal-amber/10'
                    : 'border-terminal-border hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{TONE_DESCRIPTIONS[tone].label}</span>
                  {settings.tone === tone && <Check className="w-4 h-4 text-terminal-amber" />}
                </div>
                <p className="text-gray-500 text-sm italic">{TONE_DESCRIPTIONS[tone].example}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
