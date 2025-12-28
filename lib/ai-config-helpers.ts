import { type AIProviderConfig } from './settings-context'
import { OrganizationSettingsModel } from './models/organization-settings'
import { TokenUsageModel } from './models/token-usage'
import { db } from './database'

/**
 * Managed AI configuration for free and plus plans
 * Uses Claude 3.5 Haiku for cost efficiency
 */
export function getManagedAIConfig(): AIProviderConfig {
  const apiKey = process.env.ANTHROPIC_API_KEY_MANAGED

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY_MANAGED environment variable is not set')
  }

  return {
    provider: 'anthropic',
    model: 'claude-3-5-haiku-20241022',
    apiKey,
    temperature: 0.7,
    maxTokens: 1000,
  }
}

/**
 * Get AI configuration based on organization's plan type
 * - Managed plans (free, plus): Use server's Anthropic API key
 * - BYOK plans (pro, enterprise): Use organization's own API key from settings
 */
export async function getAIConfigForOrganization(
  organizationId: string
): Promise<{
  config: AIProviderConfig
  isManaged: boolean
  planType: string
}> {
  // Get organization's plan type
  const orgResult = await db.query<{ plan_type: string }>(
    `SELECT plan_type FROM organizations WHERE id = $1`,
    [organizationId]
  )

  if (orgResult.rows.length === 0) {
    throw new Error('Organization not found')
  }

  const planType = orgResult.rows[0].plan_type
  const isManaged = TokenUsageModel.isManagedPlan(planType)

  if (isManaged) {
    // Managed plan: use server's API key
    return {
      config: getManagedAIConfig(),
      isManaged: true,
      planType,
    }
  }

  // BYOK plan: get organization's settings
  const orgSettings = await OrganizationSettingsModel.findByOrganizationId(organizationId)

  if (!orgSettings?.aiConfig) {
    throw new Error('AI configuration is required. Please configure your AI provider in settings.')
  }

  if (!orgSettings.aiConfig.apiKey && orgSettings.aiConfig.provider !== 'local') {
    throw new Error('API key is required. Please add your API key in settings.')
  }

  return {
    config: {
      provider: orgSettings.aiConfig.provider,
      model: orgSettings.aiConfig.model,
      apiKey: orgSettings.aiConfig.apiKey,
      customEndpoint: orgSettings.aiConfig.customEndpoint,
      localEndpoint: orgSettings.aiConfig.localEndpoint,
      temperature: orgSettings.aiConfig.temperature ?? 0.7,
      maxTokens: orgSettings.aiConfig.maxTokens ?? 1000,
    },
    isManaged: false,
    planType,
  }
}

/**
 * Check if an organization can use AI and get the configuration
 * Combines token limit check (for managed plans) with config retrieval
 */
export async function canUseAIWithConfig(
  organizationId: string
): Promise<{
  allowed: boolean
  reason?: string
  config?: AIProviderConfig
  isManaged?: boolean
  planType?: string
  tokenUsage?: {
    used: number
    limit: number | null
    remaining: number | null
  }
}> {
  // First check token limits for managed plans
  const tokenCheck = await TokenUsageModel.canUseAI(organizationId)

  if (!tokenCheck.allowed) {
    return {
      allowed: false,
      reason: tokenCheck.reason,
      tokenUsage: tokenCheck.usage ? {
        used: tokenCheck.usage.used,
        limit: tokenCheck.usage.limit,
        remaining: tokenCheck.usage.remaining,
      } : undefined,
    }
  }

  // Get AI configuration
  try {
    const { config, isManaged, planType } = await getAIConfigForOrganization(organizationId)

    return {
      allowed: true,
      config,
      isManaged,
      planType,
      tokenUsage: tokenCheck.usage ? {
        used: tokenCheck.usage.used,
        limit: tokenCheck.usage.limit,
        remaining: tokenCheck.usage.remaining,
      } : undefined,
    }
  } catch (error) {
    return {
      allowed: false,
      reason: error instanceof Error ? error.message : 'Failed to load AI configuration',
    }
  }
}
