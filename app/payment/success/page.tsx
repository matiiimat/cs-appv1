import { CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function PaymentSuccessPage() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>

        <h1 className="text-2xl font-semibold text-green-600 mb-2">Payment successful</h1>

        <p className="text-lg text-gray-700 mb-4">
          Your subscription is now active. You can now{' '}
          <Link href="/app/login" className="text-blue-600 underline">log in</Link>{' '}
          to Aidly.
        </p>

        <div className="flex items-center justify-center gap-3 mt-6">
          <Button asChild>
            <Link href="/app/login">Go to Sign in</Link>
          </Button>
        </div>

        <div className="text-sm text-gray-600 space-y-2 mt-6">
          <p>Having trouble? Contact{' '}
            <a href="mailto:support@aidly.me" className="text-blue-600 underline">Aidly Support</a>
          </p>
        </div>
      </div>
    </main>
  )
}
