/**
 * GDPR Model - Data Export and Account Deletion
 *
 * Provides GDPR compliance features:
 * - Data export (Article 20 - Right to Data Portability)
 * - Account deletion (Article 17 - Right to Erasure)
 *
 * No additional database tables required - uses existing schema.
 */

import { db } from '@/lib/database';
import { DatabaseEncryption } from '@/lib/encryption';

export interface ExportedData {
  exportedAt: string;
  organization: {
    id: string;
    name: string;
    planType: string;
    planStatus: string;
    createdAt: string;
  };
  users: Array<{
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
    createdAt: string;
  }>;
  messages: Array<{
    id: string;
    ticketId: string;
    customerName: string | null;
    customerEmail: string | null;
    subject: string | null;
    message: string | null;
    category: string | null;
    aiSuggestedResponse: string | null;
    status: string;
    processedAt: string | null;
    createdAt: string;
  }>;
  settings: Record<string, unknown> | null;
  activityLog: Array<{
    id: string;
    activityType: string;
    createdAt: string;
  }>;
  knowledgeBase: Array<{
    id: string;
    caseSummary: string;
    resolution: string;
    category: string | null;
    createdAt: string;
  }>;
}

export class GDPRModel {
  /**
   * Get organization's encryption key
   */
  private static async getOrganizationKey(organizationId: string): Promise<string> {
    const result = await db.query<{ encrypted_data_key: string }>(
      'SELECT encrypted_data_key FROM organizations WHERE id = $1',
      [organizationId]
    );

    if (result.rows.length === 0) {
      throw new Error('Organization not found');
    }

    return result.rows[0].encrypted_data_key;
  }

  /**
   * Decrypt a single field from database storage format
   */
  private static decryptField(value: string | null, orgKey: string): string | null {
    if (!value) return null;
    try {
      return DatabaseEncryption.decryptFromStorage(value, orgKey);
    } catch (error) {
      console.error('Failed to decrypt field:', error);
      return '[DECRYPTION_ERROR]';
    }
  }

