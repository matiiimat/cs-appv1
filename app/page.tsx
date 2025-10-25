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
                <Link href="#how-it-works">Features</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="container mx-auto px-4 py-16 md:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl md:text-3xl font-semibold">See It In Action</h2>
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

      {/* Features 
  <section id="features" className="container mx-auto px-4 py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl md:text-3xl font-semibold">What you get</h2>
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
  </section> */}

  {/* Users Opinion */}
  <section id="testimonials" className="container mx-auto px-4 py-16 md:py-20">
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="text-2xl md:text-3xl font-semibold">Trusted by Support Teams Everywhere</h2>
    </div>
    <div className="mt-10 relative overflow-hidden">
      <div className="logo-marquee">
        <div className="logo-track">
          {[...Array(2)].map((_, dupIdx) => (
            <div className="flex items-center gap-12 pr-12" aria-hidden={dupIdx === 1} key={dupIdx}>
              {Array.from({ length: 7 }).map((__, i) => (
                <a
                  href="https://braceletsdemontre.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-80 hover:opacity-100 transition-opacity"
                  key={`${dupIdx}-${i}`}
                  aria-label="Visit braceletsdemontre.com"
                >
                  <Image
                    src="/fonts/users/bdm-logo-light.png"
                    alt="Customer logo"
                    width={210}
                    height={60}
                    className="h-12 w-auto object-contain"
                  />
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>
      <style jsx>{`
        .logo-track {
          display: flex;
          width: max-content;
          animation: logo-scroll 28s linear infinite;
        }
        @keyframes logo-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  </section>


      {/* Pricing */}
      <section id="pricing" className="container mx-auto px-4 py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl md:text-3xl font-semibold">Simple Pricing</h2>
          <p className="mt-2 text-muted-foreground font-bold">14-day money-back guarantee.</p>
          <p className="mt-2 text-muted-foreground">Choose monthly or yearly. Cancel anytime.</p>
        </div>
        <div className="mt-6 flex items-center justify-center gap-3">

          <button
            className={`rounded-md border px-3 py-1 text-sm ${annual ? "bg-card" : "bg-primary text-primary-foreground border-transparent"}`}
            onClick={() => setAnnual(false)}
          >
            Monthly
          </button>
          <button
            className={`rounded-md border px-3 py-1 text-sm ${!annual ? "bg-card" : "bg-primary text-primary-foreground border-transparent"}`}
            onClick={() => setAnnual(true)}
          >
            Yearly
          </button>
        </div>
        <div className="mt-8 grid gap-6 grid-cols-1 place-items-center">
          {/* Pro plan */}
          <div className="w-full max-w-md rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold">Pro</h3>
            <p className="mt-1 text-sm text-muted-foreground">Everything you need to run efficient support.</p>
            <div className="mt-4 flex items-end gap-1">
              <span className="text-4xl font-bold">{annual ? "$167" : "$199"}</span>
              <span className="text-muted-foreground">/{annual ? "month - ($1999 yearly)" : "month"}</span>
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
              <p className="text-xs text-muted-foreground">You will be redirected to Stripe Checkout to provide your email address. This email will serve as your login.</p>
            </div>
          </div>

          {/* Enterprise plan
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
          </div> */}

        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container mx-auto px-4 py-16 md:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl md:text-3xl font-semibold">FAQ</h2>
        </div>
        <div className="mx-auto mt-6 max-w-3xl space-y-4">
          {[
            { q: "How do I get started?", a: "Setup takes just a minute. Once you register, Aidly creates a unique support email for you. Simply forward your existing support address to it (or use it directly), add your favorite AI provider’s API key, and you're ready to go." },
            { q: "How do you handle data?", a: "You own your data; we only process it to deliver the service. Sensitive message fields are encrypted at rest with per‑organization keys and protected by TLS in transit, with least‑privilege, audited access. We’re EU‑based and GDPR‑aware, offering a DPA and a transparent subprocessor list, with SCCs for any non‑EEA transfers. You can request export or deletion anytime." },
            { q: "Which AI provider and models do you support?", a: "All models from OpenAI and Anthropic." },
            { q: "Can I use my own LLM?", a: "Soon! We’re working on it." },
            { q: "I am not satisfied with the tool, can I cancel?", a: "Of course! Send a message to our support team, and we'll proceed with the cancellation. If you could let us know what made you cancel, that would be greatly appreciated." },
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
          <div className="hidden md:block justify-self-end text-sm text-muted-foreground">
            Made with <span aria-label="love" role="img">❤️</span> in <span aria-label="France" role="img">🇫🇷</span>
          </div>
        </div>
      </footer>
    </main>
  )
}
