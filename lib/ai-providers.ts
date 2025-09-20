// import { generateText as aiGenerateText } from "ai"
// import { openai, createOpenAI } from "@ai-sdk/openai"
import { type AIProviderConfig } from "./settings-context"

export interface AIProvider {
  name: string
  models: string[]
  generateText: (params: GenerateTextParams) => Promise<string>
  testConnection: (apiKey: string, model?: string) => Promise<{ success: boolean; error?: string }>
}

export interface GenerateTextParams {
  system: string
  prompt: string
  apiKey: string
  model: string
  temperature?: number
  maxTokens?: number
}

class OpenAIProvider implements AIProvider {
  name = "OpenAI"
  models = [
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-4",
    "gpt-3.5-turbo"
  ]

  async generateText(params: GenerateTextParams): Promise<string> {
    const { system, prompt, apiKey, model, temperature = 0.7, maxTokens = 1000 } = params

    if (!apiKey || !apiKey.startsWith('sk-')) {
      throw new Error("Invalid OpenAI API key format")
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt }
          ],
          temperature,
          max_tokens: maxTokens,
          stream: false
        })
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid OpenAI API key")
        } else if (response.status === 429) {
          throw new Error("OpenAI rate limit exceeded. Please try again later.")
        } else if (response.status === 400) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(`OpenAI API error: ${errorData.error?.message || 'Bad request'}`)
        } else {
          throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
        }
      }

      const data = await response.json()
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error("Invalid response from OpenAI API")
      }

      return data.choices[0].message.content || "No response generated"
    } catch (error) {
      console.error('OpenAI generateText error:', error)
      if (error instanceof Error) {
        throw error
      }
      throw new Error("Failed to generate text with OpenAI")
    }
  }

  async testConnection(apiKey: string, model = "gpt-3.5-turbo"): Promise<{ success: boolean; error?: string }> {
    if (!apiKey || !apiKey.startsWith('sk-')) {
      return { success: false, error: "Invalid API key format. OpenAI API keys start with 'sk-'" }
    }

    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: "Invalid API key. Please check your OpenAI API key." }
        } else if (response.status === 429) {
          return { success: false, error: "Rate limit exceeded. Please try again later." }
        } else {
          return { success: false, error: `OpenAI API error: ${response.status} ${response.statusText}` }
        }
      }

      const data = await response.json()
      
      // Check if the requested model is available
      const modelExists = data.data?.some((m: { id: string }) => m.id === model)
      if (!modelExists) {
        return { success: false, error: `Model '${model}' is not available with this API key.` }
      }

      return { success: true }
    } catch (error) {
      console.error('OpenAI connection test error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to connect to OpenAI API" 
      }
    }
  }
}

class AnthropicProvider implements AIProvider {
  name = "Anthropic"
  models = [
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-opus-20240229",
    "claude-3-sonnet-20240229",
    "claude-3-haiku-20240307"
  ]

