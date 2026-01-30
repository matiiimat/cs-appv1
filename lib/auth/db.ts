import { Kysely, PostgresDialect } from 'kysely'
import { Pool } from 'pg'

export function createKysely() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for Better Auth')
  }
  const ssl = connectionString.includes('neon.tech') || connectionString.includes('supabase.co')
    ? { rejectUnauthorized: true }
    : undefined

  const pool = new Pool({ connectionString, ssl })
  return new Kysely<unknown>({
    dialect: new PostgresDialect({ pool }),
  })
}
