import { useState } from 'react'
import { Cpu, Check, AlertTriangle, Loader2, RefreshCw, Download } from 'lucide-react'
import { useOllamaStore } from '../../stores/ollamaStore'
import { getRequiredModel } from '../../lib/ollamaService'

export function OllamaStatusIndicator() {
  const [isOpen, setIsOpen] = useState(false)
  const status = useOllamaStore(state => state.status)
  const hasRequiredModel = useOllamaStore(state => state.hasRequiredModel)
  const error = useOllamaStore(state => state.error)
  const refresh = useOllamaStore(state => state.refresh)
  const attemptAutoStart = useOllamaStore(state => state.attemptAutoStart)

  const getStatusColor = () => {
    if (status === 'running' && hasRequiredModel) return 'bg-terminal-up'
    if (status === 'running' && !hasRequiredModel) return 'bg-yellow-400'
    if (status === 'checking' || status === 'starting') return 'bg-yellow-400 animate-pulse'
    return 'bg-red-400'
  }

  const getStatusIcon = () => {
    if (status === 'checking' || status === 'starting') {
      return <Loader2 size={12} className="animate-spin text-yellow-400" />
    }
    if (status === 'running' && hasRequiredModel) {
      return <Check size={12} className="text-terminal-up" />
    }
    if (status === 'running' && !hasRequiredModel) {
      return <AlertTriangle size={12} className="text-yellow-400" />
    }
    return <AlertTriangle size={12} className="text-red-400" />
  }

  const getStatusText = () => {
    switch (status) {
      case 'checking': return 'Checking...'
      case 'starting': return 'Starting...'
      case 'running': return hasRequiredModel ? 'AI Ready' : 'Model Missing'
      case 'start_failed': return 'Start Failed'
      case 'not_running': return 'Not Running'
      case 'not_installed': return 'Not Installed'
      default: return 'Unknown'
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 200)}
        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-terminal-border transition-colors"
        title={`AI: ${getStatusText()}`}
      >
        <span className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        <Cpu size={14} className="text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-terminal-panel border border-terminal-border rounded-lg shadow-xl z-50">
          <div className="p-3 border-b border-terminal-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu size={16} className="text-terminal-amber" />
                <span className="text-white text-sm font-medium">Ollama AI</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  refresh()
                }}
                className="p-1 hover:bg-terminal-border rounded"
                title="Refresh status"
              >
                <RefreshCw size={12} className="text-gray-400" />
              </button>
            </div>
          </div>

          <div className="p-3">
            <div className="flex items-center gap-2 mb-2">
              {getStatusIcon()}
              <span className="text-gray-300 text-sm">{getStatusText()}</span>
            </div>

            {error && (
              <p className="text-red-400 text-xs mb-2">{error}</p>
            )}

            {(status === 'not_running' || status === 'start_failed') && (
              <div className="space-y-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    attemptAutoStart()
                  }}
                  className="w-full px-3 py-2 bg-terminal-amber text-black rounded text-sm font-medium hover:bg-amber-500 transition-colors"
                >
                  Start Ollama
                </button>
                <div className="p-2 bg-terminal-bg rounded text-xs text-gray-400">
                  <p className="mb-1">Or manually:</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>Open Ollama from Applications</li>
                    <li>Or run <code className="bg-terminal-border px-1 rounded">ollama serve</code></li>
                  </ol>
                </div>
              </div>
            )}

            {status === 'running' && !hasRequiredModel && (
              <div className="space-y-2">
                <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400">
                  <p className="mb-1">Model not found. Run in terminal:</p>
                  <code className="bg-terminal-bg px-1.5 py-0.5 rounded block mt-1">
                    ollama pull {getRequiredModel()}
                  </code>
                </div>
              </div>
            )}

            {status === 'running' && hasRequiredModel && (
              <div className="p-2 bg-terminal-up/10 border border-terminal-up/30 rounded text-xs text-terminal-up">
                AI Copilot is ready to use
              </div>
            )}

            {(status === 'not_running' || status === 'start_failed' || status === 'not_installed') && (
              <a
                href="https://ollama.ai/download"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 mt-2 text-terminal-amber text-xs hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                <Download size={12} />
                Download Ollama
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
