/**
 * AI API Key Validator
 * Tests API keys for OpenAI, Anthropic (Claude), and Groq
 */

export type AIProvider = 'openai' | 'anthropic' | 'groq'

export interface AIKeyTestResult {
  valid: boolean
  message: string
  provider: AIProvider
}

/**
 * Test an AI API key by making a minimal API call
 */
export async function testAIKey(provider: AIProvider, apiKey: string): Promise<AIKeyTestResult> {
  if (!apiKey || apiKey.trim().length === 0) {
    return { valid: false, message: 'API key is empty', provider }
  }

  try {
    switch (provider) {
      case 'openai':
        return await testOpenAIKey(apiKey)
      case 'anthropic':
        return await testAnthropicKey(apiKey)
      case 'groq':
        return await testGroqKey(apiKey)
      default:
        return { valid: false, message: 'Unknown provider', provider }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { valid: false, message, provider }
  }
}

/**
 * Test OpenAI API key using the models endpoint (minimal cost)
 */
async function testOpenAIKey(apiKey: string): Promise<AIKeyTestResult> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    })

    if (response.ok) {
      return { valid: true, message: 'API key is valid', provider: 'openai' }
    }

    if (response.status === 401) {
      return { valid: false, message: 'Invalid API key', provider: 'openai' }
    }

    if (response.status === 429) {
      // Rate limited but key is valid
      return { valid: true, message: 'API key is valid (rate limited)', provider: 'openai' }
    }

    return { valid: false, message: `API error: ${response.status}`, provider: 'openai' }
  } catch (error) {
    return { valid: false, message: 'Connection failed', provider: 'openai' }
  }
}

/**
 * Test Anthropic API key using a minimal messages request
 */
async function testAnthropicKey(apiKey: string): Promise<AIKeyTestResult> {
  try {
    // Use the messages endpoint with minimal input
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    })

    if (response.ok) {
      return { valid: true, message: 'API key is valid', provider: 'anthropic' }
    }

    if (response.status === 401) {
      return { valid: false, message: 'Invalid API key', provider: 'anthropic' }
    }

    if (response.status === 429) {
      // Rate limited but key is valid
      return { valid: true, message: 'API key is valid (rate limited)', provider: 'anthropic' }
    }

    // Check for specific error messages
    try {
      const errorData = await response.json()
      if (errorData.error?.message) {
        return { valid: false, message: errorData.error.message, provider: 'anthropic' }
      }
    } catch {
      // Ignore JSON parse errors
    }

    return { valid: false, message: `API error: ${response.status}`, provider: 'anthropic' }
  } catch (error) {
    return { valid: false, message: 'Connection failed', provider: 'anthropic' }
  }
}

/**
 * Test Groq API key using the models endpoint
 */
async function testGroqKey(apiKey: string): Promise<AIKeyTestResult> {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    })

    if (response.ok) {
      return { valid: true, message: 'API key is valid', provider: 'groq' }
    }

    if (response.status === 401) {
      return { valid: false, message: 'Invalid API key', provider: 'groq' }
    }

    if (response.status === 429) {
      // Rate limited but key is valid
      return { valid: true, message: 'API key is valid (rate limited)', provider: 'groq' }
    }

    return { valid: false, message: `API error: ${response.status}`, provider: 'groq' }
  } catch (error) {
    return { valid: false, message: 'Connection failed', provider: 'groq' }
  }
}
