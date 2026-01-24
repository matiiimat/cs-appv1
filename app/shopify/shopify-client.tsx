"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Check, X, ExternalLink, ArrowRight, Zap, Clock, DollarSign, TrendingUp } from "lucide-react"
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

export default function ShopifyLandingPageClient() {
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
          turnstileToken,
          redirectTo: "/app",
        }),
      })

      if (!res.ok) {
        let msg = "Failed to send magic link"
        try {
          const data = await res.json()
          if (data?.message) msg = data.message
          if (data?.error) msg = data.error
        } catch {}
        setStatus("error")
        setMessage(msg)
        resetTurnstile()
        return
      }

      setStatus("sent")
      setMessage("Magic link sent! Check your email inbox.")
      setEmail("")
      resetTurnstile()
    } catch (err) {
      setStatus("error")
      setMessage(err instanceof Error ? err.message : "Network error. Please try again.")
      resetTurnstile()
    }
  }

  return (
    <>
      {/* Turnstile Script */}
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        onLoad={() => setTurnstileReady(true)}
        strategy="afterInteractive"
      />

      <div className="min-h-screen bg-white dark:bg-slate-950">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-slate-200 dark:border-white/10">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#3872B9]/5 via-[#B33275]/5 to-[#F38135]/5 dark:from-[#3872B9]/10 dark:via-[#B33275]/10 dark:to-[#F38135]/10" />

          <div className="relative mx-auto max-w-7xl px-6 py-20 sm:py-28 lg:px-8">
            <div className="lg:grid lg:grid-cols-12 lg:gap-8">
              {/* Left column - Hero content */}
              <div className="lg:col-span-7">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm dark:border-white/10 dark:bg-white/5">
                  <Image
                    src="/integrations/shopify_icon.png"
                    alt="Shopify"
                    width={16}
                    height={16}
                  />
                  <span className="text-slate-600 dark:text-slate-400">Native Shopify Integration</span>
                </div>

                {/* Headline */}
                <h1 className="mt-6 font-[var(--font-custom)] text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
                  Customer Support Built for{" "}
                  <span className="bg-gradient-to-r from-[#3872B9] via-[#B33275] to-[#F38135] bg-clip-text text-transparent">
                    Shopify Stores
                  </span>
                </h1>

                {/* Subheadline */}
                <p className="mt-6 text-lg leading-relaxed text-slate-600 dark:text-slate-400 sm:text-xl">
                  AI-powered email support that shows customer order history, tracking numbers, and lifetime value in every ticket. Handle 3× more support emails without hiring more agents.
                </p>

                {/* Key benefits */}
                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      <strong>2-minute OAuth setup</strong> - Connect your Shopify store instantly
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      <strong>AI drafts responses</strong> using order data and context
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      <strong>1/3 the cost</strong> of Gorgias ($208 vs $900/month)
                    </span>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                      <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-sm text-slate-700 dark:text-slate-300">
                      <strong>No tab-switching</strong> - Order details right in the ticket
                    </span>
                  </div>
                </div>

                {/* CTA Form */}
                <div className="mt-10">
                  <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <div className="flex-1">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                        disabled={status === "sending" || status === "sent"}
                        className="h-12 w-full rounded-lg border border-slate-300 px-4 text-base placeholder:text-slate-400 focus:border-[#3872B9] focus:outline-none focus:ring-2 focus:ring-[#3872B9]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:focus:border-[#3872B9]"
                      />
                    </div>
                    <Button
                      type="submit"
                      size="lg"
                      disabled={status === "sending" || status === "sent"}
                      className="h-12 whitespace-nowrap bg-gradient-to-r from-[#3872B9] via-[#B33275] to-[#F38135] px-8 text-base font-semibold text-white hover:opacity-90"
                    >
                      {status === "sending" ? "Sending..." : status === "sent" ? "Check Your Email" : "Try 5 Emails Free"}
                      {status === "idle" && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                  </form>

                  {/* Turnstile */}
                  {siteKey && status !== "sent" && (
                    <div ref={turnstileContainerRef} className="mt-3" />
                  )}

                  {/* Status messages */}
                  {message && (
                    <p className={`mt-3 text-sm ${status === "error" ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                      {message}
                    </p>
                  )}

                  <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                    No credit card required. First 5 emails are on us.
                  </p>
                </div>
              </div>

              {/* Right column - Shopify panel screenshot placeholder */}
              <div className="mt-12 lg:col-span-5 lg:mt-0">
                <div className="relative rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8 shadow-2xl dark:border-white/10 dark:from-slate-900 dark:to-slate-800">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Image
                        src="/integrations/shopify_icon.png"
                        alt="Shopify"
                        width={20}
                        height={20}
                      />
                      <span className="font-semibold text-slate-900 dark:text-white">Shopify Customer Data</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800">
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">24</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Total Orders</div>
                      </div>
                      <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800">
                        <div className="text-2xl font-bold text-slate-900 dark:text-white">$4,280</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Lifetime Value</div>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">Recent Order: #1847</div>
                      <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex justify-between">
                          <span>2× Classic Hoodie</span>
                          <span>$158.00</span>
                        </div>
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <Check className="h-3 w-3" />
                          <span>Delivered Jan 18, 2026</span>
                        </div>
                        <div className="text-slate-500 dark:text-slate-400">
                          Tracking: 1Z999AA10123456784
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <ExternalLink className="h-4 w-4" />
                      <span>View in Shopify Admin</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Problem/Solution Section */}
        <section className="border-b border-slate-200 py-20 dark:border-white/10">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="text-center">
              <h2 className="font-[var(--font-custom)] text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                Stop Switching Between Shopify and Email
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
                Every &quot;Where&apos;s my order?&quot; email takes 3-5 minutes of tab-switching. Aidly shows everything in one place.
              </p>
            </div>

            <div className="mt-16 grid gap-8 lg:grid-cols-2">
              {/* Without Aidly */}
              <div className="rounded-2xl border-2 border-red-200 bg-red-50/50 p-8 dark:border-red-900/30 dark:bg-red-900/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                    <X className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Without Aidly</h3>
                </div>
                <ol className="mt-6 space-y-3 text-slate-700 dark:text-slate-300">
                  <li className="flex gap-3">
                    <span className="font-mono text-sm text-slate-400">1.</span>
                    <span>Customer emails: &quot;Where&apos;s my order?&quot;</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono text-sm text-slate-400">2.</span>
                    <span>Agent switches to Shopify admin</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono text-sm text-slate-400">3.</span>
                    <span>Searches for order by email</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono text-sm text-slate-400">4.</span>
                    <span>Finds order, copies tracking number</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono text-sm text-slate-400">5.</span>
                    <span>Switches back to email, pastes tracking</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono text-sm text-slate-400">6.</span>
                    <span>Manually types response</span>
                  </li>
                </ol>
                <div className="mt-6 flex items-center gap-2 text-red-600 dark:text-red-400">
                  <Clock className="h-5 w-5" />
                  <span className="font-semibold">Total time: 3-5 minutes per email</span>
                </div>
              </div>

              {/* With Aidly */}
              <div className="rounded-2xl border-2 border-green-200 bg-green-50/50 p-8 dark:border-green-900/30 dark:bg-green-900/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                    <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">With Aidly</h3>
                </div>
                <ol className="mt-6 space-y-3 text-slate-700 dark:text-slate-300">
                  <li className="flex gap-3">
                    <span className="font-mono text-sm text-slate-400">1.</span>
                    <span>Customer emails: &quot;Where&apos;s my order?&quot;</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono text-sm text-slate-400">2.</span>
                    <span>Shopify data loads automatically in Aidly</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono text-sm text-slate-400">3.</span>
                    <span>AI drafts response with tracking number</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono text-sm text-slate-400">4.</span>
                    <span>Agent reviews draft (looks perfect!)</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-mono text-sm text-slate-400">5.</span>
                    <span>Agent clicks send</span>
                  </li>
                </ol>
                <div className="mt-6 flex items-center gap-2 text-green-600 dark:text-green-400">
                  <Zap className="h-5 w-5" />
                  <span className="font-semibold">Total time: 30 seconds per email</span>
                </div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-lg font-semibold text-slate-900 dark:text-white">
                Save 90% of your time on &quot;Where&apos;s my order?&quot; emails (30-40% of all support volume)
              </p>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="border-b border-slate-200 py-20 dark:border-white/10">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="text-center">
              <h2 className="font-[var(--font-custom)] text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                How Aidly Compares to Alternatives
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
                Same Shopify integration, AI-powered responses, 1/3 the price.
              </p>
            </div>

            <div className="mt-12 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 dark:border-white/10">
                    <th className="px-4 py-4 text-left text-sm font-semibold text-slate-900 dark:text-white">Feature</th>
                    <th className="bg-gradient-to-br from-[#3872B9]/10 to-[#B33275]/10 px-4 py-4 text-center text-sm font-semibold text-slate-900 dark:text-white">
                      Aidly
                    </th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-slate-900 dark:text-white">Gorgias</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-slate-900 dark:text-white">Zendesk</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-slate-900 dark:text-white">Help Scout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                  <tr>
                    <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">Shopify Integration</td>
                    <td className="bg-gradient-to-br from-[#3872B9]/5 to-[#B33275]/5 px-4 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                        <Check className="h-4 w-4" /> Native
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                        <Check className="h-4 w-4" /> Native
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-slate-500 dark:text-slate-400">Via App</td>
                    <td className="px-4 py-4 text-center text-sm text-slate-500 dark:text-slate-400">Via App</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">AI Response Drafts</td>
                    <td className="bg-gradient-to-br from-[#3872B9]/5 to-[#B33275]/5 px-4 py-4 text-center">
                      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                        <Check className="h-4 w-4" /> Included
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-slate-500 dark:text-slate-400">$50/agent extra</td>
                    <td className="px-4 py-4 text-center text-sm text-slate-500 dark:text-slate-400">$50/agent extra</td>
                    <td className="px-4 py-4 text-center">
                      <X className="mx-auto h-4 w-4 text-red-500" />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">Setup Time</td>
                    <td className="bg-gradient-to-br from-[#3872B9]/5 to-[#B33275]/5 px-4 py-4 text-center">
                      <span className="font-semibold text-slate-900 dark:text-white">2 minutes</span>
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-slate-500 dark:text-slate-400">1-2 hours</td>
                    <td className="px-4 py-4 text-center text-sm text-slate-500 dark:text-slate-400">2-4 weeks</td>
                    <td className="px-4 py-4 text-center text-sm text-slate-500 dark:text-slate-400">30 minutes</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">Starting Price</td>
                    <td className="bg-gradient-to-br from-[#3872B9]/5 to-[#B33275]/5 px-4 py-4 text-center">
                      <span className="font-semibold text-green-600 dark:text-green-400">$208/mo</span>
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-slate-500 dark:text-slate-400">$300-900/mo</td>
                    <td className="px-4 py-4 text-center text-sm text-slate-500 dark:text-slate-400">$600-1,200/mo</td>
                    <td className="px-4 py-4 text-center text-sm text-slate-500 dark:text-slate-400">$100-300/mo</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">Email Focus</td>
                    <td className="bg-gradient-to-br from-[#3872B9]/5 to-[#B33275]/5 px-4 py-4 text-center">
                      <Check className="mx-auto h-4 w-4 text-green-600 dark:text-green-400" />
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-slate-500 dark:text-slate-400">Multi-channel</td>
                    <td className="px-4 py-4 text-center text-sm text-slate-500 dark:text-slate-400">Multi-channel</td>
                    <td className="px-4 py-4 text-center">
                      <Check className="mx-auto h-4 w-4 text-green-600 dark:text-green-400" />
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-300">Best For</td>
                    <td className="bg-gradient-to-br from-[#3872B9]/5 to-[#B33275]/5 px-4 py-4 text-center text-sm">
                      <span className="font-medium text-slate-900 dark:text-white">AI + Email</span>
                    </td>
                    <td className="px-4 py-4 text-center text-sm text-slate-500 dark:text-slate-400">All-in-one</td>
                    <td className="px-4 py-4 text-center text-sm text-slate-500 dark:text-slate-400">Enterprise</td>
                    <td className="px-4 py-4 text-center text-sm text-slate-500 dark:text-slate-400">Simple teams</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-8 text-center">
              <Link href="/compare/gorgias-alternative" className="text-sm text-[#3872B9] hover:underline dark:text-[#3872B9]">
                See detailed Gorgias comparison →
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-b border-slate-200 py-20 dark:border-white/10">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="text-center">
                <div className="flex items-center justify-center">
                  <TrendingUp className="h-8 w-8 text-[#3872B9]" />
                </div>
                <div className="mt-3 text-4xl font-bold text-slate-900 dark:text-white">90%</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">Cost Reduction</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center">
                  <Clock className="h-8 w-8 text-[#B33275]" />
                </div>
                <div className="mt-3 text-4xl font-bold text-slate-900 dark:text-white">30s</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">Avg Response Time</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center">
                  <Zap className="h-8 w-8 text-[#F38135]" />
                </div>
                <div className="mt-3 text-4xl font-bold text-slate-900 dark:text-white">3×</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">More Emails Handled</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center">
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
                <div className="mt-3 text-4xl font-bold text-slate-900 dark:text-white">$208</div>
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">Starting Price/Month</div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="border-b border-slate-200 py-20 dark:border-white/10">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="text-center">
              <h2 className="font-[var(--font-custom)] text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                Simple, Transparent Pricing
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
                All plans include Shopify integration, AI responses, and unlimited agents.
              </p>
            </div>

            <div className="mx-auto mt-12 grid max-w-5xl gap-8 lg:grid-cols-2">
              {/* Plus Plan */}
              <div className="rounded-2xl border-2 border-slate-200 bg-white p-8 dark:border-white/10 dark:bg-slate-900">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Plus</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Perfect for growing Shopify stores</p>
                <div className="mt-6">
                  <span className="text-5xl font-bold text-slate-900 dark:text-white">$208</span>
                  <span className="text-slate-600 dark:text-slate-400">/month</span>
                </div>
                <ul className="mt-8 space-y-3">
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">5,000 emails/month</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Unlimited agents</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">AI response drafts</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Native Shopify integration</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Knowledge base training</span>
                  </li>
                </ul>
              </div>

              {/* Pro Plan */}
              <div className="relative rounded-2xl border-2 border-[#3872B9] bg-gradient-to-br from-[#3872B9]/5 to-[#B33275]/5 p-8">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#3872B9] to-[#B33275] px-4 py-1 text-sm font-semibold text-white">
                  Most Popular
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Pro</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">For high-volume Shopify stores</p>
                <div className="mt-6">
                  <span className="text-5xl font-bold text-slate-900 dark:text-white">$608</span>
                  <span className="text-slate-600 dark:text-slate-400">/month</span>
                </div>
                <ul className="mt-8 space-y-3">
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">25,000 emails/month</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Everything in Plus</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Priority support</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Advanced analytics</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
                    <span className="text-sm text-slate-700 dark:text-slate-300">Custom integrations</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8 text-center">
              <Link href="/#pricing" className="text-sm text-[#3872B9] hover:underline">
                See all pricing plans →
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
            <h2 className="font-[var(--font-custom)] text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              Ready to Transform Your Shopify Support?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
              Connect your Shopify store in 2 minutes. Try 5 emails free. No credit card required.
            </p>

            <div className="mt-10">
              <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-center">
                <div className="sm:w-80">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    disabled={status === "sending" || status === "sent"}
                    className="h-12 w-full rounded-lg border border-slate-300 px-4 text-base placeholder:text-slate-400 focus:border-[#3872B9] focus:outline-none focus:ring-2 focus:ring-[#3872B9]/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:focus:border-[#3872B9]"
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  disabled={status === "sending" || status === "sent"}
                  className="h-12 whitespace-nowrap bg-gradient-to-r from-[#3872B9] via-[#B33275] to-[#F38135] px-8 text-base font-semibold text-white hover:opacity-90"
                >
                  {status === "sending" ? "Sending..." : status === "sent" ? "Check Your Email" : "Get Started Free"}
                  {status === "idle" && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </form>

              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                Join Shopify stores saving hours on customer support every day.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
