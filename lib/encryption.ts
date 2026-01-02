import CryptoJS from 'crypto-js';

export interface EncryptionResult {
  encrypted: string;
  iv: string;
}

export class DataEncryption {
  /**
   * Encrypts data using AES-256-CBC with organization-specific key
   */
  static encrypt(data: string, organizationKey: string): EncryptionResult {
    if (!data) {
      throw new Error('Data to encrypt cannot be empty');
    }

    if (!organizationKey || organizationKey.length !== 64) {
      throw new Error('Organization key must be 64 characters (32 bytes hex)');
    }

    try {
      // Generate random IV for each encryption
      const iv = CryptoJS.lib.WordArray.random(16); // 128-bit IV for CBC

      // Convert hex key to WordArray
      const key = CryptoJS.enc.Hex.parse(organizationKey);

      // Encrypt the data
      const encrypted = CryptoJS.AES.encrypt(data, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      return {
        encrypted: encrypted.toString(),
        iv: iv.toString(CryptoJS.enc.Hex)
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypts data using AES-256-CBC with organization-specific key
   */
  static decrypt(encryptedData: string, iv: string, organizationKey: string): string {
    if (!encryptedData || !iv) {
      throw new Error('Encrypted data and IV are required');
    }

    if (!organizationKey || organizationKey.length !== 64) {
      throw new Error('Organization key must be 64 characters (32 bytes hex)');
    }

    try {
      // Convert hex key and IV to WordArray
      const key = CryptoJS.enc.Hex.parse(organizationKey);
      const ivWordArray = CryptoJS.enc.Hex.parse(iv);

      // Decrypt the data
      const decrypted = CryptoJS.AES.decrypt(encryptedData, key, {
        iv: ivWordArray,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      const result = decrypted.toString(CryptoJS.enc.Utf8);

      if (!result) {
        throw new Error('Decryption resulted in empty string - invalid key or corrupted data');
      }

      return result;
    } catch (error) {
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generates a new encryption key for an organization
   */
  static generateOrganizationKey(): string {
    return CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
  }

  /**
   * Encrypts multiple fields at once
   */
  static encryptFields(
    fields: Record<string, string | null | undefined>,
    organizationKey: string
  ): Record<string, { encrypted: string; iv: string } | null> {
    const result: Record<string, { encrypted: string; iv: string } | null> = {};

    for (const [key, value] of Object.entries(fields)) {
      if (value === null || value === undefined || value === '') {
        result[key] = null;
      } else {
        result[key] = this.encrypt(value, organizationKey);
      }
    }

    return result;
  }

  /**
   * Decrypts multiple fields at once
   */
  static decryptFields(
    encryptedFields: Record<string, { encrypted: string; iv: string } | null>,
    organizationKey: string
  ): Record<string, string | null> {
    const result: Record<string, string | null> = {};

    for (const [key, value] of Object.entries(encryptedFields)) {
      if (value === null) {
        result[key] = null;
      } else {
        result[key] = this.decrypt(value.encrypted, value.iv, organizationKey);
      }
    }

    return result;
  }
}

/**
 * Database storage format for encrypted fields
 */
export interface EncryptedField {
  encrypted: string;
  iv: string;
  algorithm?: string; // For future algorithm migration
  version?: number;   // For key rotation
}

/**
 * Utility functions for database storage
 */
export class DatabaseEncryption {
  /**
   * Converts encryption result to database storage format
   */
  static toStorageFormat(result: EncryptionResult): string {
    const field: EncryptedField = {
      encrypted: result.encrypted,
      iv: result.iv,
      algorithm: 'AES-256-CBC',
      version: 1
    };
    return JSON.stringify(field);
  }

  /**
   * Parses database storage format back to encryption result
   */
  static fromStorageFormat(stored: string): EncryptionResult {
    try {
      const field: EncryptedField = JSON.parse(stored);
      return {
        encrypted: field.encrypted,
        iv: field.iv
      };
    } catch (error) {
      throw new Error(`Invalid encrypted field format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Encrypts data for database storage
   */
  static encryptForStorage(data: string, organizationKey: string): string {
    if (!data) return '';
    const result = DataEncryption.encrypt(data, organizationKey);
    return this.toStorageFormat(result);
  }

  /**
   * Decrypts data from database storage
   */
  static decryptFromStorage(stored: string, organizationKey: string): string {
    if (!stored) return '';
    const result = this.fromStorageFormat(stored);
    return DataEncryption.decrypt(result.encrypted, result.iv, organizationKey);
  }
}

/**
 * Utility for handling PII data encryption
 */
export class PIIEncryption {
  private static readonly PII_FIELDS = [
    'customer_name',
    'customer_email',
    'subject',
    'message',
    'ai_suggested_response'
  ];

  /**
   * Checks if a field contains PII data that should be encrypted
   */
  static isPIIField(fieldName: string): boolean {
    return this.PII_FIELDS.includes(fieldName.toLowerCase());
  }

  /**
   * Encrypts message data for database storage
   */
  static encryptMessageData(
    messageData: {
      customer_name?: string;
      customer_email?: string;
      subject?: string;
      message?: string;
      ai_suggested_response?: string;
    },
    organizationKey: string
  ): Record<string, string> {
    const encrypted: Record<string, string> = {};

    for (const [key, value] of Object.entries(messageData)) {
      if (this.isPIIField(key) && value) {
        encrypted[key] = DatabaseEncryption.encryptForStorage(value, organizationKey);
      }
    }

    return encrypted;
  }

  /**
   * Decrypts message data from database
   */
  static decryptMessageData(
    encryptedData: Record<string, string>,
    organizationKey: string
  ): Record<string, string> {
    const decrypted: Record<string, string> = {};

    for (const [key, value] of Object.entries(encryptedData)) {
      if (this.isPIIField(key) && value) {
        try {
          decrypted[key] = DatabaseEncryption.decryptFromStorage(value, organizationKey);
        } catch (error) {
          console.error(`Failed to decrypt field ${key}:`, error);
          decrypted[key] = '[DECRYPTION_ERROR]';
        }
      }
    }

    return decrypted;
  }
}