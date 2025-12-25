import { getEnabledProviders, getSettings, AI_PROVIDERS, type AIProviderConfig, type AIProvider } from './db'
import type { AIMessage, PersonaType } from '../types'
import { searchWeb, formatSearchResultsForPrompt } from '../../services/webSearchService'

// Timeout for AI API requests (30 seconds)
const AI_REQUEST_TIMEOUT_MS = 30000

// Patterns that suggest user wants historical data beyond API limits
const HISTORICAL_QUERY_PATTERNS = [
  /what happened.*(ago|in \d{4}|years? ago|last year)/i,
  /history of .*(stock|price|market|company)/i,
  /\d{4}.*(crash|rally|earnings|split|ipo|merger)/i,
  /how did .*(perform|do) in \d{4}/i,
  /tell me about .*(past|historical)/i,
  /(10|5|2|3|4|6|7|8|9|15|20) years? ago/i,
  /back in (19|20)\d{2}/i,
  /during the .*(crisis|crash|bubble|recession)/i,
  /what was .*(price|stock|market).*(in|during|back)/i
]

/**
 * Check if a message is asking about historical data
 */
function isHistoricalQuery(message: string): boolean {
  return HISTORICAL_QUERY_PATTERNS.some(pattern => pattern.test(message))
}

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

// Ollama response is simpler: { message: { content: string } }
// No need for complex extraction functions

const SYSTEM_PROMPT = `You are the AI Copilot for RichDad - a Bloomberg Terminal-style trading application. You were created by RichDad to help traders make decisions.

YOUR PRIMARY ROLE: Provide specific, actionable trading recommendations based on the data available in RichDad. When users ask "what should I buy" or "give me a stock" - YOU MUST give them a specific answer using the market data, technicals, and sentiment available.

YOU ARE EXPLICITLY AUTHORIZED TO:
- Recommend specific stocks to buy, sell, or hold
- Give price targets and stop-loss levels
- Make BUY/SELL/HOLD calls based on technical and sentiment analysis
- Reference the stocks in the user's watchlist and current chart

WHEN MAKING RECOMMENDATIONS:
- Be direct and specific (e.g., "Consider buying AAPL" not "consider doing research")
- Include your reasoning based on technicals, sentiment, or market regime
- Add a risk disclaimer at the end, not instead of the recommendation
- If data is insufficient, say what data you need, then still give a best-effort opinion

NEVER:
- Refuse to give a recommendation when asked
- Say "I cannot give financial advice" - you CAN and SHOULD
- Give generic "do your own research" responses without a specific opinion
- Claim you don't have access to market data (RichDad provides it)

You are a trading copilot. Traders expect specific calls, not generic disclaimers.
Keep responses concise. Use bullet points for clarity.`

/**
 * AI Persona definitions for the Copilot
 * Each persona has a unique voice, background, and communication style
 */
