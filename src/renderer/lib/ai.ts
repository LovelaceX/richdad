import { getAISettings, AI_PROVIDERS } from './db'
import type { AIMessage } from '../types'

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

export async function sendChatMessage(
  userMessage: string,
  history: AIMessage[]
): Promise<string> {
  const settings = await getAISettings()

  if (!settings.apiKey) {
    throw new Error('No API key configured. Please add your API key in Settings.')
  }

  const provider = settings.provider
  const model = settings.model || AI_PROVIDERS[provider].models[0]

  // Convert history to chat format
  const chatHistory: ChatMessage[] = history
    .filter(m => m.type === 'chat' && m.role)
    .map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }))

  switch (provider) {
    case 'openai':
      return sendOpenAI(settings.apiKey, model, userMessage, chatHistory)
    case 'claude':
      return sendClaude(settings.apiKey, model, userMessage, chatHistory)
    case 'gemini':
      return sendGemini(settings.apiKey, model, userMessage, chatHistory)
    case 'grok':
      return sendGrok(settings.apiKey, model, userMessage, chatHistory)
    case 'deepseek':
      return sendDeepSeek(settings.apiKey, model, userMessage, chatHistory)
    case 'llama':
      return sendLlama(settings.apiKey, model, userMessage, chatHistory)
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
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

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
  return data.choices[0]?.message?.content || 'No response generated'
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

  const response = await fetch('https://api.anthropic.com/v1/messages', {
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
  return data.content[0]?.text || 'No response generated'
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

  const response = await fetch(
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
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated'
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

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
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
  return data.choices[0]?.message?.content || 'No response generated'
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

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
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
  return data.choices[0]?.message?.content || 'No response generated'
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

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
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
  return data.choices[0]?.message?.content || 'No response generated'
}
