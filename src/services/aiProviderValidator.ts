/**
 * AI Provider API Key Validator
 * Tests if AI provider API keys are valid by making minimal test requests
 */

export interface AIValidationResult {
  valid: boolean
  message: string
  model?: string
}

/**
 * Test if an OpenAI API key is valid
 * Makes a minimal chat completion request with max_tokens: 1
 */
export async function testOpenAIKey(apiKey: string): Promise<AIValidationResult> {
  if (!apiKey || apiKey.trim().length === 0) {
    return {
      valid: false,
      message: 'API key is empty'
    }
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1
      })
    })

    if (response.status === 401) {
      return {
        valid: false,
        message: 'Invalid API key'
      }
    }

    if (response.status === 429) {
      // Rate limited but key is valid
      return {
        valid: true,
        message: 'API key valid (rate limited)',
        model: 'gpt-3.5-turbo'
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      return {
        valid: false,
        message: error.error?.message || `HTTP error: ${response.status}`
      }
    }

    const data = await response.json()
    return {
      valid: true,
      message: 'Connection successful',
      model: data.model || 'gpt-3.5-turbo'
    }

  } catch (error) {
    console.error('[OpenAI Validator] Test failed:', error)
    return {
      valid: false,
      message: error instanceof Error ? error.message : 'Network error'
    }
  }
}

/**
 * Test if a Claude (Anthropic) API key is valid
 * Makes a minimal messages request with max_tokens: 1
 */
export async function testClaudeKey(apiKey: string): Promise<AIValidationResult> {
  if (!apiKey || apiKey.trim().length === 0) {
    return {
      valid: false,
      message: 'API key is empty'
    }
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }]
      })
    })

    if (response.status === 401) {
      return {
        valid: false,
        message: 'Invalid API key'
      }
    }

    if (response.status === 429) {
      // Rate limited but key is valid
      return {
        valid: true,
        message: 'API key valid (rate limited)',
        model: 'claude-3-haiku'
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      return {
        valid: false,
        message: error.error?.message || `HTTP error: ${response.status}`
      }
    }

    const data = await response.json()
    return {
      valid: true,
      message: 'Connection successful',
      model: data.model || 'claude-3-haiku'
    }

  } catch (error) {
    console.error('[Claude Validator] Test failed:', error)
    return {
      valid: false,
      message: error instanceof Error ? error.message : 'Network error'
    }
  }
}

/**
 * Test if a Groq API key is valid
 * Makes a minimal chat completion request with max_tokens: 1
 */
export async function testGroqKey(apiKey: string): Promise<AIValidationResult> {
  if (!apiKey || apiKey.trim().length === 0) {
    return {
      valid: false,
      message: 'API key is empty'
    }
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1
      })
    })

    if (response.status === 401) {
      return {
        valid: false,
        message: 'Invalid API key'
      }
    }

    if (response.status === 429) {
      // Rate limited but key is valid
      return {
        valid: true,
        message: 'API key valid (rate limited)',
        model: 'llama-3.1-8b-instant'
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      return {
        valid: false,
        message: error.error?.message || `HTTP error: ${response.status}`
      }
    }

    const data = await response.json()
    return {
      valid: true,
      message: 'Connection successful',
      model: data.model || 'llama-3.1-8b-instant'
    }

  } catch (error) {
    console.error('[Groq Validator] Test failed:', error)
    return {
      valid: false,
      message: error instanceof Error ? error.message : 'Network error'
    }
  }
}

/**
 * Test any AI provider API key
 */
export async function testAIProviderKey(
  provider: 'openai' | 'claude' | 'groq',
  apiKey: string
): Promise<AIValidationResult> {
  switch (provider) {
    case 'openai':
      return testOpenAIKey(apiKey)
    case 'claude':
      return testClaudeKey(apiKey)
    case 'groq':
      return testGroqKey(apiKey)
    default:
      return {
        valid: false,
        message: `Unknown provider: ${provider}`
      }
  }
}
