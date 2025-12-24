import { useState, useEffect } from 'react'
import { Check, AlertCircle, Cpu, Loader2, Download, Copy, RefreshCw, ExternalLink } from 'lucide-react'
import { AI_PROVIDERS, type AIProviderConfig } from '../../lib/db'

// Platform detection (Mac and Windows only)
type Platform = 'mac' | 'windows'

const getPlatform = (): Platform => {
  const userAgent = navigator.userAgent.toLowerCase()
  if (userAgent.includes('win')) return 'windows'
  return 'mac' // Default to Mac
}

const PLATFORM_NAMES: Record<Platform, string> = {
  mac: 'macOS',
  windows: 'Windows'
}

const DOWNLOAD_URLS: Record<Platform, string> = {
  mac: 'https://ollama.ai/download/mac',
  windows: 'https://ollama.ai/download/windows'
}

interface MultiProviderManagerProps {
  providers: AIProviderConfig[]
  onChange: (providers: AIProviderConfig[]) => void
}

type OllamaStatus = 'checking' | 'running' | 'not_running' | 'model_missing'

interface OllamaInfo {
  status: OllamaStatus
  models: string[]
  error?: string
}

export function MultiProviderManager({ providers, onChange }: MultiProviderManagerProps) {
  const [ollamaInfo, setOllamaInfo] = useState<OllamaInfo>({ status: 'checking', models: [] })
  const [copied, setCopied] = useState(false)
  const platform = getPlatform()
  const platformName = PLATFORM_NAMES[platform]

  const copyCommand = () => {
    navigator.clipboard.writeText('ollama pull dolphin-llama3:8b')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Check Ollama status on mount and periodically
  useEffect(() => {
    checkOllamaStatus()
    const interval = setInterval(checkOllamaStatus, 30000) // Check every 30s
    return () => clearInterval(interval)
  }, [])

  const checkOllamaStatus = async () => {
    try {
      // Check if Ollama is running by hitting the tags endpoint
      const response = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })

      if (!response.ok) {
        setOllamaInfo({ status: 'not_running', models: [], error: 'Ollama not responding' })
        return
      }

      const data = await response.json()
      const models = (data.models || []).map((m: { name: string }) => m.name)

      // Check if the required model is installed
      const requiredModel = 'dolphin-llama3:8b'
      const hasRequiredModel = models.some((m: string) =>
        m.includes('dolphin-llama3') || m === requiredModel
      )

      if (hasRequiredModel) {
        setOllamaInfo({ status: 'running', models })

        // Auto-configure Ollama if not already configured
        if (providers.length === 0) {
          onChange([{
            provider: 'ollama',
            apiKey: '',  // Not needed
            model: requiredModel,
            enabled: true,
            priority: 1
          }])
        }
      } else {
        setOllamaInfo({
          status: 'model_missing',
          models,
          error: `Model ${requiredModel} not found. Run: ollama pull ${requiredModel}`
        })
      }
    } catch (error) {
      setOllamaInfo({
        status: 'not_running',
        models: [],
        error: 'Cannot connect to Ollama. Is it running?'
      })
    }
  }

  const getStatusBadge = () => {
    switch (ollamaInfo.status) {
      case 'checking':
        return (
          <span className="flex items-center gap-1 text-gray-400 text-xs">
            <Loader2 size={12} className="animate-spin" />
            Checking...
          </span>
        )
      case 'running':
        return (
          <span className="flex items-center gap-1 text-terminal-up text-xs">
            <Check size={12} />
            Running
          </span>
        )
      case 'model_missing':
        return (
          <span className="flex items-center gap-1 text-yellow-500 text-xs">
            <AlertCircle size={12} />
            Model Missing
          </span>
        )
      case 'not_running':
        return (
          <span className="flex items-center gap-1 text-red-400 text-xs">
            <AlertCircle size={12} />
            Not Running
          </span>
        )
    }
  }

  // Determine step completion states
  // Step 1 complete = Ollama is installed (running or has models, just missing the specific model)
  const step1Complete = ollamaInfo.status === 'running' || ollamaInfo.status === 'model_missing'
  // Step 2 complete = The specific model is installed and running
  const step2Complete = ollamaInfo.status === 'running'
  // Step 3 complete = Everything is ready
  const step3Complete = ollamaInfo.status === 'running'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white text-sm font-medium">AI Provider</h3>
          <p className="text-gray-500 text-xs mt-1">
            Local AI powered by Ollama - free, private, uncensored
          </p>
        </div>
        <button
          onClick={checkOllamaStatus}
          className="p-2 text-gray-400 hover:text-white hover:bg-terminal-border rounded transition-colors"
          title="Refresh status"
        >
          <RefreshCw size={14} className={ollamaInfo.status === 'checking' ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Status Badge */}
      <div className="flex items-center gap-3 bg-terminal-panel border border-terminal-border rounded-lg p-3">
        <Cpu size={18} className={ollamaInfo.status === 'running' ? 'text-terminal-amber' : 'text-gray-500'} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-medium">{AI_PROVIDERS.ollama.name}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-terminal-amber/20 text-terminal-amber">Primary</span>
          </div>
          <p className="text-gray-500 text-xs">dolphin-llama3:8b - uncensored trading analysis</p>
        </div>
        {getStatusBadge()}
      </div>

      {/* Step-by-Step Setup Guide */}
      <div className="space-y-3">
        {/* Step 1: Download Ollama */}
        <div className={`p-3 rounded-lg border transition-colors ${
          step1Complete ? 'border-green-500/50 bg-green-500/5' : 'border-terminal-border'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step1Complete ? 'bg-green-500 text-black' : 'bg-terminal-border text-white'
            }`}>
              {step1Complete ? <Check size={14} /> : '1'}
            </div>
            <span className="text-white font-medium text-sm">Download Ollama</span>
          </div>
          <p className="text-gray-400 text-sm ml-8 mb-2">
            Free AI that runs on your computer - no account needed
          </p>
          <button
            onClick={() => window.open(DOWNLOAD_URLS[platform], '_blank')}
            className="ml-8 px-4 py-2 bg-terminal-amber text-black rounded font-medium hover:bg-amber-500 transition-colors flex items-center gap-2 text-sm"
          >
            <Download size={16} />
            Download for {platformName}
            <ExternalLink size={12} />
          </button>
        </div>

        {/* Step 2: Install the AI Model */}
        <div className={`p-3 rounded-lg border transition-colors ${
          step2Complete ? 'border-green-500/50 bg-green-500/5' : 'border-terminal-border'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step2Complete ? 'bg-green-500 text-black' : 'bg-terminal-border text-white'
            }`}>
              {step2Complete ? <Check size={14} /> : '2'}
            </div>
            <span className="text-white font-medium text-sm">Install the AI Model</span>
          </div>
          <p className="text-gray-400 text-sm ml-8 mb-2">
            Open {platform === 'mac' ? 'Terminal' : platform === 'windows' ? 'Command Prompt' : 'Terminal'} and paste this command:
          </p>
          <div className="ml-8 flex items-center gap-2">
            <code className="flex-1 bg-terminal-bg px-3 py-2 rounded text-sm text-terminal-amber font-mono">
              ollama pull dolphin-llama3:8b
            </code>
            <button
              onClick={copyCommand}
              className="px-3 py-2 bg-terminal-border hover:bg-gray-600 rounded text-white text-sm flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-gray-500 text-xs ml-8 mt-2">
            This downloads ~5GB - grab a coffee while it installs
          </p>
        </div>

        {/* Step 3: Ready! */}
        <div className={`p-3 rounded-lg border transition-colors ${
          step3Complete ? 'border-green-500/50 bg-green-500/5' : 'border-terminal-border'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step3Complete ? 'bg-green-500 text-black' : 'bg-terminal-border text-white'
            }`}>
              {step3Complete ? <Check size={14} /> : '3'}
            </div>
            <span className="text-white font-medium text-sm">You're All Set!</span>
          </div>
          <p className="text-gray-400 text-sm ml-8">
            {ollamaInfo.status === 'running'
              ? 'Ollama is running and ready to analyze trades!'
              : 'Keep Ollama running in the background (it starts automatically on your computer)'}
          </p>
        </div>
      </div>

      {/* Status-specific feedback */}
      {ollamaInfo.status === 'model_missing' && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-400 text-sm mb-1">
            <strong>Almost there!</strong> Just need to download the AI model.
          </p>
          <p className="text-gray-400 text-xs">
            Complete step 2 above to finish setup.
            {ollamaInfo.models.length > 0 && (
              <span className="block mt-1">
                You have other models installed: {ollamaInfo.models.slice(0, 2).join(', ')}
                {ollamaInfo.models.length > 2 && ` +${ollamaInfo.models.length - 2} more`}
              </span>
            )}
          </p>
        </div>
      )}

      {ollamaInfo.status === 'running' && (
        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-green-400 text-sm flex items-center gap-2">
            <Check size={16} />
            <strong>Ready!</strong> AI Copilot will use your local Ollama for trading analysis.
          </p>
        </div>
      )}

      {/* Troubleshooting (collapsible) */}
      {ollamaInfo.status === 'not_running' && (
        <details className="group">
          <summary className="text-gray-400 text-sm cursor-pointer hover:text-white flex items-center gap-2">
            <AlertCircle size={14} />
            Ollama not detected? Click for troubleshooting
          </summary>
          <div className="mt-2 p-3 bg-terminal-bg rounded-lg text-sm text-gray-400 space-y-2">
            <p className="font-medium text-white">Common solutions:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              {platform === 'mac' && <li>Open Ollama from your Applications folder</li>}
              {platform === 'windows' && <li>Run "Ollama" from the Start menu</li>}
              <li>Make sure Ollama finished installing completely</li>
              <li>Try restarting your computer</li>
            </ul>
            <p className="text-gray-500 text-xs mt-2">
              Still stuck? Visit <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="text-terminal-amber hover:underline">ollama.ai</a> for help.
            </p>
          </div>
        </details>
      )}

      {/* Why Ollama */}
      <div className="text-xs text-gray-600 pt-2 border-t border-terminal-border">
        <strong className="text-gray-500">Why Ollama?</strong> Free, runs locally, no API keys, no rate limits, and the dolphin model gives honest trading advice without disclaimers.
      </div>
    </div>
  )
}
