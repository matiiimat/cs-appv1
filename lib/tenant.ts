import { db } from '@/lib/database'
import { DataEncryption } from '@/lib/encryption'

export async function getOrgAndUserByEmail(email: string): Promise<{ organizationId: string; userId: string } | null> {
  const result = await db.query<{ organization_id: string; id: string }>(
    'SELECT organization_id, id FROM users WHERE email = $1 ORDER BY created_at ASC LIMIT 1',
    [email]
  )
  if (result.rows.length === 0) return null
  return { organizationId: result.rows[0].organization_id, userId: result.rows[0].id }
}

export async function getOrganizationNameById(organizationId: string): Promise<string | null> {
  const result = await db.query<{ name: string }>(
    'SELECT name FROM organizations WHERE id = $1',
    [organizationId]
  )
  if (result.rows.length === 0) return null
  return result.rows[0].name
}

export async function updateOrganizationName(organizationId: string, name: string): Promise<void> {
  await db.query('UPDATE organizations SET name = $1, updated_at = NOW() WHERE id = $2', [name, organizationId])
}

export async function provisionOrgAndUserForEmail(email: string, name?: string): Promise<{ organizationId: string; userId: string }> {
  const existing = await getOrgAndUserByEmail(email)
  if (existing) return existing

  const displayName = name || email.split('@')[0] || 'New User'
  const orgName = `${displayName}'s Workspace`
  const encKey = DataEncryption.generateOrganizationKey()

  return await db.transaction(async (client) => {
    const orgRes = await client.query<{ id: string }>(
      `INSERT INTO organizations (name, plan_type, plan_status, encrypted_data_key, current_period_start)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
      [orgName, 'free', 'active', encKey]
    )
    const organizationId = orgRes.rows[0].id

    const userRes = await client.query<{ id: string }>(
      `INSERT INTO users (organization_id, email, name, role, is_active)
       VALUES ($1, $2, $3, 'admin', true)
       RETURNING id`,
      [organizationId, email, displayName]
    )
    const userId = userRes.rows[0].id

    return { organizationId, userId }
  })
}

export async function ensureProvisioned(email: string, name?: string): Promise<{ organizationId: string; userId: string }> {
  const existing = await getOrgAndUserByEmail(email)
  if (existing) return existing
  return provisionOrgAndUserForEmail(email, name)
}
