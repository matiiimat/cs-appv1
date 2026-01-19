'use client'

import { ToastProvider } from '@/components/ui/toast'

export function ProtectedLayoutClient({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>
}
