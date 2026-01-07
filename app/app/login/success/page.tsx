export default function CheckEmailPage() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="mt-2 text-muted-foreground">
          We sent you a secure magic link to sign in to Aidly.
        </p>
        <div className="mt-6 text-sm text-muted-foreground space-y-2">
          <p>If you don’t see it, check your spam folder.</p>
          <p>
            Having trouble? Contact <a href="mailto:support@aidlyhq.com" className="underline">Aidly Support</a>.
          </p>
        </div>
      </div>
    </main>
  )
}

