import { NextResponse } from 'next/server'
import { makeOrgForwardAddress } from '@/lib/email'
import { auth } from '@/lib/auth/server'
import { getOrgAndUserByEmail } from '@/lib/tenant'

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const orgUser = await getOrgAndUserByEmail(session.user.email)
    if (!orgUser) {
      return NextResponse.json({ error: 'Organization not provisioned' }, { status: 404 })
    }
    const address = makeOrgForwardAddress(orgUser.organizationId)
    return NextResponse.json({
      provider: 'sendgrid',
      mode: 'forwarded',
      forwardToAddress: address,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Mailbox configuration not available'
    return NextResponse.json({ forwardToAddress: '', error: message })
  }
}
