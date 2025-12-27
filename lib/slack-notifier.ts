import { OrganizationSettingsModel } from '@/lib/models/organization-settings'

interface MessageData {
  customerEmail: string
  subject: string
}

interface SlackSettings {
  enabled: boolean
  webhookUrl?: string
}

interface SlackBlock {
  type: string
  text?: { type: string; text: string; emoji?: boolean }
  fields?: { type: string; text: string }[]
  elements?: { type: string; text: { type: string; text: string }; url?: string; style?: string }[]
}

interface SlackPayload {
  text: string
  blocks: SlackBlock[]
}

export class SlackNotifier {
  /**
   * Main entry point - called from email inbound webhook
   * Sends Slack notification for each new email
   */
  static async notifyNewEmail(
    organizationId: string,
    messageData: MessageData
  ): Promise<void> {
    try {
      // 1. Get org settings (with decrypted webhook URL)
      const settings = await this.getSlackSettings(organizationId)

      if (!settings) {
        console.log('[SlackNotifier] No Slack settings found for org:', organizationId)
        return
      }

      if (!settings.enabled) {
        console.log('[SlackNotifier] Slack notifications disabled for org:', organizationId)
        return
      }

      if (!settings.webhookUrl) {
        console.log('[SlackNotifier] No webhook URL configured for org:', organizationId)
        return
      }

      console.log('[SlackNotifier] Sending notification for org:', organizationId)

      // 2. Format and send notification
      const payload = this.formatMessage(messageData)
      await this.sendToSlack(settings.webhookUrl, payload)
      console.log('[SlackNotifier] Notification sent successfully')
    } catch (error) {
      // Log but don't throw - notifications shouldn't block email processing
      console.error('[SlackNotifier] Error sending notification:', error)
    }
  }

  /**
   * Get Slack settings from organization settings
   */
  private static async getSlackSettings(orgId: string): Promise<SlackSettings | null> {
    try {
      const settings = await OrganizationSettingsModel.findByOrganizationId(orgId)
      if (!settings) return null

      // Access slackIntegration from settings (will be added to schema)
      const slackIntegration = (settings as Record<string, unknown>).slackIntegration as SlackSettings | undefined
      return slackIntegration || null
    } catch (error) {
      console.error('[SlackNotifier] Error fetching settings:', error)
      return null
    }
  }

  /**
   * Format Slack message payload using Block Kit
   */
  private static formatMessage(data: MessageData): SlackPayload {
    const appUrl = 'https://www.aidly.me/app/login'

    return {
      text: `New support email from ${data.customerEmail}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: 'New Support Email',
            emoji: true
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*From:*\n${data.customerEmail}`
            },
            {
              type: 'mrkdwn',
              text: `*Subject:*\n${data.subject}`
            }
          ]
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View in Aidly'
              },
              url: appUrl,
              style: 'primary'
            }
          ]
        }
      ]
    }
  }

  /**
   * Send payload to Slack webhook
   */
  private static async sendToSlack(webhookUrl: string, payload: SlackPayload): Promise<void> {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Slack API error: ${response.status} - ${text}`)
    }
  }

  /**
   * Test Slack webhook configuration (for Settings UI)
   */
  static async testWebhook(webhookUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate URL format
      if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
        return {
          success: false,
          error: 'Invalid webhook URL. Must start with https://hooks.slack.com/'
        }
      }

      const payload: SlackPayload = {
        text: 'Test notification from Aidly',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: 'Test Notification',
              emoji: true
            }
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'Your Slack integration is working correctly! You will receive notifications here when new support emails arrive.'
            }
          }
        ]
      }

      await this.sendToSlack(webhookUrl, payload)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}
