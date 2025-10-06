import { CheckCircle, Mail } from 'lucide-react'

export default function PaymentSuccessPage() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="flex justify-center mb-4">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>

        <h1 className="text-2xl font-semibold text-green-600 mb-2">
          Payment Successful!
        </h1>

        <p className="text-lg text-gray-700 mb-4">
          Welcome to Aidly Pro! Your subscription is now active.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-center mb-2">
            <Mail className="w-5 h-5 text-blue-500 mr-2" />
            <span className="font-medium text-blue-700">Check your email</span>
          </div>
          <p className="text-sm text-blue-600">
            We&apos;re sending you a secure magic link to access your new workspace.
          </p>
        </div>

        <div className="text-sm text-gray-600 space-y-2">
          <p>Your organization and workspace are being set up automatically.</p>
          <p>If you don&apos;t see the email, check your spam folder.</p>
          <p className="mt-4">
            Having trouble? Contact{' '}
            <a href="mailto:support@aidly.me" className="text-blue-600 underline">
              Aidly Support
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}