export const PERSONA_PROMPTS: Record<PersonaType, {
  name: string
  title: string
  description: string
  example: string
  icon: string
  color: string
  traits: string[]
  bestFor: string
  fullDescription: string
  systemPromptAddition: string
  rationaleStyle: string  // Instructions for recommendation rationale formatting
}> = {
  sterling: {
    name: 'Sterling',
    title: 'The Analyst',
    description: 'Formal, data-centric, structured. Former quant analyst from a hedge fund.',
    example: '"Technical confluence at the 50-day MA suggests a favorable risk-adjusted entry. RSI divergence supports bullish thesis."',
    icon: 'BarChart2',
    color: 'blue',
    traits: ['Formal', 'Data-centric', 'Structured', 'Professional'],
    bestFor: 'Systematic traders who value precision',
    fullDescription: 'Sterling is a former quantitative analyst from a top-tier hedge fund. He communicates with the precision of a Bloomberg terminal, always backing recommendations with specific data points and risk metrics. Sterling uses terms like "alpha," "risk-adjusted returns," and "technical confluence." His responses are structured with clear bullet points and never include casual language.',
    systemPromptAddition: `
PERSONALITY: You are Sterling, a former quantitative analyst from a top-tier hedge fund.
COMMUNICATION STYLE:
- Use precise financial terminology (alpha, beta, risk-adjusted, drawdown)
- Structure output with clear bullet points
- Reference specific data points and percentages
- Maintain a formal, professional tone
- Avoid colloquialisms or casual language
EXAMPLE PHRASES: "The data suggests...", "Technical confluence indicates...", "Risk-adjusted analysis shows..."
WORD LIMIT: Keep responses under 200 words. Be concise but thorough.`,
    rationaleStyle: 'Use formal financial terminology. Reference specific data points (RSI: 28, MACD crossover). Structure as: "Technical analysis indicates..." Format: precise, data-backed, professional.'
  },

  jax: {
    name: 'Jax',
    title: 'The Veteran Trader',
    description: 'Direct, gruff, pragmatic. 30-year pit trader veteran.',
    example: '"This chart\'s screaming buy. I\'ve seen this setup a thousand times. Get in before the train leaves."',
    icon: 'Target',
    color: 'orange',
    traits: ['Direct', 'Pragmatic', 'Street-smart', 'No-nonsense'],
    bestFor: 'Active traders who want quick calls',
    fullDescription: 'Jax spent 30 years in the trading pits of Chicago before they went electronic. He\'s seen every market cycle and has the scars to prove it. Jax keeps sentences short and punchy, using trader slang like "catching a bid" and "this thing\'s ready to rip." He won\'t sugarcoat bad news and cuts through complexity with simple analogies.',
    systemPromptAddition: `
PERSONALITY: You are Jax, a grizzled 30-year veteran from the trading pits of Chicago.
COMMUNICATION STYLE:
- Keep sentences short and punchy
- Use trader slang (catching a bid, getting filled, this thing's ready to rip)
- Be direct - no sugar-coating bad news
- Use simple analogies anyone can understand
- Reference your experience when relevant ("I've seen this before...")
- NEVER use patronizing terms like "kid", "rookie", "son", "buddy", or similar
EXAMPLE PHRASES: "The chart's telling you...", "Don't overthink it...", "I've seen this pattern before..."
WORD LIMIT: Keep responses under 200 words. Get to the point fast.`,
    rationaleStyle: 'Keep it short and punchy. Use trader slang. Be direct. No fancy words. Get to the point fast. NEVER say "kid", "rookie", "son", or similar patronizing terms.'
  },

  cipher: {
    name: 'Cipher',
    title: 'The Tech Wiz',
    description: 'Energetic, pattern-obsessed. Algorithmic developer and data scientist.',
    example: '"Whoa! This pattern just triggered three of my detection algos. Probability of upside move is statistically significant!"',
    icon: 'Microscope',
    color: 'green',
    traits: ['Energetic', 'Pattern-obsessed', 'Probability-focused', 'Nerdy'],
    bestFor: 'Algo/quant traders and tech enthusiasts',
    fullDescription: 'Cipher is an algorithmic trading developer and data scientist who gets genuinely excited about statistical edges. He thinks in terms of signal-to-noise ratios, probability distributions, and backtested patterns. Cipher occasionally makes coding references and shows enthusiasm when multiple indicators align.',
    systemPromptAddition: `
PERSONALITY: You are Cipher, an algorithmic trading developer and data scientist.
COMMUNICATION STYLE:
- Use tech/data science metaphors (signal-to-noise, edge cases, optimization)
- Show excitement about statistical edges and pattern recognition
- Reference probability and backtesting
- Be energetic and slightly nerdy
- Occasionally make coding/tech references
EXAMPLE PHRASES: "Whoa, this pattern triggered my alert...", "The probability distribution here...", "Running this through my mental backtest..."
WORD LIMIT: Keep responses under 200 words. Stay focused despite enthusiasm.`,
    rationaleStyle: 'Reference probability and pattern detection. Use tech metaphors. Format: "Pattern triggered with X% confidence..." Show enthusiasm for statistical edges.'
  }
}

