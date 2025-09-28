/*
  Minimal Better Auth SQL migration runner for Neon (Postgres).
  - Reads SQL files from database/migrations/better-auth
  - Applies each file once, tracked in table ba_migrations
  Usage: DATABASE_URL=... node scripts/better-auth-migrate.js
*/
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL is required')
    process.exit(1)
  }
  const dir = path.join(process.cwd(), 'database', 'migrations', 'better-auth')
  if (!fs.existsSync(dir)) {
    console.log('No migrations directory found at', dir)
    process.exit(0)
  }

  const client = new Client({ connectionString: databaseUrl, ssl: databaseUrl.includes('neon.tech') ? { rejectUnauthorized: false } : undefined })
  await client.connect()
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS ba_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`)

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()
    for (const file of files) {
      const { rows } = await client.query('SELECT 1 FROM ba_migrations WHERE filename = $1', [file])
      if (rows.length) {
        console.log('Skipping already applied migration:', file)
        continue
      }
      const sql = fs.readFileSync(path.join(dir, file), 'utf8')
      console.log('Applying migration:', file)
      try {
        await client.query('BEGIN')
        await client.query(sql)
        await client.query('INSERT INTO ba_migrations(filename) VALUES($1)', [file])
        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK')
        console.error('Migration failed:', file, err)
        process.exit(1)
      }
    }
    console.log('All migrations applied')
  } finally {
    await client.end()
  }
}

main().catch((e) => { console.error(e); process.exit(1) })

