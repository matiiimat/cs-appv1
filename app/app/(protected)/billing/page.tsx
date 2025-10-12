import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function BillingPlaceholder() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Billing coming soon</h1>
        <p className="mt-2 text-muted-foreground">
          We&apos;re integrating Stripe subscriptions and the customer portal.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild>
            <Link href="/app">Back to app</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
