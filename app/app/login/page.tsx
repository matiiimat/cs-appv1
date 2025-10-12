"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [message, setMessage] = useState("")

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus("sending")
    setMessage("")
    try {
      const res = await fetch("/api/auth/sign-in/guarded", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, callbackURL: "/app" }),
      })
      if (!res.ok) {
        let msg = "Failed to send magic link"
        try {
          const data = await res.json()
          if (data?.error === 'no_account') msg = "No account found for this email address."
          if (data?.error === 'email_required') msg = "Email is required"
          if (data?.error === 'email_send_failed') msg = "Failed to send magic link. Please try again later."
        } catch {}
        throw new Error(msg)
      }
      setStatus("sent")
      setMessage("Check your email for the sign-in link.")
    } catch (err) {
      setStatus("error")
      setMessage(err instanceof Error ? err.message : "Something went wrong")
    }
  }

  return (
    <main className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-center">Sign in</h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">We’ll email you a magic link to sign in.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <Button type="submit" className="w-full" disabled={status === "sending"}>
            {status === "sending" ? "Sending…" : "Send magic link"}
          </Button>
        </form>
        {message && (
          <p className={`mt-3 text-center text-sm ${status === "error" ? "text-red-600" : "text-green-600"}`}>{message}</p>
        )}
      </div>
    </main>
  )
}