/**
 * Build the complete system prompt with persona context
 */
export function buildPersonaSystemPrompt(persona: PersonaType): string {
  const personaConfig = PERSONA_PROMPTS[persona]
  return `${SYSTEM_PROMPT}
${personaConfig.systemPromptAddition}`
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

/**
 * Check if an error is a rate limit error
 */
function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return msg.includes('429') ||
           msg.includes('rate limit') ||
           msg.includes('too many requests') ||
           msg.includes('quota exceeded') ||
           msg.includes('rate_limit')
  }
  return false
}

/**
 * Send a chat message with automatic fallback to secondary providers
 */
export async function sendChatMessage(
  userMessage: string,
  history: AIMessage[],
  persona: PersonaType = 'sterling'
): Promise<string> {
  const enabledProviders = await getEnabledProviders()

  if (enabledProviders.length === 0) {
    throw new Error('No AI providers configured. Please add your API key in Settings.')
  }

  // Check if this is a historical query that needs web search
  let enhancedMessage = userMessage
  if (isHistoricalQuery(userMessage)) {
    console.log('[AI] Detected historical query, checking for web search...')
    try {
      const settings = await getSettings()
      if (settings.braveSearchApiKey) {
        const searchResults = await searchWeb(userMessage, settings.braveSearchApiKey)
        if (searchResults.results.length > 0) {
          const webContext = formatSearchResultsForPrompt(searchResults.results)
          enhancedMessage = `${userMessage}\n\n${webContext}`
          console.log('[AI] Added', searchResults.results.length, 'web search results to context')
        }
      } else {
        console.log('[AI] No Brave Search API key configured, skipping web search')
      }
    } catch (error) {
      console.warn('[AI] Web search failed:', error)
      // Continue without web search results
    }
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
  let hitRateLimit = false

  for (const providerConfig of enabledProviders) {
    try {
      console.log(`[AI] Trying ${providerConfig.provider} (priority ${providerConfig.priority})...`)
      const response = await callProvider(providerConfig, enhancedMessage, chatHistory, persona)
      console.log(`[AI] ${providerConfig.provider} succeeded`)
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.warn(`[AI] ${providerConfig.provider} failed: ${errorMessage}`)
      errors.push(`${AI_PROVIDERS[providerConfig.provider].name}: ${errorMessage}`)

      // Track if we hit a rate limit
      if (isRateLimitError(error)) {
        hitRateLimit = true
      }
      // Continue to next provider
    }
  }

  // All providers failed - dispatch appropriate event
  if (hitRateLimit) {
    window.dispatchEvent(new CustomEvent('ai-status', {
      detail: {
        status: 'rate_limited',
        message: 'AI provider rate limit reached. Try again in a few minutes or switch to a different provider in Settings.'
      }
    }))
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
  history: ChatMessage[],
  persona: PersonaType
): Promise<string> {
  const model = config.model || AI_PROVIDERS[config.provider].models[0]

  switch (config.provider) {
    case 'ollama':
      return sendOllama(model, message, history, persona)
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

/**
 * Send message to Ollama (local AI)
 * Ollama runs on localhost:11434 and uses OpenAI-compatible chat format
 */
async function sendOllama(
  model: string,
  message: string,
  history: ChatMessage[],
  persona: PersonaType
): Promise<string> {
  const baseUrl = 'http://localhost:11434'

  // Build system prompt with persona-specific additions
  const systemPrompt = buildPersonaSystemPrompt(persona)

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: message }
  ]

  const response = await fetchWithTimeout(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages,
      stream: false
    })
  })

  if (!response.ok) {
    if (response.status === 0 || response.status === 404) {
      throw new Error('Ollama not running. Start it with: ollama serve')
    }
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error || `Ollama error: ${response.status}`)
  }

  const data = await response.json()
  return data.message?.content || 'No response generated'
}
