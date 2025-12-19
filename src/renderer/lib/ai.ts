import { getEnabledProviders, AI_PROVIDERS, type AIProviderConfig, type AIProvider } from './db'
import type { AIMessage } from '../types'

// Timeout for AI API requests (30 seconds)
const AI_REQUEST_TIMEOUT_MS = 30000

/**
 * Fetch with timeout using AbortController
 * Prevents the UI from hanging indefinitely if an AI provider doesn't respond
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = AI_REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    return response
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000} seconds`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Safely extract response content with validation
 * Prevents crashes from malformed AI responses
 */
function extractOpenAIContent(data: unknown): string {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response format: expected object')
  }

  const response = data as Record<string, unknown>

  if (!Array.isArray(response.choices) || response.choices.length === 0) {
    throw new Error('Invalid response format: missing choices array')
  }

  const choice = response.choices[0] as Record<string, unknown>
  const message = choice?.message as Record<string, unknown>
  const content = message?.content

  if (typeof content !== 'string') {
    return 'No response generated'
  }

  return content
}

function extractClaudeContent(data: unknown): string {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response format: expected object')
  }

  const response = data as Record<string, unknown>

  if (!Array.isArray(response.content) || response.content.length === 0) {
    throw new Error('Invalid response format: missing content array')
  }

  const block = response.content[0] as Record<string, unknown>
  const text = block?.text

  if (typeof text !== 'string') {
    return 'No response generated'
  }

  return text
}

function extractGeminiContent(data: unknown): string {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid response format: expected object')
  }

  const response = data as Record<string, unknown>

  if (!Array.isArray(response.candidates) || response.candidates.length === 0) {
    throw new Error('Invalid response format: missing candidates array')
  }

  const candidate = response.candidates[0] as Record<string, unknown>
  const content = candidate?.content as Record<string, unknown>
  const parts = content?.parts as Array<Record<string, unknown>>
  const text = parts?.[0]?.text

  if (typeof text !== 'string') {
    return 'No response generated'
  }

  return text
}

const SYSTEM_PROMPT = `You are an AI trading co-pilot for richdad.app - a Bloomberg Terminal-style desktop application. You help traders make informed decisions by providing market analysis, explaining trading concepts, and offering insights based on current market conditions.

Your personality should be professional and concise. Focus on actionable insights. When discussing stocks:
- Reference technical indicators when relevant
- Consider market sentiment and news
- Be honest about uncertainty
- Never guarantee returns or make promises about future performance

Keep responses concise but informative. Use bullet points for clarity when appropriate.`

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

/**
 * Send a chat message with automatic fallback to secondary providers
 */
export async function sendChatMessage(
  userMessage: string,
  history: AIMessage[]
): Promise<string> {
  const enabledProviders = await getEnabledProviders()

  if (enabledProviders.length === 0) {
    throw new Error('No AI providers configured. Please add your API key in Settings.')
  }

  // Convert history to chat format
  const chatHistory: ChatMessage[] = history
    .filter(m => m.type === 'chat' && m.role)
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }))

  // Try each provider in priority order
  const errors: string[] = []

  for (const providerConfig of enabledProviders) {
    try {
      console.log(`[AI] Trying ${providerConfig.provider} (priority ${providerConfig.priority})...`)
      const response = await callProvider(providerConfig, userMessage, chatHistory)
      console.log(`[AI] ${providerConfig.provider} succeeded`)
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.warn(`[AI] ${providerConfig.provider} failed: ${errorMessage}`)
      errors.push(`${AI_PROVIDERS[providerConfig.provider].name}: ${errorMessage}`)
      // Continue to next provider
    }
  }

  // All providers failed
  throw new Error(`All AI providers failed:\n${errors.join('\n')}`)
}

/**
 * Call a specific provider
 */
async function callProvider(
  config: AIProviderConfig,
  message: string,
  history: ChatMessage[]
): Promise<string> {
  const model = config.model || AI_PROVIDERS[config.provider].models[0]

  switch (config.provider) {
    case 'openai':
      return sendOpenAI(config.apiKey, model, message, history)
    case 'claude':
      return sendClaude(config.apiKey, model, message, history)
    case 'gemini':
      return sendGemini(config.apiKey, model, message, history)
    case 'grok':
      return sendGrok(config.apiKey, model, message, history)
    case 'deepseek':
      return sendDeepSeek(config.apiKey, model, message, history)
    case 'llama':
      return sendLlama(config.apiKey, model, message, history)
    default:
      throw new Error(`Unknown provider: ${config.provider}`)
  }
}

/**
 * Get which provider is currently configured as primary
 */
export async function getPrimaryProvider(): Promise<AIProvider | null> {
  const providers = await getEnabledProviders()
  return providers.length > 0 ? providers[0].provider : null
}

async function sendOpenAI(
  apiKey: string,
  model: string,
  message: string,
  history: ChatMessage[]
): Promise<string> {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: message }
  ]

  const response = await fetchWithTimeout('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1000,
      temperature: 0.7
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  return extractOpenAIContent(data)
}

async function sendClaude(
  apiKey: string,
  model: string,
  message: string,
  history: ChatMessage[]
): Promise<string> {
  const messages = [
    ...history,
    { role: 'user', content: message }
  ]

  const response = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model,
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `Claude API error: ${response.status}`)
  }

  const data = await response.json()
  return extractClaudeContent(data)
}

async function sendGemini(
  apiKey: string,
  model: string,
  message: string,
  history: ChatMessage[]
): Promise<string> {
  const contents = [
    ...history.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    })),
    { role: 'user', parts: [{ text: message }] }
  ]

  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        generationConfig: {
          maxOutputTokens: 1000,
          temperature: 0.7
        }
      })
    }
  )

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  return extractGeminiContent(data)
}

async function sendGrok(
  apiKey: string,
  model: string,
  message: string,
  history: ChatMessage[]
): Promise<string> {
  // Grok uses OpenAI-compatible API
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: message }
  ]

  const response = await fetchWithTimeout('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1000,
      temperature: 0.7
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `Grok API error: ${response.status}`)
  }

  const data = await response.json()
  return extractOpenAIContent(data)
}

async function sendDeepSeek(
  apiKey: string,
  model: string,
  message: string,
  history: ChatMessage[]
): Promise<string> {
  // DeepSeek uses OpenAI-compatible API
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: message }
  ]

  const response = await fetchWithTimeout('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1000,
      temperature: 0.7
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `DeepSeek API error: ${response.status}`)
  }

  const data = await response.json()
  return extractOpenAIContent(data)
}

async function sendLlama(
  apiKey: string,
  model: string,
  message: string,
  history: ChatMessage[]
): Promise<string> {
  // Llama via Groq (OpenAI-compatible API)
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: message }
  ]

  const response = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 1000,
      temperature: 0.7
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `Llama API error: ${response.status}`)
  }

  const data = await response.json()
  return extractOpenAIContent(data)
}
