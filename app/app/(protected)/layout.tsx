import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/server'
import { ensureProvisioned } from '@/lib/tenant'
import { getBillingStatusForEmail, isAccessAllowedFromStatus } from '@/lib/billing'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  // Allow bypass in development when explicitly enabled
  const bypass = process.env.NODE_ENV !== 'production' && process.env.DEV_AUTH_BYPASS === '1' // PUT TO 1 TO DISABLE LOGIN FOR TEST
  if (bypass) {
    return <>{children}</>
  }

  const h = await headers()
  const session = await auth.api.getSession({ headers: new Headers(h) })

  if (!session) {
    redirect('/app/login')
  }

  // Ensure user/org exist in our app DB
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

  return <>{children}</>
}
