import { z } from 'zod';
import { db } from '@/lib/database';
import { PIIEncryption, DatabaseEncryption } from '@/lib/encryption';

// Message status enum
export const MessageStatus = z.enum(['new', 'to_send_queue', 'rejected', 'edited', 'sent', 'to_review_queue']);
export type MessageStatusType = z.infer<typeof MessageStatus>;

// Message schema for validation
export const MessageSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  ticket_id: z.string(),
  customer_name: z.string().nullable(),
  customer_email: z.string().email().nullable(),
  subject: z.string().nullable(),
  message: z.string().nullable(),
  category: z.string().nullable(),
  ai_suggested_response: z.string().nullable(),
  status: MessageStatus,
  agent_id: z.string().uuid().nullable(),
  processed_at: z.date().nullable(),
  response_time_ms: z.number().int().nullable(),
  ai_reviewed: z.boolean().default(false),
  is_generating: z.boolean().default(false),
  edit_history: z.array(z.any()).default([]),
  metadata: z.record(z.any()).default({}),
  created_at: z.date(),
  updated_at: z.date(),
});

export type Message = z.infer<typeof MessageSchema>;

// Input schemas for API operations
export const CreateMessageSchema = z.object({
  customer_name: z.string().min(1),
  customer_email: z.string().email(),
  subject: z.string().min(1),
  message: z.string().min(1),
  category: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

export const UpdateMessageSchema = z.object({
  category: z.string().optional(),
  ai_suggested_response: z.string().optional(),
  status: MessageStatus.optional(),
  agent_id: z.string().uuid().optional(),
  ai_reviewed: z.boolean().optional(),
  is_generating: z.boolean().optional(),
  edit_history: z.array(z.any()).optional(),
  metadata: z.record(z.any()).optional(),
});

export type CreateMessageInput = z.infer<typeof CreateMessageSchema>;
export type UpdateMessageInput = z.infer<typeof UpdateMessageSchema>;

export class MessageModel {
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
   * Encrypt message data before storage
   */
  private static encryptMessageData(messageData: Record<string, unknown>, organizationKey: string): Record<string, unknown> {
    const encryptedFields = PIIEncryption.encryptMessageData(messageData, organizationKey);

    return {
      ...messageData,
      ...encryptedFields,
    };
  }

  /**
   * Decrypt message data after retrieval
   */
  private static decryptMessageData(dbRow: Record<string, unknown>, organizationKey: string): Message {
    const fieldsToDecrypt = {
      customer_name: dbRow.customer_name,
      customer_email: dbRow.customer_email,
      subject: dbRow.subject,
      message: dbRow.message,
      ai_suggested_response: dbRow.ai_suggested_response,
    };

    const decryptedFields: Record<string, string | null> = {};

    for (const [key, value] of Object.entries(fieldsToDecrypt)) {
      if (value && typeof value === 'string') {
        try {
          decryptedFields[key] = DatabaseEncryption.decryptFromStorage(value, organizationKey);
        } catch (error) {
          console.error(`Failed to decrypt field ${key}:`, error);
          decryptedFields[key] = '[DECRYPTION_ERROR]';
        }
      } else {
        decryptedFields[key] = null;
      }
    }

    return {
      ...dbRow,
      ...decryptedFields,
    } as Message;
  }

  /**
   * Create a new message
   */
  static async create(organizationId: string, messageData: CreateMessageInput): Promise<Message> {
    const organizationKey = await this.getOrganizationKey(organizationId);

    // Generate ticket ID
    const counterResult = await db.query<{ counter: number }>(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_id FROM 2) AS INTEGER)), 0) + 1 as counter
      FROM messages
      WHERE organization_id = $1
    `, [organizationId]);
    const counter = counterResult.rows[0].counter;
    const ticketId = `#${counter.toString().padStart(6, '0')}`;

    // Encrypt PII data
    const encryptedData = this.encryptMessageData(messageData, organizationKey);

    const result = await db.query(`
      INSERT INTO messages (
        organization_id, ticket_id, customer_name, customer_email,
        subject, message, category, metadata, status, ai_reviewed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      organizationId,
      ticketId,
      encryptedData.customer_name || null,
      encryptedData.customer_email || null,
      encryptedData.subject || null,
      encryptedData.message || null,
      messageData.category || null,
      JSON.stringify(messageData.metadata || {}),
      'new',
      false
    ]);

    const dbRow = result.rows[0];
    return this.decryptMessageData(dbRow as Record<string, unknown>, organizationKey);
  }

  /**
   * Get message by ID
   */
  static async findById(organizationId: string, messageId: string): Promise<Message | null> {
    const organizationKey = await this.getOrganizationKey(organizationId);

    const result = await db.query(
      'SELECT * FROM messages WHERE organization_id = $1 AND id = $2',
      [organizationId, messageId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.decryptMessageData(result.rows[0] as Record<string, unknown>, organizationKey);
  }

  /**
   * Get all messages for organization
   */
  static async findByOrganization(
    organizationId: string,
    options: {
      status?: MessageStatusType;
      limit?: number;
      offset?: number;
      orderBy?: 'created_at' | 'updated_at';
      orderDirection?: 'ASC' | 'DESC';
    } = {}
  ): Promise<{ messages: Message[]; total: number }> {
    const organizationKey = await this.getOrganizationKey(organizationId);

    const {
      status,
      limit = 50,
      offset = 0,
      orderBy = 'created_at',
      orderDirection = 'DESC'
    } = options;

    let whereClause = 'WHERE organization_id = $1';
    const params: unknown[] = [organizationId];

    if (status) {
      whereClause += ' AND status = $2';
      params.push(status);
    }

    // Get total count
    const countResult = await db.query<{ total: string }>(
      `SELECT COUNT(*) as total FROM messages ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get messages
    const result = await db.query(`
      SELECT * FROM messages
      ${whereClause}
      ORDER BY ${orderBy} ${orderDirection}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);

    const messages = result.rows.map(row => this.decryptMessageData(row as Record<string, unknown>, organizationKey));

    return { messages, total };
  }

  /**
   * Update message
   */
  static async update(
    organizationId: string,
    messageId: string,
    updates: UpdateMessageInput
  ): Promise<Message | null> {
    const organizationKey = await this.getOrganizationKey(organizationId);

    // Encrypt any PII fields in updates
    const encryptedUpdates = this.encryptMessageData(updates, organizationKey);

    const setClause: string[] = [];
    const params: unknown[] = [organizationId, messageId];

    Object.entries(encryptedUpdates).forEach(([key, value], index) => {
      if (value !== undefined) {
        setClause.push(`${key} = $${index + 3}`);
        params.push(value);
      }
    });

    if (setClause.length === 0) {
      return this.findById(organizationId, messageId);
    }

    const result = await db.query(`
      UPDATE messages
      SET ${setClause.join(', ')}, updated_at = NOW()
      WHERE organization_id = $1 AND id = $2
      RETURNING *
    `, params);

    if (result.rows.length === 0) {
      return null;
    }

    return this.decryptMessageData(result.rows[0] as Record<string, unknown>, organizationKey);
  }

  /**
   * Delete message
   */
  static async delete(organizationId: string, messageId: string): Promise<boolean> {
    const result = await db.query(
      'DELETE FROM messages WHERE organization_id = $1 AND id = $2',
      [organizationId, messageId]
    );

    return result.rowCount > 0;
  }

  /**
   * Get message statistics
   */
  static async getStats(organizationId: string): Promise<{
    totalMessages: number;
    pendingMessages: number;
    approvedMessages: number;
    rejectedMessages: number;
    editedMessages: number;
    sentMessages: number;
    reviewMessages: number;
    avgResponseTime: number;
    approvalRate: number;
    todayProcessed: number;
  }> {
    const result = await db.query<{
      total_messages: string;
      new_messages: string;
      to_send_queue_messages: string;
      rejected_messages: string;
      edited_messages: string;
      sent_messages: string;
      to_review_queue_messages: string;
      avg_response_time_ms: string | null;
      today_processed: string;
    }>(`
      SELECT
        COUNT(*) as total_messages,
        COUNT(*) FILTER (WHERE status = 'new') as new_messages,
        COUNT(*) FILTER (WHERE status = 'to_send_queue') as to_send_queue_messages,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected_messages,
        COUNT(*) FILTER (WHERE status = 'edited') as edited_messages,
        COUNT(*) FILTER (WHERE status = 'sent') as sent_messages,
        COUNT(*) FILTER (WHERE status = 'to_review_queue') as to_review_queue_messages,
        AVG(response_time_ms) FILTER (WHERE response_time_ms IS NOT NULL) as avg_response_time_ms,
        COUNT(*) FILTER (WHERE processed_at::date = CURRENT_DATE) as today_processed
      FROM messages
      WHERE organization_id = $1
    `, [organizationId]);

    const row = result.rows[0];
    const totalMessages = parseInt(row.total_messages) || 0;
    const approvedMessages = parseInt((row as any).to_send_queue_messages) || 0;
    
    return {
      totalMessages,
      pendingMessages: parseInt((row as any).new_messages) || 0,
      approvedMessages,
      rejectedMessages: parseInt(row.rejected_messages) || 0,
      editedMessages: parseInt(row.edited_messages) || 0,
      sentMessages: parseInt(row.sent_messages) || 0,
      reviewMessages: parseInt((row as any).to_review_queue_messages) || 0,
      avgResponseTime: row.avg_response_time_ms ? Math.round(parseFloat(row.avg_response_time_ms) / 1000 / 60) : 0, // Convert to minutes
      approvalRate: totalMessages > 0 ? Math.round((approvedMessages / totalMessages) * 100) : 0,
      todayProcessed: parseInt(row.today_processed) || 0,
    };
  }

  /**
   * Add activity log entry
   */
  static async addActivity(
    organizationId: string,
    messageId: string,
    userId: string | null,
    activityType: string,
    details: Record<string, unknown> = {}
  ): Promise<void> {
    await db.query(`
      INSERT INTO activity_log (organization_id, user_id, message_id, activity_type, details)
      VALUES ($1, $2, $3, $4, $5)
    `, [organizationId, userId, messageId, activityType, JSON.stringify(details)]);
  }

  /**
   * Get recent activity
   */
  static async getRecentActivity(
    organizationId: string,
    limit: number = 10
  ): Promise<Array<{
    id: string;
    type: string;
    message: Message;
    timestamp: string;
    agentId?: string;
  }>> {
    const organizationKey = await this.getOrganizationKey(organizationId);

    const result = await db.query(`
      SELECT
        al.id,
        al.activity_type as type,
        al.user_id as agent_id,
        al.created_at as timestamp,
        m.*
      FROM activity_log al
      JOIN messages m ON al.message_id = m.id
      WHERE al.organization_id = $1
      ORDER BY al.created_at DESC
      LIMIT $2
    `, [organizationId, limit]);

    return result.rows.map((row) => {
      const typedRow = row as Record<string, unknown>;
      return {
        id: typedRow.id as string,
        type: typedRow.type as string,
        message: this.decryptMessageData(typedRow, organizationKey),
        timestamp: typedRow.timestamp as string,
        agentId: typedRow.agent_id as string | undefined,
      };
    });
  }
}