  /**
   * Export all organization data with decrypted PII
   * GDPR Article 20 - Right to Data Portability
   */
  static async exportOrganizationData(organizationId: string): Promise<ExportedData> {
    const orgKey = await this.getOrganizationKey(organizationId);

    // Fetch all data in parallel for efficiency
    const [orgResult, usersResult, messagesResult, settingsResult, activityResult, kbResult] =
      await Promise.all([
        // Organization info
        db.query<{
          id: string;
          name: string;
          plan_type: string;
          plan_status: string;
          created_at: Date;
        }>(
          'SELECT id, name, plan_type, plan_status, created_at FROM organizations WHERE id = $1',
          [organizationId]
        ),

        // Users
        db.query<{
          id: string;
          email: string;
          name: string;
          role: string;
          is_active: boolean;
          created_at: Date;
        }>(
          'SELECT id, email, name, role, is_active, created_at FROM users WHERE organization_id = $1 ORDER BY created_at ASC',
          [organizationId]
        ),

        // Messages (encrypted fields)
        db.query<{
          id: string;
          ticket_id: string;
          customer_name: string | null;
          customer_email: string | null;
          subject: string | null;
          message: string | null;
          category: string | null;
          ai_suggested_response: string | null;
          status: string;
          processed_at: Date | null;
          created_at: Date;
        }>(
          `SELECT id, ticket_id, customer_name, customer_email, subject, message,
                  category, ai_suggested_response, status, processed_at, created_at
           FROM messages
           WHERE organization_id = $1
           ORDER BY created_at DESC`,
          [organizationId]
        ),

        // Organization settings
        db.query<{
          settings_data: string;
        }>(
          'SELECT settings_data FROM organization_settings WHERE organization_id = $1',
          [organizationId]
        ),

        // Activity log (limited to last 1000 entries for performance)
        db.query<{
          id: string;
          activity_type: string;
          created_at: Date;
        }>(
          `SELECT id, activity_type, created_at
           FROM activity_log
           WHERE organization_id = $1
           ORDER BY created_at DESC
           LIMIT 1000`,
          [organizationId]
        ),

        // Knowledge base entries
        db.query<{
          id: string;
          case_summary: string;
          resolution: string;
          category: string | null;
          created_at: Date;
        }>(
          `SELECT id, case_summary, resolution, category, created_at
           FROM knowledge_base_entries
           WHERE organization_id = $1
           ORDER BY created_at DESC`,
          [organizationId]
        ),
      ]);

    // Decrypt message PII fields
    const decryptedMessages = messagesResult.rows.map(msg => ({
      id: msg.id,
      ticketId: msg.ticket_id,
      customerName: this.decryptField(msg.customer_name, orgKey),
      customerEmail: this.decryptField(msg.customer_email, orgKey),
      subject: this.decryptField(msg.subject, orgKey),
      message: this.decryptField(msg.message, orgKey),
      category: msg.category,
      aiSuggestedResponse: this.decryptField(msg.ai_suggested_response, orgKey),
      status: msg.status,
      processedAt: msg.processed_at ? new Date(msg.processed_at).toISOString() : null,
      createdAt: new Date(msg.created_at).toISOString(),
    }));

    // Parse settings (decrypt first, then remove sensitive keys like API keys)
    let settingsData: Record<string, unknown> | null = null;
    if (settingsResult.rows[0]?.settings_data) {
      try {
        const decryptedSettings = DatabaseEncryption.decryptFromStorage(settingsResult.rows[0].settings_data, orgKey);
        const rawSettings = JSON.parse(decryptedSettings);
        // Remove sensitive fields from export (API keys, webhook URLs)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { aiConfig: _ai, slackIntegration: _slack, ...safeSettings } = rawSettings;
        settingsData = safeSettings;
      } catch {
        settingsData = null;
      }
    }

    const org = orgResult.rows[0];

    return {
      exportedAt: new Date().toISOString(),
      organization: {
        id: org?.id || organizationId,
        name: org?.name || 'Unknown',
        planType: org?.plan_type || 'free',
        planStatus: org?.plan_status || 'active',
        createdAt: org?.created_at ? new Date(org.created_at).toISOString() : new Date().toISOString(),
      },
      users: usersResult.rows.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        isActive: u.is_active,
        createdAt: new Date(u.created_at).toISOString(),
      })),
      messages: decryptedMessages,
      settings: settingsData,
      activityLog: activityResult.rows.map(a => ({
        id: a.id,
        activityType: a.activity_type,
        createdAt: new Date(a.created_at).toISOString(),
      })),
      knowledgeBase: kbResult.rows.map(kb => ({
        id: kb.id,
        caseSummary: kb.case_summary,
        resolution: kb.resolution,
        category: kb.category,
        createdAt: new Date(kb.created_at).toISOString(),
      })),
    };
  }

  /**
   * Check if user is organization admin
   */
  static async isOrganizationAdmin(organizationId: string, userId: string): Promise<boolean> {
    const result = await db.query<{ role: string }>(
      'SELECT role FROM users WHERE id = $1 AND organization_id = $2',
      [userId, organizationId]
    );

    return result.rows.length > 0 && result.rows[0].role === 'admin';
  }

  /**
   * Permanently delete organization and all associated data
   * GDPR Article 17 - Right to Erasure
   *
   * This performs immediate hard deletion. All data is irrecoverable.
   */
  static async deleteOrganization(organizationId: string): Promise<void> {
    await db.transaction(async (client) => {
      // Delete in order respecting foreign key constraints
      // Most tables have ON DELETE CASCADE, but explicit for safety

      // 1. Delete activity logs
      await client.query(
        'DELETE FROM activity_log WHERE organization_id = $1',
        [organizationId]
      );

      // 2. Delete draft replies
      await client.query(
        'DELETE FROM draft_replies WHERE organization_id = $1',
        [organizationId]
      );

      // 3. Delete knowledge base entries
      await client.query(
        'DELETE FROM knowledge_base_entries WHERE organization_id = $1',
        [organizationId]
      );

      // 4. Delete messages
      await client.query(
        'DELETE FROM messages WHERE organization_id = $1',
        [organizationId]
      );

      // 5. Delete organization settings
      await client.query(
        'DELETE FROM organization_settings WHERE organization_id = $1',
        [organizationId]
      );

      // 6. Delete email usage tracking
      await client.query(
        'DELETE FROM email_usage WHERE organization_id = $1',
        [organizationId]
      );

      // 7. Delete token usage tracking
      await client.query(
        'DELETE FROM token_usage WHERE organization_id = $1',
        [organizationId]
      );

      // 8. Delete users (stripe_customers may cascade)
      await client.query(
        'DELETE FROM users WHERE organization_id = $1',
        [organizationId]
      );

      // 9. Finally delete the organization
      await client.query(
        'DELETE FROM organizations WHERE id = $1',
        [organizationId]
      );
    });
  }

  /**
   * Get organization deletion status
   */
  static async getOrganizationStats(organizationId: string): Promise<{
    messageCount: number;
    userCount: number;
    createdAt: string;
  }> {
    const [messageResult, userResult, orgResult] = await Promise.all([
      db.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM messages WHERE organization_id = $1',
        [organizationId]
      ),
      db.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM users WHERE organization_id = $1',
        [organizationId]
      ),
      db.query<{ created_at: Date }>(
        'SELECT created_at FROM organizations WHERE id = $1',
        [organizationId]
      ),
    ]);

    return {
      messageCount: parseInt(messageResult.rows[0]?.count || '0'),
      userCount: parseInt(userResult.rows[0]?.count || '0'),
      createdAt: orgResult.rows[0]?.created_at
        ? new Date(orgResult.rows[0].created_at).toISOString()
        : new Date().toISOString(),
    };
  }
}
