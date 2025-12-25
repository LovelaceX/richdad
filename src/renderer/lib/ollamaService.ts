import { Command } from '@tauri-apps/plugin-shell'

export type OllamaStatus =
  | 'checking'
  | 'starting'
  | 'running'
  | 'not_installed'
  | 'start_failed'
  | 'not_running'

export interface OllamaState {
  status: OllamaStatus
  models: string[]
  hasRequiredModel: boolean
  error?: string
}

const OLLAMA_API = 'http://localhost:11434'
const CHECK_TIMEOUT = 5000
const START_TIMEOUT = 10000
const REQUIRED_MODEL = 'dolphin-llama3:8b'

/**
 * Check if Ollama API is responding
 */
export async function checkOllamaRunning(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_API}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(CHECK_TIMEOUT)
    })
    return response.ok
  } catch {
    return false
  }
}

/**
 * Get installed models from Ollama
 */
export async function getOllamaModels(): Promise<string[]> {
  try {
    const response = await fetch(`${OLLAMA_API}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(CHECK_TIMEOUT)
    })
    if (!response.ok) return []
    const data = await response.json()
    return (data.models || []).map((m: { name: string }) => m.name)
  } catch {
    return []
  }
}

/**
 * Get current platform
 */
function getPlatform(): 'mac' | 'windows' | 'linux' {
  const userAgent = navigator.userAgent.toLowerCase()
  if (userAgent.includes('win')) return 'windows'
  if (userAgent.includes('linux')) return 'linux'
  return 'mac'
}

/**
 * Wait for Ollama API to become available
 */
async function waitForOllama(timeoutMs: number): Promise<boolean> {
  const startTime = Date.now()
  const checkInterval = 500

  while (Date.now() - startTime < timeoutMs) {
    if (await checkOllamaRunning()) {
      return true
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval))
  }

  return false
}

/**
 * Start Ollama using platform-specific commands
 */
export async function startOllama(): Promise<{ success: boolean; error?: string }> {
  const platform = getPlatform()

  try {
    if (platform === 'mac') {
      // Try opening the Ollama app first (preferred - starts in system tray)
      try {
        const openCmd = Command.create('open', ['-a', 'Ollama'])
        await openCmd.execute()
        // Wait for API to become available
        const started = await waitForOllama(START_TIMEOUT)
        if (started) return { success: true }
      } catch {
        // Fallback to ollama serve
        try {
          const serveCmd = Command.create('ollama', ['serve'])
          serveCmd.spawn() // Run in background
          const started = await waitForOllama(START_TIMEOUT)
          if (started) return { success: true }
        } catch {
          // ollama command not found
        }
      }
    } else if (platform === 'windows') {
      // Try starting Ollama app
      try {
        const cmd = Command.create('cmd', ['/c', 'start', '', 'ollama', 'app'])
        await cmd.execute()
        const started = await waitForOllama(START_TIMEOUT)
        if (started) return { success: true }
      } catch {
        // Fallback to ollama serve
        try {
          const serveCmd = Command.create('ollama', ['serve'])
          serveCmd.spawn()
          const started = await waitForOllama(START_TIMEOUT)
          if (started) return { success: true }
        } catch {
          // ollama command not found
        }
      }
    } else {
      // Linux: run ollama serve in background
      try {
        const serveCmd = Command.create('ollama', ['serve'])
        serveCmd.spawn()
        const started = await waitForOllama(START_TIMEOUT)
        if (started) return { success: true }
      } catch {
        // ollama command not found
      }
    }

    return { success: false, error: 'Ollama did not start in time' }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start Ollama'
    }
  }
}

/**
 * Full Ollama status check with model verification
 */
export async function getOllamaStatus(): Promise<OllamaState> {
  const isRunning = await checkOllamaRunning()

  if (!isRunning) {
    return { status: 'not_running', models: [], hasRequiredModel: false }
  }

  const models = await getOllamaModels()
  const hasRequiredModel = models.some(m =>
    m.includes('dolphin-llama3') || m === REQUIRED_MODEL
  )

  return {
    status: 'running',
    models,
    hasRequiredModel
  }
}

/**
 * Get the required model name
 */
export function getRequiredModel(): string {
  return REQUIRED_MODEL
}
