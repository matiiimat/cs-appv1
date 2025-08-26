import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
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
    const { text } = await generateText({
      model: openai(params.model, {
        apiKey: params.apiKey,
      }),
      system: params.system,
      prompt: params.prompt,
      temperature: params.temperature || 0.7,
      maxTokens: params.maxTokens || 1000,
    })
    return text
  }

  async testConnection(apiKey: string, model = "gpt-3.5-turbo"): Promise<{ success: boolean; error?: string }> {
    try {
      await generateText({
        model: openai(model, { 
          apiKey 
        }),
        prompt: "Hello",
        maxTokens: 5,
      })
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Connection failed" 
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

export const AI_PROVIDERS: Record<string, AIProvider> = {
  openai: new OpenAIProvider(),
  anthropic: new AnthropicProvider(),
  google: new GoogleProvider(),
  azure: new AzureProvider(),
  custom: new CustomProvider(),
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