import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/server'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const h = headers()
  const session = await auth.api.getSession({ headers: h })

  if (!session) {
    redirect('/app/login')
  }

  return <>{children}</>
}

