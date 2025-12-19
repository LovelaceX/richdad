import { useState } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, Check, AlertCircle, Cpu } from 'lucide-react'
import { AI_PROVIDERS, type AIProvider, type AIProviderConfig } from '../../lib/db'
import { SetupPrompt } from '../common/SetupPrompt'

interface MultiProviderManagerProps {
  providers: AIProviderConfig[]
  onChange: (providers: AIProviderConfig[]) => void
}

export function MultiProviderManager({ providers, onChange }: MultiProviderManagerProps) {
  const [showAddProvider, setShowAddProvider] = useState(false)
  const [newProvider, setNewProvider] = useState<AIProvider>('openai')

  // Get providers that haven't been added yet
  const availableProviders = (Object.keys(AI_PROVIDERS) as AIProvider[]).filter(
    p => !providers.some(existing => existing.provider === p)
  )

  const handleAddProvider = () => {
    if (availableProviders.length === 0) return

    const providerToAdd = newProvider || availableProviders[0]
    const newConfig: AIProviderConfig = {
      provider: providerToAdd,
      apiKey: '',
      model: AI_PROVIDERS[providerToAdd].models[0],
      enabled: true,
      priority: providers.length + 1
    }

    onChange([...providers, newConfig])
    setShowAddProvider(false)
    setNewProvider(availableProviders.find(p => p !== providerToAdd) || 'openai')
  }

  const handleRemoveProvider = (provider: AIProvider) => {
    const updated = providers
      .filter(p => p.provider !== provider)
      .map((p, idx) => ({ ...p, priority: idx + 1 }))
    onChange(updated)
  }

  const handleUpdateProvider = (provider: AIProvider, updates: Partial<AIProviderConfig>) => {
    const updated = providers.map(p =>
      p.provider === provider ? { ...p, ...updates } : p
    )
    onChange(updated)
  }

  const handleMovePriority = (provider: AIProvider, direction: 'up' | 'down') => {
    const idx = providers.findIndex(p => p.provider === provider)
    if (idx === -1) return
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === providers.length - 1) return

    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    const updated = [...providers]
    const temp = updated[idx]
    updated[idx] = updated[newIdx]
    updated[newIdx] = temp

    // Update priorities
    const withPriorities = updated.map((p, i) => ({ ...p, priority: i + 1 }))
    onChange(withPriorities)
  }

  const getPriorityLabel = (priority: number) => {
    if (priority === 1) return 'Primary'
    if (priority === 2) return 'Fallback 1'
    return `Fallback ${priority - 1}`
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white text-sm font-medium">AI Providers</h3>
          <p className="text-gray-500 text-xs mt-1">
            Configure multiple providers with automatic fallback
          </p>
        </div>
        {availableProviders.length > 0 && (
          <button
            onClick={() => setShowAddProvider(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-terminal-amber/20 text-terminal-amber rounded text-xs hover:bg-terminal-amber/30 transition-colors"
          >
            <Plus size={12} />
            Add Provider
          </button>
        )}
      </div>

      {/* Provider List */}
      {providers.length === 0 ? (
        <div className="bg-terminal-panel border border-terminal-border rounded-lg">
          <SetupPrompt
            icon={<Cpu className="w-6 h-6 text-gray-500" />}
            title="No AI providers configured"
            description="Add a provider to enable AI features like recommendations and analysis"
            helpSection="ai-copilot"
            settingsPath="AI Copilot"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {providers.sort((a, b) => a.priority - b.priority).map((config, index) => (
            <div
              key={config.provider}
              className={`bg-terminal-panel border rounded-lg p-4 transition-colors ${
                config.enabled ? 'border-terminal-border' : 'border-gray-700 opacity-60'
              }`}
            >
              {/* Provider Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Cpu size={16} className={config.enabled ? 'text-terminal-amber' : 'text-gray-500'} />
                  <div>
                    <span className="text-white text-sm font-medium">
                      {AI_PROVIDERS[config.provider].name}
                    </span>
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                      config.priority === 1
                        ? 'bg-terminal-amber/20 text-terminal-amber'
                        : 'bg-gray-700 text-gray-400'
                    }`}>
                      {getPriorityLabel(config.priority)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Priority Controls */}
                  <div className="flex flex-col">
                    <button
                      onClick={() => handleMovePriority(config.provider, 'up')}
                      disabled={index === 0}
                      className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move up (higher priority)"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => handleMovePriority(config.provider, 'down')}
                      disabled={index === providers.length - 1}
                      className="p-0.5 text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move down (lower priority)"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>

                  {/* Enable/Disable Toggle */}
                  <button
                    onClick={() => handleUpdateProvider(config.provider, { enabled: !config.enabled })}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      config.enabled ? 'bg-terminal-amber' : 'bg-terminal-border'
                    }`}
                    title={config.enabled ? 'Disable' : 'Enable'}
                  >
                    <div
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                        config.enabled ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </button>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemoveProvider(config.provider)}
                    className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                    title="Remove provider"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Provider Config */}
              {config.enabled && (
                <div className="space-y-3 mt-3 pt-3 border-t border-terminal-border">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-500 text-xs mb-1 block">Model</label>
                      <select
                        value={config.model || AI_PROVIDERS[config.provider].models[0]}
                        onChange={(e) => handleUpdateProvider(config.provider, { model: e.target.value })}
                        className="w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1.5 text-xs text-white"
                      >
                        {AI_PROVIDERS[config.provider].models.map(model => (
                          <option key={model} value={model}>{model}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-500 text-xs mb-1 block">API Key</label>
                      <input
                        type="password"
                        value={config.apiKey}
                        onChange={(e) => handleUpdateProvider(config.provider, { apiKey: e.target.value })}
                        placeholder={AI_PROVIDERS[config.provider].keyPlaceholder}
                        className="w-full bg-terminal-bg border border-terminal-border rounded px-2 py-1.5 text-xs text-white placeholder:text-gray-600 font-mono"
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2 text-xs">
                    {config.apiKey ? (
                      <span className="text-terminal-up flex items-center gap-1">
                        <Check size={12} /> API key configured
                      </span>
                    ) : (
                      <span className="text-yellow-500 flex items-center gap-1">
                        <AlertCircle size={12} /> API key required
                      </span>
                    )}
                  </div>

                  {/* Instructions */}
                  <p className="text-gray-600 text-xs">
                    {AI_PROVIDERS[config.provider].instructions}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Provider Modal */}
      {showAddProvider && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-terminal-panel border border-terminal-border rounded-lg p-6 w-96">
            <h3 className="text-white text-lg font-medium mb-4">Add AI Provider</h3>

            <select
              value={newProvider}
              onChange={(e) => setNewProvider(e.target.value as AIProvider)}
              className="w-full bg-terminal-bg border border-terminal-border rounded px-3 py-2 text-sm text-white mb-4"
            >
              {availableProviders.map(provider => (
                <option key={provider} value={provider}>
                  {AI_PROVIDERS[provider].name}
                </option>
              ))}
            </select>

            <div className="flex gap-3">
              <button
                onClick={() => setShowAddProvider(false)}
                className="flex-1 px-4 py-2 bg-terminal-border text-white rounded text-sm hover:bg-terminal-border/70 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProvider}
                className="flex-1 px-4 py-2 bg-terminal-amber text-black rounded text-sm hover:bg-amber-500 transition-colors"
              >
                Add Provider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-gray-500 bg-terminal-bg/50 rounded p-3">
        <p>
          <strong>How it works:</strong> If the primary provider fails (rate limit, API error, etc.),
          the system automatically tries the next enabled provider in priority order.
        </p>
      </div>
    </div>
  )
}
