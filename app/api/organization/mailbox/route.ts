import { NextResponse } from 'next/server'
import { makeOrgForwardAddress } from '@/lib/email'

const DEMO_ORGANIZATION_ID = '82ef6e9f-e0b2-419f-82e3-2468ae4c1d21'

export async function GET() {
  try {
    const address = makeOrgForwardAddress(DEMO_ORGANIZATION_ID)
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
