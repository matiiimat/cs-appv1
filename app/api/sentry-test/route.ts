// Temporary route to test Sentry - DELETE AFTER CONFIRMING SENTRY WORKS
import { NextResponse } from 'next/server'

export async function GET() {
  throw new Error('Sentry test error - delete this route after confirming')
  return NextResponse.json({ ok: true })
}
