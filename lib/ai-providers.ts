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
    // TODO: Implement OpenAI integration
    // For now, return a mock response
    console.log("OpenAI provider called with params:", params)
    return `Mock AI response for: ${params.prompt}`
  }

  async testConnection(apiKey: string, model = "gpt-3.5-turbo"): Promise<{ success: boolean; error?: string }> {
    // TODO: Implement OpenAI connection test
    console.log("Testing OpenAI connection with key:", apiKey?.substring(0, 10) + "...", "model:", model)
    return { success: true }
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

  async generateText(/* _params: GenerateTextParams */): Promise<string> {
    // Note: This would require @ai-sdk/anthropic package
    throw new Error("Anthropic provider requires @ai-sdk/anthropic package to be installed")
  }

  async testConnection(/* _apiKey: string */): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: "Anthropic provider not yet implemented" }
  }
}

class GoogleProvider implements AIProvider {
  name = "Google"
  models = [
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-1.0-pro"
  ]

  async generateText(/* _params: GenerateTextParams */): Promise<string> {
    // Note: This would require @ai-sdk/google package
    throw new Error("Google provider requires @ai-sdk/google package to be installed")
  }

  async testConnection(/* _apiKey: string */): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: "Google provider not yet implemented" }
  }
}

class AzureProvider implements AIProvider {
  name = "Azure OpenAI"
  models = [
    "gpt-4o",
    "gpt-4",
    "gpt-35-turbo"
  ]

  async generateText(/* _params: GenerateTextParams */): Promise<string> {
    // Note: This would require @ai-sdk/azure package
    throw new Error("Azure provider requires @ai-sdk/azure package to be installed")
  }

  async testConnection(/* _apiKey: string */): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: "Azure provider not yet implemented" }
  }
}

class CustomProvider implements AIProvider {
  name = "Custom"
  models = ["custom-model"]

  async generateText(/* _params: GenerateTextParams */): Promise<string> {
    throw new Error("Custom provider implementation required")
  }

  async testConnection(/* _apiKey: string */): Promise<{ success: boolean; error?: string }> {
    return { success: false, error: "Custom provider not yet implemented" }
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
      throw new Error(`Local AI provider failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
  google: new GoogleProvider(),
  azure: new AzureProvider(),
  custom: new CustomProvider(),
  local: new LocalAIProvider(),
}

export class AIService {
  private config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
  }

  async generateText(system: string, prompt: string): Promise<string> {
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