import { motion, AnimatePresence } from 'framer-motion'
import { Cpu, Loader2, AlertCircle, Download } from 'lucide-react'
import { useOllamaStore } from '../stores/ollamaStore'
import { getRequiredModel } from '../lib/ollamaService'

interface OllamaStartupOverlayProps {
  onDismiss: () => void
}

export function OllamaStartupOverlay({ onDismiss }: OllamaStartupOverlayProps) {
  const status = useOllamaStore(state => state.status)
  const error = useOllamaStore(state => state.error)
  const attemptAutoStart = useOllamaStore(state => state.attemptAutoStart)

  const isLoading = status === 'checking' || status === 'starting'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-terminal-bg/95 backdrop-blur-sm z-40 flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-terminal-panel border border-terminal-border rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl"
        >
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 rounded-lg bg-terminal-amber/20 flex items-center justify-center">
              {isLoading ? (
                <Loader2 size={24} className="text-terminal-amber animate-spin" />
              ) : (
                <AlertCircle size={24} className="text-red-400" />
              )}
            </div>
            <div>
              <h3 className="text-white font-semibold text-lg">
                {isLoading ? 'Starting AI...' : 'AI Startup Issue'}
              </h3>
              <p className="text-gray-400 text-sm">
                {status === 'checking' && 'Checking if Ollama is running...'}
                {status === 'starting' && 'Starting Ollama in the background...'}
                {status === 'start_failed' && (error || 'Could not start Ollama automatically')}
                {status === 'not_running' && 'Ollama is not running'}
              </p>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center gap-3 p-3 bg-terminal-bg rounded-lg mb-4">
              <Cpu size={18} className="text-terminal-amber" />
              <div className="flex-1">
                <div className="h-1.5 bg-terminal-border rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-terminal-amber"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 10, ease: 'linear' }}
                  />
                </div>
              </div>
            </div>
          )}

          {!isLoading && (
            <div className="space-y-4">
              <div className="p-4 bg-terminal-bg rounded-lg">
                <p className="text-white text-sm font-medium mb-3">Try these steps:</p>
                <ol className="list-decimal list-inside space-y-2 text-gray-400 text-sm">
                  <li>Open <span className="text-white">Ollama</span> from your Applications folder</li>
                  <li>Or run <code className="bg-terminal-border px-1.5 py-0.5 rounded text-terminal-amber">ollama serve</code> in Terminal</li>
                  <li>Make sure Ollama is installed</li>
                </ol>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => attemptAutoStart()}
                  className="flex-1 px-4 py-2.5 bg-terminal-amber text-black rounded-lg font-medium hover:bg-amber-500 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={onDismiss}
                  className="px-4 py-2.5 text-gray-400 hover:text-white border border-terminal-border rounded-lg hover:bg-terminal-border transition-colors"
                >
                  Continue Without AI
                </button>
              </div>

              <div className="flex items-center justify-center gap-4 pt-2">
                <a
                  href="https://ollama.com/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-terminal-amber text-sm hover:underline"
                >
                  <Download size={14} />
                  Download Ollama
                </a>
                <span className="text-gray-600">|</span>
                <span className="text-gray-500 text-xs">
                  Model: {getRequiredModel()}
                </span>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
