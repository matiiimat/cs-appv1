import { type NextRequest, NextResponse } from "next/server"
import { auth } from '@/lib/auth/server'
import { getOrgAndUserByEmail } from '@/lib/tenant'
import { db } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgUser = await getOrgAndUserByEmail(session.user.email)

    if (!orgUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get full user details including role
    const result = await db.query<{
      id: string
      email: string
      name: string
      role: string
      organization_id: string
    }>(
      'SELECT id, email, name, role, organization_id FROM users WHERE id = $1',
      [orgUser.userId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = result.rows[0]

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organization_id,
      }
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}
