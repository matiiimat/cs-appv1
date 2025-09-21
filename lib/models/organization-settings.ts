import { z } from 'zod';
import { db } from '@/lib/database';
import { DatabaseEncryption } from '@/lib/encryption';

// Organization Settings schema for validation
export const OrganizationSettingsSchema = z.object({
  id: z.string().uuid(),
  organization_id: z.string().uuid(),
  settings_data: z.string(), // Encrypted JSON string
  version: z.number().int().default(1),
  created_at: z.date(),
  updated_at: z.date(),
});

export type OrganizationSettingsType = z.infer<typeof OrganizationSettingsSchema>;

// Settings data structure (before encryption)
export const SettingsDataSchema = z.object({
  theme: z.enum(['light', 'dark']).default('light'),
  agentName: z.string().default('Support Agent'),
  agentSignature: z.string().default('Best regards,\nSupport Team'),
  aiInstructions: z.string().default('You are a helpful customer support AI assistant. Be professional, empathetic, and provide clear solutions.'),
  categories: z.array(z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().optional(),
    isDefault: z.boolean().optional(),
  })).default([]),
  quickActions: z.array(z.object({
    id: z.string(),
    title: z.string(),
    action: z.string(),
  })).default([]),
  aiConfig: z.object({
    provider: z.enum(['openai', 'anthropic', 'local']),
    model: z.string(),
    apiKey: z.string(),
    customEndpoint: z.string().optional(),
    localEndpoint: z.string().optional(),
    temperature: z.number().default(0.7),
    maxTokens: z.number().default(1000),
  }),
  companyKnowledge: z.string().default(''),
  messageAgeThresholds: z.object({
    greenHours: z.number().default(20),
    yellowHours: z.number().default(24),
    redHours: z.number().default(48),
  }),
  lastSaved: z.string().optional(), // ISO string
});

export type SettingsDataType = z.infer<typeof SettingsDataSchema>;

export class OrganizationSettingsModel {
  static async findByOrganizationId(organizationId: string): Promise<SettingsDataType | null> {
    try {
      // First check if organization exists
      const orgCheck = await db.query(`
        SELECT id, encrypted_data_key FROM organizations WHERE id = $1
      `, [organizationId]);

      if (orgCheck.rows.length === 0) {
        console.error(`Organization not found: ${organizationId}`);
        return null;
      }

      // Then check for organization settings
      const result = await db.query(`
        SELECT settings_data
        FROM organization_settings
        WHERE organization_id = $1
        ORDER BY updated_at DESC
        LIMIT 1
      `, [organizationId]);

      if (result.rows.length === 0) {
        console.log(`No settings found for organization: ${organizationId}`);
        return null;
      }

      const { settings_data } = result.rows[0] as { settings_data: string };
      const { encrypted_data_key } = orgCheck.rows[0] as { encrypted_data_key: string };

      // Handle empty or invalid settings data
      if (!settings_data) {
        console.log(`Empty settings data for organization: ${organizationId}`);
        return null;
      }

      // Decrypt the settings data
      const decryptedData = DatabaseEncryption.decryptFromStorage(settings_data, encrypted_data_key);
      const parsedData = JSON.parse(decryptedData);

      // Validate the decrypted data
      return SettingsDataSchema.parse(parsedData);
    } catch (error) {
      console.error('Error fetching organization settings:', error);
      // Return null instead of throwing to allow fallback to defaults
      return null;
    }
  }

  static async upsert(organizationId: string, settingsData: SettingsDataType): Promise<OrganizationSettingsType> {
    try {
      // Add timestamp
      const dataWithTimestamp = {
        ...settingsData,
        lastSaved: new Date().toISOString()
      };

      // Get organization's encryption key
      const orgResult = await db.query(`
        SELECT encrypted_data_key FROM organizations WHERE id = $1
      `, [organizationId]);

      if (orgResult.rows.length === 0) {
        throw new Error('Organization not found');
      }

      const { encrypted_data_key } = orgResult.rows[0] as { encrypted_data_key: string };

      // Encrypt the settings data
      const encryptedData = DatabaseEncryption.encryptForStorage(JSON.stringify(dataWithTimestamp), encrypted_data_key);

      // Upsert the settings
      const result = await db.query(`
        INSERT INTO organization_settings (organization_id, settings_data, version)
        VALUES ($1, $2, 1)
        ON CONFLICT (organization_id)
        DO UPDATE SET
          settings_data = EXCLUDED.settings_data,
          version = organization_settings.version + 1,
          updated_at = NOW()
        RETURNING *
      `, [organizationId, encryptedData]);

      const row = result.rows[0] as {
        id: string;
        organization_id: string;
        settings_data: string;
        version: number;
        created_at: string;
        updated_at: string;
      };
      return OrganizationSettingsSchema.parse({
        id: row.id,
        organization_id: row.organization_id,
        settings_data: row.settings_data,
        version: row.version,
        created_at: new Date(row.created_at),
        updated_at: new Date(row.updated_at),
      });
    } catch (error) {
      console.error('Error saving organization settings:', error);
      throw new Error('Failed to save organization settings');
    }
  }
}