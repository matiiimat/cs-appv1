"use client"

import Image from "next/image"
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

export default function LinkedInLandingPage() {
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

  async function handleSubmit(e: React.FormEvent) {
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
          if (data?.message) msg = data.message
        } catch {}
        throw new Error(msg)
      }

      setStatus("sent")
      setMessage("Check your email! We sent you a secure link to get started.")
    } catch (err) {
      setStatus("error")
      setMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.")
      // Reset turnstile on error so user can try again
      resetTurnstile()
    }
  }

  if (status === "sent") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-[#0A0A0B] dark:to-[#0A0A0B] flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
            <svg className="h-8 w-8 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">Check Your Email</h1>
          <p className="text-slate-600 dark:text-white/60 mb-6">{message}</p>

          <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-xl p-6 space-y-3 text-sm text-slate-600 dark:text-white/60 text-left">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#3872B9]/10 text-[#3872B9] text-xs font-semibold">1</div>
              <div>
                <strong className="text-slate-900 dark:text-white">Open the email</strong> we just sent to <span className="font-medium">{email}</span>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#3872B9]/10 text-[#3872B9] text-xs font-semibold">2</div>
              <div>
                <strong className="text-slate-900 dark:text-white">Click the secure link</strong> to access Aidly
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#3872B9]/10 text-[#3872B9] text-xs font-semibold">3</div>
              <div>
                <strong className="text-slate-900 dark:text-white">Start drafting</strong> AI-powered responses in 2 minutes
              </div>
            </div>
          </div>

          <p className="mt-6 text-sm text-slate-500 dark:text-white/40">
            Don&apos;t see it? Check your spam folder or{" "}
            <button
              onClick={() => setStatus("idle")}
              className="text-[#3872B9] hover:underline"
            >
              try again
            </button>
          </p>
        </div>
      </div>
    )
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
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-[#0A0A0B] dark:to-[#0A0A0B]">
        {/* Simple header - logo only, no navigation */}
      <header className="border-b border-slate-200 dark:border-white/[0.06] bg-white/80 dark:bg-[#0A0A0B]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Image src="/logo-60x.png" alt="Aidly" width={28} height={28} className="rounded-lg" />
            <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">Aidly</span>
          </div>
        </div>
      </header>

      {/* Hero Section with Embedded Form */}
      <section className="relative overflow-hidden px-6 pt-16 pb-24">
        {/* Ambient gradient background */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute h-[600px] w-[600px] rounded-full opacity-20 blur-[120px]"
            style={{
              background: 'radial-gradient(circle, #3872B9 0%, transparent 70%)',
              left: '10%',
              top: '0%',
            }}
          />
          <div
            className="absolute h-[500px] w-[500px] rounded-full opacity-15 blur-[100px]"
            style={{
              background: 'radial-gradient(circle, #B33275 0%, transparent 70%)',
              right: '10%',
              top: '10%',
            }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            {/* Left column - Copy */}
            <div>
              {/* Announcement badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm shadow-sm border-slate-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03] backdrop-blur-sm">
                <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                <span className="text-slate-600 dark:text-white/60">Now with GPT-4o & Claude support</span>
              </div>

              <h1 className="font-[var(--font-custom)] text-4xl font-medium leading-[1.1] tracking-tight text-slate-900 dark:text-white md:text-5xl lg:text-6xl mb-6">
                Cut Email Response Time{" "}
                <span className="bg-gradient-to-r from-[#3872B9] via-[#B33275] to-[#F38135] bg-clip-text text-transparent">
                  Without Hiring
                </span>
              </h1>

              <p className="text-lg leading-relaxed text-slate-600 dark:text-white/60 mb-8">
                AI drafts perfect responses in seconds. You approve with one click.
                Reduce costs by 90% while delivering faster, more consistent support.
              </p>

              {/* Trust indicators */}
              <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600 dark:text-white/60">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  5 free emails to try
                </div>
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  No credit card required
                </div>
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Setup in 2 minutes
                </div>
              </div>

              {/* Social proof */}
              <div className="mt-10 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#3872B9] to-[#B33275] font-medium text-white text-sm">
                      JP
                    </div>
                  </div>
                  <div>
                    <p className="text-sm italic text-slate-700 dark:text-white/70 leading-relaxed mb-3">
                      &ldquo;Support takes 10% of the time it used to. The quality stayed high, but the workload disappeared.&rdquo;
                    </p>
                    <div className="text-xs text-slate-500 dark:text-white/50">
                      <span className="font-medium text-slate-700 dark:text-white/70">Jean-Pierre L.</span> · Founder, Braceletsdemontre.com
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right column - Signup Form */}
            <div>
              <div className="rounded-3xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-white/[0.03] p-8 shadow-xl">
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">
                    Get 5 Free AI Responses
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-white/60">
                    No credit card required. Start in 2 minutes.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-white/70 mb-2">
                      Work Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full rounded-lg border border-slate-300 dark:border-white/[0.12] bg-white dark:bg-transparent px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/40 focus:border-[#3872B9] focus:outline-none focus:ring-2 focus:ring-[#3872B9]/20"
                      disabled={status === "sending"}
                    />
                  </div>

                  {/* Turnstile widget container */}
                  {siteKey && (
                    <div
                      ref={turnstileContainerRef}
                      className="flex justify-center"
                    />
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-12 text-base font-semibold transition-all bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg dark:bg-white dark:text-[#0A0A0B] dark:hover:bg-white"
                    disabled={status === "sending" || (!!siteKey && !turnstileToken)}
                  >
                    {status === "sending" ? "Sending..." : "Get Started Free →"}
                  </Button>

                  {message && status === "error" && (
                    <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
                  )}

                  <p className="text-xs text-center text-slate-500 dark:text-white/40">
                    By continuing, you agree to our{" "}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#3872B9] hover:underline">
                      Terms
                    </a>{" "}
                    and{" "}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#3872B9] hover:underline">
                      Privacy Policy
                    </a>
                  </p>
                </form>

                {/* What you get */}
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/[0.08] space-y-3">
                  <p className="text-xs font-medium text-slate-500 dark:text-white/40 uppercase tracking-wide">What you get:</p>
                  <div className="space-y-2.5">
                    {[
                      "5 AI-powered email responses",
                      "Full approval control",
                      "2-minute setup",
                      "Cancel anytime",
                    ].map((feature, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-white/70">
                        <svg className="h-4 w-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-t border-slate-200 dark:border-white/[0.06] bg-white dark:bg-transparent py-16 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="font-[var(--font-custom)] text-4xl font-medium text-slate-900 dark:text-white">90%</div>
              <div className="mt-2 text-sm text-slate-500 dark:text-white/50">Time Saved</div>
            </div>
            <div>
              <div className="font-[var(--font-custom)] text-4xl font-medium text-slate-900 dark:text-white">&lt;5s</div>
              <div className="mt-2 text-sm text-slate-500 dark:text-white/50">Draft Ready</div>
            </div>
            <div>
              <div className="font-[var(--font-custom)] text-4xl font-medium text-slate-900 dark:text-white">2min</div>
              <div className="mt-2 text-sm text-slate-500 dark:text-white/50">Setup Time</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-[var(--font-custom)] text-3xl font-medium text-slate-900 dark:text-white mb-12">
            How It Works
          </h2>

          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Connect Your Email",
                description: "Forward your support email to Aidly or use an automatically pre-generated support email address."
              },
              {
                step: "2",
                title: "AI Drafts Replies",
                description: "Aidly reads each email and generates a perfect response in seconds."
              },
              {
                step: "3",
                title: "Review & Send",
                description: "Approve drafts with one click or edit before sending. You stay in control."
              }
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#3872B9] to-[#B33275] font-semibold text-white text-lg">
                  {item.step}
                </div>
                <h3 className="font-medium text-slate-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 dark:text-white/60 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-6 border-t border-slate-200 dark:border-white/[0.06]">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center font-[var(--font-custom)] text-3xl font-medium text-slate-900 dark:text-white mb-4">
            Everything You Need
          </h2>
          <p className="text-center text-slate-600 dark:text-white/60 mb-12 max-w-2xl mx-auto">
            A complete platform to transform your customer support
          </p>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                ),
                title: "Lightning Fast",
                description: "Get draft responses in under 5 seconds"
              },
              {
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                ),
                title: "Self-Learning",
                description: "Gets smarter from your feedback over time"
              },
              {
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  </svg>
                ),
                title: "Full Control",
                description: "Nothing sends without your approval"
              },
              {
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                  </svg>
                ),
                title: "Multilingual",
                description: "Support customers in any language"
              },
              {
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                ),
                title: "Secure & GDPR",
                description: "End-to-end encryption, EU-based"
              },
              {
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                ),
                title: "Analytics",
                description: "Track response times and satisfaction"
              }
            ].map((feature, i) => (
              <div key={i} className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-6 hover:shadow-md transition-shadow">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#3872B9]/10 to-[#B33275]/10 text-[#3872B9]">
                  {feature.icon}
                </div>
                <h3 className="font-medium text-slate-900 dark:text-white mb-1">{feature.title}</h3>
                <p className="text-sm text-slate-600 dark:text-white/60">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6 border-t border-slate-200 dark:border-white/[0.06]">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-[var(--font-custom)] text-3xl md:text-4xl font-medium text-slate-900 dark:text-white mb-4">
            Ready to transform your customer support?
          </h2>
          <p className="text-lg text-slate-600 dark:text-white/60 mb-8">
            Start with 5 free emails. No credit card required.
          </p>
          <Button
            size="lg"
            className="h-14 px-10 text-base font-semibold transition-all bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg dark:bg-white dark:text-[#0A0A0B]"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            Get Started Free →
          </Button>
        </div>
      </section>

      {/* Simple footer */}
      <footer className="border-t border-slate-200 dark:border-white/[0.06] py-8 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-white/40">
            <div className="flex items-center gap-2">
              <Image src="/logo-60x.png" alt="Aidly" width={20} height={20} className="rounded" />
              <span>© {new Date().getFullYear()} Aidly. All rights reserved.</span>
            </div>
            <div className="flex gap-6">
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-slate-700 dark:hover:text-white/60 transition-colors">Privacy</a>
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-slate-700 dark:hover:text-white/60 transition-colors">Terms</a>
              <a href="mailto:mathieu@aidlyhq.com" className="hover:text-slate-700 dark:hover:text-white/60 transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
      </div>
    </>
  )
}
