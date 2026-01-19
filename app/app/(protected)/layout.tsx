import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/server'
import { ensureProvisioned } from '@/lib/tenant'
import { getBillingStatusForEmail, isAccessAllowedFromStatus } from '@/lib/billing'
import { ProtectedLayoutClient } from './layout-client'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const h = await headers()
  const session = await auth.api.getSession({ headers: new Headers(h) })

  if (!session) {
    redirect('/app/login')
  }

  // Safety net: Ensure user/org exist in our app DB
  // Primary provisioning happens in databaseHooks.user.create.after (lib/auth/server.ts)
  // This catch handles edge cases like Stripe checkout or manual user creation
  try {
    const email = session.user.email
    const name = session.user.name
    if (email) {
      await ensureProvisioned(email, name)

      // Enforce access based on billing status
      try {
        const status = await getBillingStatusForEmail(email)
        const allowed = isAccessAllowedFromStatus(status)
        if (!allowed) {
          redirect('/')
        }
      } catch (e) {
        console.error('Billing status check error:', e)
        // Fail-open: do not block if billing check fails
      }
    }
  } catch (e) {
    console.error('Provisioning error:', e)
  }

  return <ProtectedLayoutClient>{children}</ProtectedLayoutClient>
}
