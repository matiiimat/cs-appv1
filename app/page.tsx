"use client"

import Image from "next/image"
import { TestimonialsCarousel } from "@/components/testimonials-carousel"
import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function Home() {
  const [annual, setAnnual] = useState<boolean>(true)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>("")

  async function startCheckout() {
    setError("")
    try {
      setLoading(true)
      const resp = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Let Stripe Checkout collect the email
        body: JSON.stringify({ annual })
      })
      if (!resp.ok) throw new Error('Failed to start checkout')
      const data = await resp.json()
      if (data?.url) {
        window.location.href = data.url
      } else {
        setError('Checkout URL not returned')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Top Nav */}
      <header className="sticky top-0 z-20 border-b border-border/50 bg-card/70 backdrop-blur">
        <div className="container mx-auto grid grid-cols-[1fr_auto_1fr] items-center px-4 py-4">
          {/* left spacer */}
          <div></div>
          {/* centered brand */}
          <div className="flex items-center justify-center gap-2">
            <Image src="/logo-60x.png" alt="Aidly" width={24} height={24} />
            <span className="text-base font-bold">Aidly</span>
          </div>
          {/* right CTAs */}
          <div className="flex items-center justify-end gap-2">
            <Button asChild variant="ghost">
              <Link href="/app/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="#pricing">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-10 md:py-16">
        <div className="relative overflow-hidden rounded-2xl bg-[#0a0a0a]">
          <div className="absolute inset-0">
            <Image
              src="/hero.png"
              alt="Aidly hero"
              fill
              priority
              className="object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent" />
          </div>
          <div className="relative mx-auto max-w-3xl px-6 py-20 text-center md:py-28">
            <h1 className="text-4xl font-bold tracking-tight text-white md:text-6xl">
              Grow your business, not your support costs
            </h1>
            <p className="mt-4 text-lg text-white md:text-xl">
              Intelligent automation that delivers faster, smarter support at lower cost.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link href="#pricing" className="text-white">Get started</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#features">Features</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="container mx-auto px-4 py-16 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl md:text-3xl font-semibold">How it works</h2>
          <p className="mt-2 text-muted-foreground">A quick overview of Aidly in action.</p>
        </div>
        <div className="mt-8 mx-auto max-w-4xl">
          <div
            className="relative w-full overflow-hidden rounded-lg border bg-card shadow-sm"
            style={{ aspectRatio: '16 / 9' }}
          >
            <div className="absolute inset-0 grid place-items-center text-muted-foreground">
              <div className="flex flex-col items-center">
                <div className="h-16 w-16 rounded-full bg-muted/60 flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <p className="mt-3 text-sm">Product video coming soon</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
  <section id="features" className="container mx-auto px-4 py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl md:text-3xl font-semibold">What you get</h2>
          <p className="mt-2 text-muted-foreground">
            Purpose-built tools to triage and resolve conversations quickly.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { title: "AI Triage", desc: "Automatically route and prioritize incoming conversations for faster response." },
            { title: "Agent Assist", desc: "Suggested replies and summaries to reduce handle time." },
            { title: "Insights", desc: "Real-time dashboards to track volumes, CSAT and deflection." },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-medium">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
  </section>

  {/* Users Opinion */}
  <section id="testimonials" className="container mx-auto px-4 py-16 md:py-20">
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="text-2xl md:text-3xl font-semibold">What our users say</h2>
      <p className="mt-2 text-muted-foreground">Real feedback from teams using Aidly daily.</p>
    </div>
    <div className="mt-8">
      {/* Lightweight carousel with 10 placeholder opinions */}
      <TestimonialsCarousel />
    </div>
  </section>


      {/* Pricing */}
      <section id="pricing" className="container mx-auto px-4 py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl md:text-3xl font-semibold">Simple pricing</h2>
          <p className="mt-2 text-muted-foreground">Choose monthly or yearly. Cancel anytime.</p>
        </div>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            className={`rounded-md border px-3 py-1 text-sm ${!annual ? "bg-card" : "bg-primary text-primary-foreground border-transparent"}`}
            onClick={() => setAnnual(true)}
          >
            Yearly
          </button>
          <button
            className={`rounded-md border px-3 py-1 text-sm ${annual ? "bg-card" : "bg-primary text-primary-foreground border-transparent"}`}
            onClick={() => setAnnual(false)}
          >
            Monthly
          </button>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {/* Pro plan */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold">Pro</h3>
            <p className="mt-1 text-sm text-muted-foreground">Everything you need to run efficient support.</p>
            <div className="mt-4 flex items-end gap-1">
              <span className="text-4xl font-bold">{annual ? "$1999" : "$199"}</span>
              <span className="text-muted-foreground">/{annual ? "year" : "month"}</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              <li>AI triage and agent assist</li>
              <li>Dashboards and analytics</li>
              <li>Email support</li>
            </ul>
            <div className="mt-6 space-y-2">
              <Button className="w-full" onClick={startCheckout} disabled={loading}>
                {loading ? 'Starting…' : 'Get started'}
              </Button>
              {error && <div className="text-sm text-red-600">{error}</div>}
              <p className="text-xs text-muted-foreground">You’ll be redirected to Stripe Checkout where you’ll enter your email. The plan is 0€ in test.</p>
            </div>
          </div>

          {/* Enterprise plan */}
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold">Enterprise</h3>
            <p className="mt-1 text-sm text-muted-foreground">Custom needs, SLAs, and security reviews.</p>
            <div className="mt-4 flex items-end gap-1">
              <span className="text-4xl font-bold">Custom</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              <li>Custom onboarding and support</li>
              <li>Security & compliance reviews</li>
              <li>Volume-based pricing</li>
            </ul>
            <Button asChild variant="outline" className="mt-6 w-full">
              <a href="mailto:sales@aidly.me">Contact sales</a>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container mx-auto px-4 py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl md:text-3xl font-semibold">FAQ</h2>
        </div>
        <div className="mx-auto mt-6 max-w-3xl space-y-4">
          {[
            { q: "Is there a trial?", a: "No trial at launch. You can cancel anytime and keep access until the end of the billing period." },
            { q: "Can I cancel?", a: "Yes, from billing settings. Access remains until the paid period ends." },
            { q: "Do you support teams?", a: "Team/seat billing is not available yet; planned for later." },
          ].map((f) => (
            <div key={f.q} className="rounded-lg border bg-card p-4">
              <p className="font-medium">{f.q}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="border-t border-border/60">
        <div className="container mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex items-center gap-2 justify-self-start">
            <Image src="/logo-60x.png" alt="Aidly" width={18} height={18} />
            <span className="text-sm">© {new Date().getFullYear()} Aidly</span>
          </div>
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground justify-self-center">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/careers">Careers</Link>
            <a href="mailto:support@aidly.me">support@aidly.me</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
