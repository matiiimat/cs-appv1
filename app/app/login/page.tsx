"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import Script from "next/script"

// Declare Turnstile types
declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: {
        sitekey: string
        callback: (token: string) => void
        'error-callback'?: () => void
        'expired-callback'?: () => void
        theme?: 'light' | 'dark' | 'auto'
        size?: 'normal' | 'compact'
      }) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [message, setMessage] = useState("")
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileReady, setTurnstileReady] = useState(false)
  const turnstileWidgetId = useRef<string | null>(null)
  const turnstileContainerRef = useRef<HTMLDivElement>(null)

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  // Initialize Turnstile widget when script loads
  useEffect(() => {
    if (!turnstileReady || !siteKey || !turnstileContainerRef.current || turnstileWidgetId.current) {
      return
    }

    try {
      turnstileWidgetId.current = window.turnstile?.render(turnstileContainerRef.current, {
        sitekey: siteKey,
        callback: (token) => {
          setTurnstileToken(token)
        },
        'error-callback': () => {
          setTurnstileToken(null)
          setMessage("Captcha failed to load. Please refresh the page.")
        },
        'expired-callback': () => {
          setTurnstileToken(null)
        },
        theme: 'auto',
      }) || null
    } catch (err) {
      console.error('Failed to render Turnstile:', err)
    }

    return () => {
      if (turnstileWidgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(turnstileWidgetId.current)
        } catch {}
        turnstileWidgetId.current = null
      }
    }
  }, [turnstileReady, siteKey])

  // Reset Turnstile after submission
  function resetTurnstile() {
    setTurnstileToken(null)
    if (turnstileWidgetId.current && window.turnstile) {
      try {
        window.turnstile.reset(turnstileWidgetId.current)
      } catch {}
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Require Turnstile token if site key is configured
    if (siteKey && !turnstileToken) {
      setStatus("error")
      setMessage("Please complete the captcha verification.")
      return
    }

    setStatus("sending")
    setMessage("")
    try {
      const res = await fetch("/api/auth/sign-in/guarded", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          callbackURL: "/app",
          turnstileToken: turnstileToken || undefined,
        }),
      })
      if (!res.ok) {
        let msg = "Failed to send magic link"
        try {
          const data = await res.json()
          // Use server's detailed message if available
          if (data?.message) {
            msg = data.message
          } else if (data?.error === 'no_account') {
            msg = "No account found for this email address."
          } else if (data?.error === 'email_required') {
            msg = "Email is required"
          } else if (data?.error === 'captcha_failed') {
            msg = "Captcha verification failed. Please try again."
          } else if (data?.error === 'email_send_failed') {
            msg = "Failed to send magic link. Please try again later."
          }
        } catch {}
        throw new Error(msg)
      }
      setStatus("sent")
      setMessage("Check your email for the sign-in link.")
    } catch (err) {
      setStatus("error")
      setMessage(err instanceof Error ? err.message : "Something went wrong")
      // Reset turnstile on error so user can try again
      resetTurnstile()
    }
  }

  return (
    <>
      {siteKey && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          async
          defer
          onLoad={() => setTurnstileReady(true)}
        />
      )}
      <main className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold text-center">Sign in</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">We&apos;ll email you a magic link to sign in.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {/* Turnstile widget container */}
            {siteKey && (
              <div
                ref={turnstileContainerRef}
                className="flex justify-center"
              />
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={status === "sending" || (!!siteKey && !turnstileToken)}
            >
              {status === "sending" ? "Sending…" : "Send magic link"}
            </Button>
          </form>
          {message && (
            <p className={`mt-3 text-center text-sm ${status === "error" ? "text-red-600" : "text-green-600"}`}>{message}</p>
          )}
        </div>
      </main>
    </>
  )
}
