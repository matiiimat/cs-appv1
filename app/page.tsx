"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function ParallaxHero({ children }: { children: React.ReactNode }) {
  const backdropRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = backdropRef.current
    if (!el) return
    const onScroll = () => {
      const y = window.scrollY || 0
      el.style.setProperty('--p1', `${y * 0.08}px`)
      el.style.setProperty('--p2', `${y * 0.16}px`)
      el.style.setProperty('--p3', `${y * 0.12}px`)
    }
    const onMouseMove = (e: MouseEvent) => {
      const mx = (e.clientX / window.innerWidth) * 2 - 1 // -1..1
      const my = (e.clientY / window.innerHeight) * 2 - 1
      el.style.setProperty('--mx', `${mx}`)
      el.style.setProperty('--my', `${my}`)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('mousemove', onMouseMove, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [])

  return (
    <>
      {/* Page-wide fixed background */}
      <div
        ref={backdropRef}
        className="fixed inset-0 -z-10 pointer-events-none"
      >
        {/* Base faint wash to ensure visible color site-wide */}
        <div
          className="absolute inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(120% 80% at 10% 90%, rgba(59,130,246,0.16), transparent 60%), radial-gradient(100% 70% at 85% 15%, rgba(239,68,68,0.12), transparent 55%)',
          }}
        />
        {/* Blue glow bottom-left */}
        <div
          className="absolute -inset-1 opacity-95 will-change-transform blur-3xl"
          style={{
            transform: 'translate3d(calc(var(--mx, 0) * 6px), calc(var(--p1, 0px) + var(--my, 0) * 6px), 0)',
            background:
              'radial-gradient(48% 48% at 15% 85%, rgba(59,130,246,0.55), transparent 62%)',
          }}
        />
        {/* Red burst center */}
        <div
          className="absolute -inset-1 opacity-80 will-change-transform blur-[30px]"
          style={{
            transform: 'translate3d(calc(var(--mx, 0) * 10px), calc(var(--p2, 0px) + var(--my, 0) * 10px), 0)',
            background:
              'radial-gradient(40% 40% at 50% 58%, rgba(239,68,68,0.55), transparent 66%)',
          }}
        />
        {/* Secondary blue top-right */}
        <div
          className="absolute -inset-1 opacity-85 will-change-transform blur-3xl"
          style={{
            transform: 'translate3d(calc(var(--mx, 0) * 8px), calc(var(--p3, 0px) + var(--my, 0) * 8px), 0)',
            background:
              'radial-gradient(40% 40% at 88% 12%, rgba(37,99,235,0.48), transparent 90%)',
          }}
        />
        {/* Copper accent bottom-right (visible on load, no parallax shift) */}
        <div
          className="absolute -inset-1 opacity-95 blur-xl"
          style={{
            transform: 'translate3d(calc(var(--mx, 0) * 8px), calc(var(--my, 0) * 8px), 0)',
            background:
              'radial-gradient(65% 65% at 96% 92%, rgba(184,115,51,0.75), transparent 88%)',
          }}
        />
      </div>
      {children}
    </>
  )
}

function Home() {
  const [annual, setAnnual] = useState<boolean>(true)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>("")
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)
  // ROI calculator state
  const [tickets, setTickets] = useState<number>(500)
  const [minutes, setMinutes] = useState<number>(6)
  const [costPerHour, setCostPerHour] = useState<number>(28)

  const formatUSD = (n: number) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n)))

  const hours = (tickets * minutes) / 60
  const currentCost = hours * costPerHour
  const autoLow = 0.60 // conservative automation share
  const assistSpeedup = 0.40 // faster handling on remaining
  const afterConservative = currentCost * (1 - autoLow) * (1 - assistSpeedup)
  const grossSavings = currentCost - afterConservative
  const planMonthly = 167
  const netSavings = grossSavings - planMonthly

  // Close lightbox with ESC
  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

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
    <ParallaxHero>
      <main className="min-h-screen bg-transparent">
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
            <Button>
              <Link href="/app/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Limited Time Offer Banner */}
      <section className="bg-gradient-to-r from-primary/90 to-primary py-3 text-center text-primary-foreground">
        <div className="container mx-auto px-4">
          <p className="text-sm font-medium md:text-base">
            <strong>Limited Time:</strong> Get your first month FREE with code <span className="font-bold bg-white/20 px-2 py-1 rounded">BF26FREEMONTH</span>
          </p>
        </div>
      </section>

      {/* Hero */}
      <section className="container mx-auto px-4 py-10 md:py-16">
        <div className="relative mx-auto max-w-3xl px-6 pt-20 pb-10 text-center md:pt-12 md:pb-6">
          

