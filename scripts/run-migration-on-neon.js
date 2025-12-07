#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration(migrationFile) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Neon database');

    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log(`🔄 Running migration: ${migrationFile}`);
    console.log('---');

    // Execute migration
    await client.query(migrationSQL);

    console.log('---');
    console.log(`✅ Migration ${migrationFile} completed successfully!`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: node run-migration-on-neon.js <migration-file.sql>');
  process.exit(1);
}

runMigration(migrationFile);