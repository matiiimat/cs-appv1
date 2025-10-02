import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/server'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  // Allow bypass in development when explicitly enabled
  const bypass = process.env.NODE_ENV !== 'production' && process.env.DEV_AUTH_BYPASS === '1'
  if (bypass) {
    return <>{children}</>
  }

  const h = headers()
  const session = await auth.api.getSession({ headers: h })

  if (!session) {
    redirect('/app/login')
  }

  return <>{children}</>
}
