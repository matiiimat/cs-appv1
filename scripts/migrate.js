#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'supportai',
  user: process.env.DB_USER || 'supportai',
  password: process.env.DB_PASSWORD || 'supportai_dev_password',
});

async function runMigrations() {
  try {
    console.log('🔄 Starting database migrations...');

    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Get list of migration files
    const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Get executed migrations
    const { rows: executedMigrations } = await pool.query(
      'SELECT filename FROM migrations ORDER BY id'
    );
    const executedFileNames = executedMigrations.map(row => row.filename);

    // Run pending migrations
    for (const filename of migrationFiles) {
      if (executedFileNames.includes(filename)) {
        console.log(`⏭️  Skipping ${filename} (already executed)`);
        continue;
      }

      console.log(`▶️  Executing ${filename}...`);
      const filePath = path.join(migrationsDir, filename);
      const sql = fs.readFileSync(filePath, 'utf8');

      // Begin transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Execute migration
        await client.query(sql);

        // Record migration
        await client.query(
          'INSERT INTO migrations (filename) VALUES ($1)',
          [filename]
        );

        await client.query('COMMIT');
        console.log(`✅ Migration ${filename} completed successfully`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    }

    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Migration interrupted');
  await pool.end();
  process.exit(0);
});

runMigrations();