  async generateText(params: GenerateTextParams): Promise<string> {
    const { system, prompt, apiKey, model, temperature = 0.7, maxTokens = 1000 } = params

    if (!apiKey || !apiKey.startsWith('sk-ant-')) {
      throw new Error("Invalid Anthropic API key format")
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey.trim(),
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model || 'claude-3-haiku-20240307',
          max_tokens: maxTokens,
          temperature,
          system: system,
          messages: [
            { role: 'user', content: prompt }
          ]
        })
      })

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Invalid Anthropic API key")
        } else if (response.status === 429) {
          throw new Error("Anthropic rate limit exceeded. Please try again later.")
        } else if (response.status === 400) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(`Anthropic API error: ${errorData.error?.message || 'Bad request'}`)
        } else {
          throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`)
        }
      }

      const data = await response.json()
      
      if (!data.content || !data.content[0] || !data.content[0].text) {
        throw new Error("Invalid response from Anthropic API")
      }

      return data.content[0].text || "No response generated"
    } catch (error) {
      console.error('Anthropic generateText error:', error)
      if (error instanceof Error) {
        throw error
      }
      throw new Error("Failed to generate text with Anthropic")
    }
  }

  async testConnection(apiKey: string): Promise<{ success: boolean; error?: string }> {
    if (!apiKey || !apiKey.startsWith('sk-ant-')) {
      return { success: false, error: "Invalid API key format. Anthropic API keys start with 'sk-ant-'" }
    }

    try {
      // Use a simple API call to test the key
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey.trim(),
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'test' }]
        })
      })

      if (!response.ok) {
        if (response.status === 401) {
          return { success: false, error: "Invalid API key. Please check your Anthropic API key." }
        } else if (response.status === 429) {
          return { success: false, error: "Rate limit exceeded. Please try again later." }
        } else {
          return { success: false, error: `Anthropic API error: ${response.status} ${response.statusText}` }
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Anthropic connection test error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to connect to Anthropic API" 
      }
    }
  }
}


class LocalAIProvider implements AIProvider {
  name = "Local AI"
  models = ["local-model"]

  async generateText(params: GenerateTextParams): Promise<string> {
    const { system, prompt, apiKey, model, temperature = 0.7, maxTokens = 1000 } = params
    
    // Extract endpoint from apiKey field for local AI (we'll use it as endpoint URL)
    const endpoint = apiKey || "http://localhost:1234"
    
    try {
      const response = await fetch(`${endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || "local-model",
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt }
          ],
          temperature,
          max_tokens: maxTokens,
          stream: false
        })
      })

      if (!response.ok) {
        throw new Error(`Local AI request failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data.choices?.[0]?.message?.content || "No response generated"
    } catch (error) {
      console.error("Local AI provider error:", error)
      if (error instanceof Error) {
        if (error.message.includes('fetch') || error.name === 'TypeError') {
          throw new Error(`Cannot connect to local AI server at ${endpoint}. Please ensure your local AI server is running.`)
        }
        throw new Error(`Local AI error: ${error.message}`)
      }
      throw new Error('Local AI server connection failed')
    }
  }

  async testConnection(endpoint: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${endpoint}/v1/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        return { success: false, error: `Connection failed: ${response.status} ${response.statusText}` }
      }

      const data = await response.json()
      const availableModels = data.data?.map((m: { id: string }) => m.id) || []
      
      return { 
        success: true, 
        error: `Connected successfully. Available models: ${availableModels.join(', ') || 'None detected'}`
      }
    } catch (error) {
      return { 
        success: false, 
        error: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
    }
  }
}

export const AI_PROVIDERS: Record<string, AIProvider> = {
  openai: new OpenAIProvider(),
  anthropic: new AnthropicProvider(),
  local: new LocalAIProvider(),
}

export class AIService {
  private config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
  }

  async generateText(system: string, prompt: string): Promise<string> {
    console.log('AIService generateText called with config:', {
      provider: this.config.provider,
      model: this.config.model,
      hasApiKey: !!this.config.apiKey,
      apiKeyPrefix: this.config.apiKey?.substring(0, 10) + '...'
    })

    const provider = AI_PROVIDERS[this.config.provider]
    if (!provider) {
      throw new Error(`Unknown AI provider: ${this.config.provider}`)
    }

    if (!this.config.apiKey) {
      throw new Error("API key is required")
    }

    return provider.generateText({
      system,
      prompt,
      apiKey: this.config.apiKey,
      model: this.config.model,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
    })
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    const provider = AI_PROVIDERS[this.config.provider]
    if (!provider) {
      return { success: false, error: `Unknown AI provider: ${this.config.provider}` }
    }

    if (!this.config.apiKey) {
      return { success: false, error: "API key is required" }
    }

    return provider.testConnection(this.config.apiKey, this.config.model)
  }

  getAvailableModels(): string[] {
    const provider = AI_PROVIDERS[this.config.provider]
    return provider?.models || []
  }
}
