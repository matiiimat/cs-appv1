#!/usr/bin/env node

const { Pool } = require('pg');
const crypto = require('crypto');

require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'supportai',
  user: process.env.DB_USER || 'supportai',
  password: process.env.DB_PASSWORD || 'supportai_dev_password',
});

// Generate a random encryption key for demo organization
function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check if data already exists
      const { rows: existingOrgs } = await client.query('SELECT COUNT(*) as count FROM organizations');
      if (parseInt(existingOrgs[0].count) > 0) {
        console.log('📊 Database already contains data, skipping seed');
        await client.query('ROLLBACK');
        return;
      }

      // Create demo organization
      const orgResult = await client.query(`
        INSERT INTO organizations (name, domain, plan_type, plan_status, encrypted_data_key, settings)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        'Demo Company',
        'demo.supportai.com',
        'pro',
        'active',
        generateEncryptionKey(),
        JSON.stringify({
          theme: 'light',
          timezone: 'UTC',
          notifications_enabled: true
        })
      ]);

      const orgId = orgResult.rows[0].id;
      console.log(`✅ Created demo organization: ${orgId}`);

      // Create demo users
      const userResults = await client.query(`
        INSERT INTO users (organization_id, email, name, role)
        VALUES
          ($1, $2, $3, $4),
          ($1, $5, $6, $7)
        RETURNING id, email, role
      `, [
        orgId,
        'admin@demo.supportai.com', 'Demo Admin', 'admin',
        'agent@demo.supportai.com', 'Demo Agent', 'agent'
      ]);

      const adminUserId = userResults.rows.find(u => u.role === 'admin').id;
      const agentUserId = userResults.rows.find(u => u.role === 'agent').id;

      console.log(`✅ Created demo users: Admin (${adminUserId}), Agent (${agentUserId})`);

      // Create demo organization settings
      await client.query(`
        INSERT INTO organization_settings (organization_id, settings_data)
        VALUES ($1, $2)
      `, [
        orgId,
        JSON.stringify({
          agentName: 'Demo Support Agent',
          agentSignature: 'Best regards,\\nDemo Support Team',
          categories: [
            { id: '1', name: 'Technical Support', color: '#ef4444' },
            { id: '2', name: 'Billing', color: '#22c55e' },
            { id: '3', name: 'General Inquiry', color: '#3b82f6' }
          ],
          quickActions: [
            { id: '1', title: 'Translate ES', action: 'Translate the response to Spanish' },
            { id: '2', title: 'Make Formal', action: 'Rewrite the response in a more formal tone' },
            { id: '3', title: 'Simplify', action: 'Simplify the response for easier understanding' }
          ],
          aiConfig: {
            provider: 'local',
            model: 'local-model',
            apiKey: 'http://localhost:1234',
            temperature: 0.7,
            maxTokens: 1000
          }
        })
      ]);

      console.log('✅ Created demo organization settings');

      await client.query('COMMIT');
      console.log('🎉 Database seeding completed successfully!');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Seeding interrupted');
  await pool.end();
  process.exit(0);
});

seedDatabase();