<h1 className="text-4xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
  <span className="block">
    Reduce support costs
  </span>

  <span
    className="block text-transparent bg-clip-text"
    style={{ backgroundImage: "linear-gradient(to right, #B05755, #B33275)" }}
  >
    by 90%
  </span>

  <span className="block">
    Deliver 100% better replies
  </span>
</h1>
          <p className="mt-6 text-lg text-muted-foreground md:text-xl lg:text-2xl max-w-3xl mx-auto">
            Aidly delivers instant, high quality{' '}
            <span className="font-bold" style={{ color: '#3872B9' }}>customer support with AI</span>
            , so you can scale without hiring or training a support team.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
           
            <Button asChild size="lg" variant="outline" className="text-base px-8 py-3 h-auto">
              <Link href="#features">See how it works</Link>
            </Button>
            <Button asChild size="lg" className="text-base px-8 py-3 h-auto text-white hover:opacity-90" style={{backgroundColor: '#3872B9'}}>
              <Link href="#pricing">Starting at $167/month</Link>
            </Button>
          </div>

          {/* Risk Reversal */}
          <div className="mt-8 p-4 border rounded-lg max-w-2xl mx-auto" style={{backgroundColor: '#B05755', borderColor: '#F38135'}}>
            <p className="text-sm font-medium text-center text-white">
              <span className="font-bold">Risk-Free Guarantee:</span> 14 day money-back guarantee, no questions asked. 
            </p>
          </div>
        </div>
      </section>

      

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-4xl text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How Aidly Solves Your Biggest Support Challenges</h2>
          <p className="text-lg text-muted-foreground">Faster replies, lower costs, and consistent quality, without extra headcount.</p>
        </div>

        {/* Feature 1: image left, text right */}
        <div className="mt-20 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div
            className="rounded-2xl border bg-gradient-to-br from-card to-card/50 p-1 overflow-hidden w-full max-w-[70%] mx-auto cursor-zoom-in group shadow-lg hover:shadow-xl transition-all duration-300"
            onClick={() => setLightbox({ src: '/fonts/users/launch-fast.png', alt: 'Launch Fast' })}
            role="button"
            aria-label="Enlarge image: Launch Fast"
          >
            <div className="relative w-full transition-transform duration-300 ease-out group-hover:scale-[1.02]" style={{ aspectRatio: '3 / 2' }}>
              <Image
                src="/fonts/users/launch-fast.png"
                alt="Feature preview"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-contain rounded-xl"
              />
            </div>
          </div>
          <div className="text-left lg:text-left space-y-4">
            <h3 className="text-2xl lg:text-3xl font-bold">Most support tools take months to implement. You need relief today.</h3>
            <p className="text-base lg:text-lg text-muted-foreground leading-relaxed mb-4">
              <span className="text-red-600 font-medium">The Problem:</span> Your team is drowning in tickets right now, but typical support tools require weeks of setup, training, and integration work.
            </p>
            <p className="text-base lg:text-lg text-foreground leading-relaxed font-medium">
              <span className="text-green-600 font-bold">Our Solution:</span> Get AI-powered responses running in 2 minutes, not 2 months. Connect your AI, set up mail forwarding. Done.
            </p>
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 font-medium">⏱️ <strong>Average setup time: 2 minutes</strong> vs 2-8 weeks with competitors</p>
            </div>
          </div>
        </div>

        {/* Feature 2: image right, text left */}
        <div className="mt-24 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="order-2 lg:order-1 text-left space-y-4">
            <h3 className="text-2xl lg:text-3xl font-bold">Your customers expect instant responses. Your team can&apos;t work 24/7.</h3>
            <p className="text-base lg:text-lg text-muted-foreground leading-relaxed mb-4">
              <span className="text-red-600 font-medium">The Problem:</span> SLA breaches are killing your customer satisfaction. Every delayed response risks losing a customer forever.
            </p>
            <p className="text-base lg:text-lg text-foreground leading-relaxed font-medium">
              <span className="text-green-600 font-bold">Our Solution:</span> AI drafts replies instantly. You approve and send. Never miss an SLA, never lose a customer to slow support.
            </p>
            <div className="mt-4 space-y-2">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">🛡️ <strong>You stay in control:</strong> Nothing sends without your approval</p>
              </div>
            </div>
          </div>
          <div
            className="order-1 lg:order-2 rounded-2xl border bg-gradient-to-br from-card to-card/50 p-1 overflow-hidden w-full max-w-[70%] mx-auto cursor-zoom-in group shadow-lg hover:shadow-xl transition-all duration-300"
            onClick={() => setLightbox({ src: '/fonts/users/automate-replies.png', alt: 'Automate Replies' })}
            role="button"
            aria-label="Enlarge image: Automate Replies"
          >
            <div className="relative w-full transition-transform duration-300 ease-out group-hover:scale-[1.02]" style={{ aspectRatio: '3 / 2' }}>
              <Image
                src="/fonts/users/automate-replies.png"
                alt="Feature preview"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-contain rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Feature 3: image left, text right */}
        <div className="mt-24 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div
            className="rounded-2xl border bg-gradient-to-br from-card to-card/50 p-1 overflow-hidden w-full max-w-[70%] mx-auto cursor-zoom-in group shadow-lg hover:shadow-xl transition-all duration-300"
            onClick={() => setLightbox({ src: '/fonts/users/customize-image.png', alt: 'Customize' })}
            role="button"
            aria-label="Enlarge image: Customize"
          >
            <div className="relative w-full transition-transform duration-300 ease-out group-hover:scale-[1.02]" style={{ aspectRatio: '3 / 2' }}>
              <Image
                src="/fonts/users/customize-image.png"
                alt="Feature preview"
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-contain rounded-xl"
              />
            </div>
          </div>
          <div className="text-left space-y-4">
            <h3 className="text-2xl lg:text-3xl font-bold">Aidly learns from your best support cases.</h3>
            <p className="text-base lg:text-lg text-muted-foreground leading-relaxed mb-4">
              <span className="text-red-600 font-medium">The Problem:</span> Repetitive tickets force you to solve the same problems over and over.
            </p>
            <p className="text-base lg:text-lg text-foreground leading-relaxed font-medium">
              <span className="text-green-600 font-bold">Our Solution:</span> When a manual reply is spot on, you can have Aidly remember the ticket. Aidly stores that successful case and reuses the same resolution for similar requests.
            </p>
            <div className="mt-4 space-y-2">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-medium">🎯 <strong>Continuous Learning System:</strong> With time and your feedback, Aidly keeps improving, so you rely less on manual reviews.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      

      {/* How it works 
      <section id="how-it-works" className="container mx-auto px-4 pt-6 pb-12 md:pt-8 md:pb-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl md:text-3xl font-semibold">See It In Action</h2>
        </div>
        <div className="mt-6 mx-auto max-w-4xl">
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
      </section> */}

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

  {/* Users Opinion 
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
*/}

      {/* Calculator */}
      <section id="calculator" className="container mx-auto px-4 py-8 md:py-12">
        <div className="mx-auto max-w-4xl text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Stop Overspending on Support</h2>
          <p className="text-lg text-muted-foreground mb-6">Every minute spent on repetitive support emails drains your budget. Every slow reply risks a lost customer.</p>

          {/* Serious ROI Calculator */}
          <div className="border rounded-2xl p-6 md:p-8 mb-8 bg-background">
            <h3 className="text-xl font-semibold mb-6 text-foreground">
              Support Cost & Savings Estimator
            </h3>

            <div className="grid md:grid-cols-3 gap-4 text-left mb-6">
              <label className="space-y-2">
                <span className="text-sm text-muted-foreground">Tickets per month</span>
                <input
                  type="number"
                  value={tickets}
                  min={0}
                  onChange={(e) => setTickets(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-foreground"
                  id="tickets"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-muted-foreground">Avg minutes per ticket</span>
                <input
                  type="number"
                  value={minutes}
                  min={0}
                  onChange={(e) => setMinutes(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-foreground"
                  id="minutes"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm text-muted-foreground">Support cost per hour</span>
                <input
                  type="number"
                  value={costPerHour}
                  min={0}
                  onChange={(e) => setCostPerHour(Math.max(0, Number(e.target.value)))}
                  className="w-full rounded-lg border bg-background px-3 py-2 text-foreground"
                  id="costPerHour"
                />
              </label>
            </div>

            {/* Results row */}
            <div className="grid md:grid-cols-2 gap-4 text-center">
              <div className="rounded-xl border p-4">
                <div className="text-sm text-muted-foreground mb-1">Current monthly cost</div>
                <div className="text-2xl font-bold text-foreground" id="currentCost">{formatUSD(currentCost)}</div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-sm text-muted-foreground mb-1">Monthly net savings (after $167 plan)</div>
                <div
                  className="text-2xl font-bold text-transparent bg-clip-text"
                  style={{ backgroundImage: 'linear-gradient(to right, #2fa504ff, #209306ff)' }}
                  id="savings"
                >
                  {formatUSD(Math.max(0, netSavings))}
                </div>
                {netSavings <= 0 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Maybe you don&apos;t need Aidly yet 😉
                  </div>
                )}
              </div>
            </div>

            {/* Assumptions */}
            <div className="mt-6 text-center text-sm text-muted-foreground space-y-2">
              <div>Assumptions, based on typical Aidly customers:</div>
              <ul className="list-disc inline-block text-left pl-5 space-y-1">
                <li>Automation of repetitive tickets: <b>60–85%</b></li>
                <li>Time reduction on remaining tickets: <b>40%</b></li>
              </ul>
            </div>
          </div>

        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-4xl text-center mb-8">
          <div className="border rounded-2xl p-6 bg-muted/30 text-center">
            <h3 className="text-xl font-semibold text-foreground">Plans start at $167/month</h3>
            <p className="text-sm text-muted-foreground mt-1">14 day money back guarantee, no questions asked.</p>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-center gap-3">
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
        <div className="mt-6 grid gap-6 grid-cols-1 place-items-center">
          <Card className="w-full max-w-lg relative overflow-hidden border-2 transition-colors duration-300 shadow-lg" style={{borderColor: '#3872B9'}}>
            <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full" style={{background: `linear-gradient(to bottom right, #3872B9, transparent)`, opacity: 0.2}}></div>
            <div className="absolute top-4 right-4 text-white text-xs px-2 py-1 rounded-full font-bold" style={{backgroundColor: '#F38135'}}>BEST VALUE</div>
            <CardHeader>
              <CardTitle className="text-2xl">Simplify Customer Support</CardTitle>
              <CardDescription className="text-base">Transform your support team in minutes, not months</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <div className="flex items-end gap-2 justify-center">
                  <span className="text-4xl font-bold">${annual ? "167" : "199"}</span>
                  <span className="text-muted-foreground text-base pb-1">/month</span>
                </div>
                {annual && (
                  <p className="text-sm text-muted-foreground mt-1 text-center">$1999 billed yearly • Save $384</p>
                )}
              </div>

              <div className="mb-6 text-center">
                <h4 className="font-semibold mb-3">What you get immediately:</h4>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-sm">
                    <svg className="h-5 w-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span><strong>Faster responses</strong> - Never miss an SLA again</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <svg className="h-5 w-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span><strong>Hours saved weekly</strong> - Free up your team</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <svg className="h-5 w-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span><strong>Churn prevention alerts</strong> - Save at-risk customers</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <svg className="h-5 w-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span><strong>2-minutes setup</strong> - No months of implementation</span>
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <Button className="w-full h-12 text-base font-bold text-white hover:opacity-90" onClick={startCheckout} disabled={loading} style={{backgroundColor: '#3872B9'}}>
                  {loading ? 'Setting up secure payment' : 'Try Aidly today →'}
                </Button>
                {error && <div className="text-sm text-red-600 text-center">{error}</div>}
                <p className="text-xs text-muted-foreground text-center leading-relaxed">Secure Stripe checkout • Start saving immediately • Cancel anytime</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section id="problem" className="container mx-auto px-4 py-8 md:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">The Support Team Struggle is Real</h2>
            <p className="text-lg text-muted-foreground">Every support team faces the same daily challenges</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Problems */}
            <div>
              <h3 className="text-2xl font-bold mb-8 text-muted-foreground">What&apos;s killing your productivity:</h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-4 bg-white/20 backdrop-blur rounded-lg border border-white/30">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{backgroundColor: '#B05755'}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 6 L18 18 M6 18 L18 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-muted-foreground mb-1">Drowning in repetitive emails</h4>
                    <p className="text-sm text-muted-foreground/80">Same questions, different customers, every single day</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-white/20 backdrop-blur rounded-lg border border-white/30">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{backgroundColor: '#B05755'}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 6 L18 18 M6 18 L18 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-muted-foreground mb-1">Missing SLA deadlines</h4>
                    <p className="text-sm text-muted-foreground/80">Customers getting frustrated with slow responses</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-white/20 backdrop-blur rounded-lg border border-white/30">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{backgroundColor: '#B05755'}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 6 L18 18 M6 18 L18 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-muted-foreground mb-1">Long and cumbersome onboarding</h4>
                    <p className="text-sm text-muted-foreground/80">  Aidly is live in 5 minutes, no training required.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-white/20 backdrop-blur rounded-lg border border-white/30">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{backgroundColor: '#B05755'}}>
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M6 6 L18 18 M6 18 L18 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-muted-foreground mb-1">Losing customers</h4>
                    <p className="text-sm text-muted-foreground/80">89% switch providers after a bad support experience</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Solution */}
            <div>
              <h3 className="text-2xl font-bold mb-8 text-muted-foreground">What if you spent less time on support while keeping your customers happy?</h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4 p-4 bg-white/20 backdrop-blur rounded-lg border border-white/30">
                  <div className="flex-shrink-0 w-8 h-8 text-white rounded-full flex items-center justify-center text-sm font-bold" style={{backgroundColor: '#3872B9'}}>✓</div>
                  <div>
                    <h4 className="font-semibold text-muted-foreground mb-1">High quality answers in seconds</h4>
                    <p className="text-sm text-muted-foreground/80">Get a ready-to-send answer, edit if needed, then ship it in seconds.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-white/20 backdrop-blur rounded-lg border border-white/30">
                  <div className="flex-shrink-0 w-8 h-8 text-white rounded-full flex items-center justify-center text-sm font-bold" style={{backgroundColor: '#3872B9'}}>✓</div>
                  <div>
                    <h4 className="font-semibold text-muted-foreground mb-1">Aidly gets smarter from your past cases</h4>
                    <p className="text-sm text-muted-foreground/80">Turn your best manual replies into training data, so next time Aidly delivers a spot on answer from the start</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-white/20 backdrop-blur rounded-lg border border-white/30">
                  <div className="flex-shrink-0 w-8 h-8 text-white rounded-full flex items-center justify-center text-sm font-bold" style={{backgroundColor: '#3872B9'}}>✓</div>
                  <div>
                    <h4 className="font-semibold text-muted-foreground mb-1">Free up your team</h4>
                    <p className="text-sm text-muted-foreground/80">Focus on complex issues that need human touch</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 p-4 bg-white/20 backdrop-blur rounded-lg border border-white/30">
                  <div className="flex-shrink-0 w-8 h-8 text-white rounded-full flex items-center justify-center text-sm font-bold" style={{backgroundColor: '#3872B9'}}>✓</div>
                  <div>
                    <h4 className="font-semibold text-muted-foreground mb-1">Boost customer satisfaction</h4>
                    <p className="text-sm text-muted-foreground/80">Turn frustrated customers into loyal advocates</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center mt-8">
            <Link href="#pricing" className="inline-flex items-center gap-3 p-6 text-white rounded-2xl hover:opacity-90 transition-opacity" style={{background: `linear-gradient(to right, #3872B9, #475B88)`}}>
              <span className="text-lg font-bold">If this feels familiar, Aidly was built for you.</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Customer Success Stories */}
      <section className="container mx-auto px-4 pt-16 md:pt-20 pb-8 md:pb-12">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">Results from Companies Like Yours</h2>
            <p className="text-lg text-muted-foreground">See how teams transformed their support operations</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Success Story 2 */}
            <Card className="hover:shadow-lg transition-shadow duration-300 bg-white/80 backdrop-blur">
              <CardContent className="p-6">
                <div className="mb-4">
                  <div className="text-2xl font-bold text-green-600">Support Takes 10% of the Time It Used To</div>
                </div>
                <h3 className="font-bold mb-2">Braceletsdemontre.com</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  &quot;What used to take hours every day takes a quick check in now. The quality stayed high, but the workload disappeared.&quot;
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">JPL</div>
                  <span>Jean-Pierre L, Founder</span>
                </div>
              </CardContent>
            </Card>

            {/* Placeholder for additional stories if needed */}
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 text-center">
            <p className="text-sm text-white mb-8">Trusted by support teams worldwide</p>
          </div>
        </div>
      </section>

      {/* Subscribe 
      <section id="subscribe" className="container mx-auto px-4 pt-16 md:pt-20 pb-8 md:pb-10">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl md:text-3xl font-semibold">Stay in Touch</h2>
          <p className="mt-2 text-muted-foreground">Subscribe to product updates and announcements.</p>
        </div>
        <div className="mt-6">
          <div className="mx-auto max-w-[540px]">
            <iframe
              width="540"
              height="405"
              src="https://b2c7da7c.sibforms.com/serve/MUIFAJwN9cDr5ia1jYzQwEtPLReDLUppGWlU9iYN1i49_2BnTjPkl4esxUlNQnFOjbnEdE6KuVU7UTHKTw9a_WArB7XnFlZm8lRQjGKDATFFQ6z3ljDf98uI4ny53yD5sJS7mcfWwSLid6GX33k6WpNu-uyIskN-JGVGg7Gjvkky6_FFWveSckFCWGRbRNSX_0fGbJrIQcH2JKE5"
              frameBorder={0}
              scrolling="auto"
              allowFullScreen
              style={{ display: 'block', marginLeft: 'auto', marginRight: 'auto', maxWidth: '100%' }}
            />
          </div>
        </div>
      </section>*/}

      {/* FAQ */}
      <section id="faq" className="container mx-auto px-4 pt-6 md:pt-8 pb-16 md:pb-20">
        <div className="mx-auto max-w-3xl text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
          <p className="text-lg text-muted-foreground">Everything you need to know to move forward with confidence.</p>
        </div>
        <div className="mx-auto max-w-4xl space-y-4">
          {[
            {
              q: "What if it doesn't work for our specific industry/use case?",
              a: "Aidly works across all industries - SaaS, e-commerce, healthcare, finance, and more. You provide industry-specific instructions and examples during setup. If you're not seeing results within 14 days, we'll refund your money. Zero risk, massive upside."
            },
            {
              q: "What does AI usage cost?",
              a: "Aidly uses your AI service via your API key. You only pay what your provider charges per request. Costs rise slightly with longer context, but are still a fraction of the cost of a support agent."
            },
            {
              q: "What if the AI gives wrong answers?",
              a: "You stay in complete control. AI drafts responses, but nothing sends without your approval. Think of it as the world's smartest assistant - it does the heavy lifting, you do the quality control. Plus, Aidly learns from your feedback over time. If a draft misses the mark, tweak it or write your own reply, Aidly will learn from what you chose. The next time this comes up, it will be handled automatically."
            },
            {
              q: "How does this compare to hiring more support staff?",
              a: "A new support agent costs $36,000+ annually plus benefits, training, and management overhead. Aidly costs $1,999/year and works 24/7 without sick days. One Aidly subscription replaces the workload of 2-3 additional hires while providing better consistency and faster responses."
            },
            {
              q: "Is our data secure?",
              a: "Your data is encrypted at rest with per-organization keys, protected by TLS in transit, and accessed only with least-privilege principles. We're EU-based, GDPR-compliant, and offer full DPAs. You own your data and can export or delete it anytime. We're more secure than most internal email systems."
            }
          ].map((f) => (
            <Card key={f.q} className="hover:shadow-md transition-shadow duration-300">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-3" style={{color: '#B05755'}}>{f.q}</h3>
                <p className="text-foreground leading-relaxed">{f.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Lightbox Modal */}
      {lightbox && (
        <>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={() => setLightbox(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Image lightbox"
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-[lbFade_180ms_ease-out_forwards]"></div>
            <div className="relative z-10 p-4 animate-[lbZoom_200ms_ease-out_forwards]" onClick={(e) => e.stopPropagation()}>
              <div className="relative w-[90vw] max-w-5xl h-[80vh] rounded-xl overflow-hidden shadow-2xl bg-black cursor-zoom-out" onClick={() => setLightbox(null)}>
                <Image src={lightbox.src} alt={lightbox.alt} fill sizes="90vw" className="object-contain" />
              </div>
              {/* Close button removed: click overlay/image or press ESC to close */}
            </div>
          </div>
          <style jsx>{`
            @keyframes lbFade { from { opacity: 0 } to { opacity: 1 } }
            @keyframes lbZoom { from { opacity: 0; transform: scale(0.98) } to { opacity: 1; transform: scale(1) } }
          `}</style>
        </>
      )}

      {/* Footer */}
      <footer id="contact" className="border-t border-border/60">
        <div className="container mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex items-center gap-2 justify-self-start">
            <Image src="/logo-60x.png" alt="Aidly" width={18} height={18} />
            <span className="text-sm">© {new Date().getFullYear()} Aidly</span>
          </div>
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground justify-self-center">
            <Link href="/getting-started">Getting Started</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/careers">Careers</Link>
          </div>
          <div className="hidden md:block justify-self-end text-sm text-muted-foreground">
            Made with <span aria-label="love" role="img">❤️</span> in <span aria-label="France" role="img">🇫🇷</span>
          </div>
        </div>
      </footer>
      </main>
    </ParallaxHero>
  )
}

export default Home
