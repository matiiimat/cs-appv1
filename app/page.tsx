"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"

// Intersection Observer hook for scroll-triggered animations
function useInView(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true)
        observer.unobserve(element) // Only trigger once
      }
    }, { threshold: 0.1, ...options })

    observer.observe(element)
    return () => observer.disconnect()
  }, [options])

  return { ref, isInView }
}

// Parallax scroll hook
function useParallax() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return scrollY
}

// Smooth counter animation
function AnimatedNumber({ target, duration = 2000, suffix = "" }: { target: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const { ref, isInView } = useInView()

  useEffect(() => {
    if (!isInView) return

    let startTime: number
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      setCount(Math.floor(easeOutQuart * target))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [isInView, target, duration])

  return <span ref={ref}>{count}{suffix}</span>
}

// Feature card component with stagger animation
function FeatureCard({
  icon,
  title,
  description,
  index
}: {
  icon: React.ReactNode
  title: string
  description: string
  index: number
}) {
  const { ref, isInView } = useInView()

  return (
    <div
      ref={ref}
      className={`group relative overflow-hidden rounded-2xl border p-8 backdrop-blur-sm transition-all duration-700 ease-out
        border-slate-200 bg-white shadow-sm hover:border-slate-300 hover:shadow-lg
        dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-white/[0.15] dark:hover:bg-white/[0.06] dark:shadow-none
        ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      {/* Subtle glow on hover */}
      <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-[#3872B9]/0 via-[#B33275]/0 to-[#F38135]/0 opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-20 dark:group-hover:opacity-30" />

      {/* Icon */}
      <div className="relative mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#3872B9]/10 to-[#B33275]/10 text-[#3872B9] dark:from-[#3872B9]/20 dark:to-[#B33275]/20">
        {icon}
      </div>

      {/* Content */}
      <h3 className="relative mb-3 font-[var(--font-custom)] text-xl font-medium tracking-tight text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="relative text-[15px] leading-relaxed text-slate-600 dark:text-white/60">
        {description}
      </p>
    </div>
  )
}

// Testimonial card with glass effect
function TestimonialCard({
  quote,
  author,
  role,
  company,
  index
}: {
  quote: string
  author: string
  role: string
  company: string
  index: number
}) {
  const { ref, isInView } = useInView()

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden rounded-3xl border p-8 transition-all duration-700
        border-slate-200 bg-white shadow-sm hover:shadow-lg
        dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:bg-white/[0.05] dark:shadow-none
        ${isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
      style={{ transitionDelay: `${index * 150}ms` }}
    >
      {/* Quote mark decoration */}
      <div className="absolute -left-2 -top-4 font-serif text-8xl text-slate-100 dark:text-white/[0.04]">&ldquo;</div>

      <p className="relative mb-8 font-serif text-lg italic leading-relaxed text-slate-700 dark:text-white/80">
        &ldquo;{quote}&rdquo;
      </p>

      <div className="relative flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#3872B9] to-[#B33275] font-medium text-white">
          {author.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <div className="font-medium text-slate-900 dark:text-white">{author}</div>
          <div className="text-sm text-slate-500 dark:text-white/50">{role}, {company}</div>
        </div>
      </div>
    </div>
  )
}

export default function LuxuryLanding() {
  const scrollY = useParallax()
  const heroRef = useRef<HTMLDivElement>(null)
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 })
  const [isDark, setIsDark] = useState(false)
  const [annual, setAnnual] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // ROI calculator state
  const [tickets, setTickets] = useState(500)
  const [minutes, setMinutes] = useState(6)
  const [costPerHour, setCostPerHour] = useState(28)

  // ROI calculations
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

  // Checkout function
  async function startCheckout() {
    setError("")
    try {
      setLoading(true)
      const resp = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // Detect system color scheme
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setIsDark(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  // Mouse parallax for hero
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!heroRef.current) return
    const rect = heroRef.current.getBoundingClientRect()
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    })
  }, [])

  const features = [
    {
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      ),
      title: "Lightning-Fast AI Responses",
      description: "Get intelligent draft replies in seconds, not hours. Respond to customers while they're still engaged."
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
        </svg>
      ),
      title: "Gets Smarter Over Time",
      description: "Save your best replies and teach Aidly what works. The more you train it, the less you have to review."
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      title: "Complete Visibility",
      description: "Nothing sends without your approval. Full control with the efficiency of automation."
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "2-Minute Setup",
      description: "No complex integrations. Set up email routing from your support address, add your AI API key, start responding beautifully."
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
      title: "Real-Time Analytics",
      description: "Track response times, satisfaction scores, and cost savings with beautiful dashboards."
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      ),
      title: "Enterprise Security",
      description: "End-to-end encryption with EU-based infrastructure. Your data stays yours."
    },
  ]

  const testimonials = [
    {
      quote: "What used to take hours every day takes a quick check in now. The quality stayed high, but the workload disappeared. Support takes 10% of the time it used to.",
      author: "Jean-Pierre L.",
      role: "Founder",
      company: "Braceletsdemontre.com"
    },
  ]

  return (
    <div className={`min-h-screen antialiased ${isDark ? 'dark' : ''}`}>
      <div className="min-h-screen bg-[#FAFBFC] text-slate-900 dark:bg-[#0A0A0B] dark:text-white">
        {/* Noise texture overlay */}
        <div
          className="pointer-events-none fixed inset-0 z-50 opacity-[0.02] dark:opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Ambient gradient orbs */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div
            className="absolute h-[800px] w-[800px] rounded-full opacity-30 blur-[150px] dark:opacity-20 dark:blur-[120px]"
            style={{
              background: 'radial-gradient(circle, #3872B9 0%, transparent 70%)',
              left: '5%',
              top: '15%',
              transform: `translate3d(${(mousePos.x - 0.5) * 30}px, ${scrollY * 0.1 + (mousePos.y - 0.5) * 30}px, 0)`,
              transition: 'transform 0.3s ease-out',
            }}
          />
          <div
            className="absolute h-[600px] w-[600px] rounded-full opacity-20 blur-[120px] dark:opacity-15 dark:blur-[100px]"
            style={{
              background: 'radial-gradient(circle, #B33275 0%, transparent 70%)',
              right: '0%',
              top: '50%',
              transform: `translate3d(${(mousePos.x - 0.5) * -20}px, ${scrollY * 0.15 + (mousePos.y - 0.5) * -20}px, 0)`,
              transition: 'transform 0.3s ease-out',
            }}
          />
          <div
            className="absolute h-[500px] w-[500px] rounded-full opacity-15 blur-[100px] dark:opacity-10 dark:blur-[80px]"
            style={{
              background: 'radial-gradient(circle, #F38135 0%, transparent 70%)',
              left: '50%',
              top: '5%',
              transform: `translate3d(${(mousePos.x - 0.5) * 15}px, ${scrollY * 0.08}px, 0)`,
            }}
          />
        </div>

        {/* Navigation */}
        <nav className="fixed left-0 right-0 top-0 z-40 border-b backdrop-blur-xl border-slate-200/80 bg-white/80 dark:border-white/[0.06] dark:bg-[#0A0A0B]/80">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
              <Image src="/logo-60x.png" alt="Aidly" width={28} height={28} className="rounded-lg" />
              <span className="text-lg font-semibold tracking-tight">Aidly</span>
            </Link>

            <div className="hidden items-center gap-8 md:flex">
              <Link href="#features" className="text-sm text-slate-600 transition-colors hover:text-slate-900 dark:text-white/60 dark:hover:text-white">Features</Link>
              <Link href="#testimonials" className="text-sm text-slate-600 transition-colors hover:text-slate-900 dark:text-white/60 dark:hover:text-white">Testimonials</Link>
              <Link href="#pricing" className="text-sm text-slate-600 transition-colors hover:text-slate-900 dark:text-white/60 dark:hover:text-white">Pricing</Link>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" className="text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white" asChild>
                <Link href="/app/login">Sign in</Link>
              </Button>
              <Button className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-[#0A0A0B] dark:hover:bg-white/90" asChild>
                <Link href="#pricing">Get Started</Link>
              </Button>
            </div>
          </div>
        </nav>

        {/* Limited Time Offer Banner */}
        <div className="fixed left-0 right-0 top-[65px] z-30 bg-gradient-to-r from-[#3872B9] to-[#B33275] py-2.5 text-center text-white">
          <p className="text-sm font-medium">
            <span className="font-bold">Limited Time:</span> Get your first month FREE with code{" "}
            <span className="rounded bg-white/20 px-2 py-0.5 font-bold">BF26FREEMONTH</span>
          </p>
        </div>

        {/* Hero Section */}
        <section
          ref={heroRef}
          onMouseMove={handleMouseMove}
          className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-32"
        >
          {/* Floating branded ring elements - inspired by logo */}
          {/* Large ring - top left */}
          <div
            className="absolute left-[8%] top-[20%] h-32 w-32 opacity-60 dark:opacity-40 animate-[float1_10s_ease-in-out_infinite]"
          >
            <svg viewBox="0 0 100 100" className="h-full w-full animate-[spin_30s_linear_infinite]">
              <defs>
                <linearGradient id="ring-gradient-1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3872B9" />
                  <stop offset="50%" stopColor="#B33275" />
                  <stop offset="100%" stopColor="#F38135" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="45" fill="none" stroke="url(#ring-gradient-1)" strokeWidth="3" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="url(#ring-gradient-1)" strokeWidth="2" opacity="0.6" />
            </svg>
          </div>

          {/* Medium ring - top right */}
          <div
            className="absolute right-[12%] top-[15%] h-24 w-24 opacity-50 dark:opacity-30 animate-[float2_12s_ease-in-out_infinite]"
          >
            <svg viewBox="0 0 100 100" className="h-full w-full animate-[spin_25s_linear_infinite_reverse]">
              <defs>
                <linearGradient id="ring-gradient-2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#F38135" />
                  <stop offset="50%" stopColor="#B33275" />
                  <stop offset="100%" stopColor="#3872B9" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="45" fill="none" stroke="url(#ring-gradient-2)" strokeWidth="2.5" />
              <circle cx="50" cy="50" r="36" fill="none" stroke="url(#ring-gradient-2)" strokeWidth="1.5" opacity="0.5" />
            </svg>
          </div>

          {/* Small ring - bottom left */}
          <div
            className="absolute bottom-[25%] left-[5%] h-16 w-16 opacity-40 dark:opacity-25 animate-[float3_9s_ease-in-out_infinite]"
          >
            <svg viewBox="0 0 100 100" className="h-full w-full animate-[spin_20s_linear_infinite]">
              <defs>
                <linearGradient id="ring-gradient-3" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3872B9" />
                  <stop offset="100%" stopColor="#B33275" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="42" fill="none" stroke="url(#ring-gradient-3)" strokeWidth="3" />
              <circle cx="50" cy="50" r="32" fill="none" stroke="url(#ring-gradient-3)" strokeWidth="2" opacity="0.5" />
            </svg>
          </div>

          {/* Extra small ring - right side middle */}
          <div
            className="absolute right-[8%] top-[55%] h-12 w-12 opacity-30 dark:opacity-20 animate-[float4_11s_ease-in-out_infinite]"
          >
            <svg viewBox="0 0 100 100" className="h-full w-full animate-[spin_17s_linear_infinite_reverse]">
              <defs>
                <linearGradient id="ring-gradient-4" x1="50%" y1="0%" x2="50%" y2="100%">
                  <stop offset="0%" stopColor="#B33275" />
                  <stop offset="100%" stopColor="#F38135" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="40" fill="none" stroke="url(#ring-gradient-4)" strokeWidth="4" />
              <circle cx="50" cy="50" r="28" fill="none" stroke="url(#ring-gradient-4)" strokeWidth="2" opacity="0.4" />
            </svg>
          </div>

          {/* Large decorative ring - bottom right (partially visible) */}
          <div
            className="absolute -bottom-[10%] -right-[5%] h-48 w-48 opacity-20 dark:opacity-10 animate-[float5_15s_ease-in-out_infinite]"
          >
            <svg viewBox="0 0 100 100" className="h-full w-full animate-[spin_40s_linear_infinite]">
              <defs>
                <linearGradient id="ring-gradient-5" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3872B9" />
                  <stop offset="50%" stopColor="#B33275" />
                  <stop offset="100%" stopColor="#F38135" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="46" fill="none" stroke="url(#ring-gradient-5)" strokeWidth="2" />
              <circle cx="50" cy="50" r="38" fill="none" stroke="url(#ring-gradient-5)" strokeWidth="1.5" opacity="0.6" />
              <circle cx="50" cy="50" r="30" fill="none" stroke="url(#ring-gradient-5)" strokeWidth="1" opacity="0.3" />
            </svg>
          </div>

          <div className="relative z-10 mx-auto max-w-5xl text-center">
            {/* Announcement badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm shadow-sm border-slate-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03] dark:shadow-none backdrop-blur-sm animate-[fadeInUp_0.8s_ease-out_0.2s_both]">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-slate-600 dark:text-white/60">Now with GPT-4o & Claude support</span>
            </div>

            {/* Main headline */}
            <h1 className="font-[var(--font-custom)] text-5xl font-medium leading-[1.1] tracking-tight md:text-7xl lg:text-8xl animate-[fadeInUp_0.8s_ease-out_0.3s_both]">
              <span className="block text-slate-900 dark:text-white">Your entire support team.</span>
              <span className="relative">
                <span className="bg-gradient-to-r from-[#3872B9] via-[#B33275] to-[#F38135] bg-clip-text text-transparent">
                  Deployed in minutes.
                </span>
                {/* Decorative underline */}
                <svg
                  className="absolute -bottom-2 left-0 w-full opacity-40 dark:opacity-30"
                  viewBox="0 0 400 12"
                  fill="none"
                >
                  <path
                    d="M2 10C100 4 300 4 398 10"
                    stroke="url(#underline-gradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="underline-gradient" x1="0" y1="0" x2="400" y2="0">
                      <stop offset="0%" stopColor="#3872B9" />
                      <stop offset="50%" stopColor="#B33275" />
                      <stop offset="100%" stopColor="#F38135" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </h1>

            {/* Subheadline */}
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-white/50 md:text-xl animate-[fadeInUp_0.8s_ease-out_0.5s_both]">
              Aidly transforms customer support with intelligent AI that drafts perfect responses instantly.
              Reduce costs by 90% while delivering faster, more consistent service.
            </p>

            {/* CTA buttons */}
            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row animate-[fadeInUp_0.8s_ease-out_0.7s_both]">
              <Button
                size="lg"
                className="group relative h-14 overflow-hidden px-8 text-base font-medium transition-all bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg dark:bg-white dark:text-[#0A0A0B] dark:hover:bg-white dark:hover:shadow-[0_0_40px_rgba(255,255,255,0.15)]"
                asChild
              >
                <Link href="#pricing">
                  <span className="relative z-10">Try Aidly Today</span>
                  <span className="absolute inset-0 -z-0 bg-gradient-to-r from-[#3872B9]/20 via-[#B33275]/20 to-[#F38135]/20 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-base font-medium border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-700 dark:border-white/[0.12] dark:bg-transparent dark:text-white dark:hover:border-white/25 dark:hover:bg-white/[0.03] dark:hover:text-white"
                asChild
              >
                <Link href="#features">
                  See how it works
                  <svg className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="mt-16 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-sm text-slate-500 dark:text-white/40 animate-[fadeInUp_0.8s_ease-out_0.9s_both]">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Cancel anytime
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Setup in 2 minutes
              </div>
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Full control over responses
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-[fadeInUp_0.8s_ease-out_1.1s_both]">
            <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-white/30">
              <span className="text-xs uppercase tracking-widest">Scroll</span>
              <div className="h-12 w-[1px] bg-gradient-to-b from-slate-400 dark:from-white/30 to-transparent" />
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="relative mt-8 border-y py-20 border-slate-200 bg-white dark:border-white/[0.06] dark:bg-transparent">
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="font-[var(--font-custom)] text-4xl font-medium text-slate-900 dark:text-white md:text-5xl">
                  <AnimatedNumber target={90} suffix="%" />
                </div>
                <div className="mt-2 text-sm text-slate-500 dark:text-white/50">Time Saved</div>
              </div>
              <div className="text-center">
                <div className="font-[var(--font-custom)] text-4xl font-medium text-slate-900 dark:text-white md:text-5xl">
                  &lt;5s
                </div>
                <div className="mt-2 text-sm text-slate-500 dark:text-white/50">Draft Ready</div>
              </div>
              <div className="text-center col-span-2 md:col-span-1">
                <div className="font-[var(--font-custom)] text-4xl font-medium text-slate-900 dark:text-white md:text-5xl">
                  <AnimatedNumber target={2} suffix=" min" />
                </div>
                <div className="mt-2 text-sm text-slate-500 dark:text-white/50">Setup Time</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="relative py-32">
          <div className="mx-auto max-w-7xl px-6">
            {/* Section header */}
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-[var(--font-custom)] text-4xl font-medium tracking-tight text-slate-900 dark:text-white md:text-5xl">
                Everything you need to
                <span className="block bg-gradient-to-r from-[#3872B9] to-[#B33275] bg-clip-text text-transparent">
                  transform support
                </span>
              </h2>
              <p className="mt-6 text-lg text-slate-600 dark:text-white/50">
                A complete platform designed to make your support team unstoppable.
              </p>
            </div>

            {/* Feature grid */}
            <div className="mt-20 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, i) => (
                <FeatureCard key={feature.title} {...feature} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* Product Preview Section */}
        <section className="relative overflow-hidden py-32">
          {/* Background treatment */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#3872B9]/5 to-transparent" />

          <div className="relative mx-auto max-w-7xl px-6">
            <div className="grid items-center gap-16 lg:grid-cols-2">
              {/* Text content */}
              <div>

                <h2 className="mt-6 font-[var(--font-custom)] text-4xl font-medium leading-tight tracking-tight text-slate-900 dark:text-white md:text-5xl">
                  A workspace designed for
                  <span className="text-slate-500 dark:text-white/50"> speed and clarity</span>
                </h2>

                <p className="mt-6 text-lg leading-relaxed text-slate-600 dark:text-white/50">
                  Our thoughtfully crafted interface puts everything you need at your fingertips.
                  Review AI drafts, approve with confidence, and watch your queue shrink in real-time.
                </p>

                <ul className="mt-8 space-y-4">
                  {[
                    "Swipe-based review for rapid processing",
                    "Inline editing with AI regeneration",
                    "Smart categorization and priority scoring",
                    "One-click approval and sending",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-700 dark:text-white/70">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#3872B9]/20 to-[#B33275]/20">
                        <svg className="h-3.5 w-3.5 text-[#3872B9]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Product mockup */}
              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-[#3872B9]/10 via-[#B33275]/10 to-[#F38135]/10 blur-3xl dark:from-[#3872B9]/20 dark:via-[#B33275]/20 dark:to-[#F38135]/20" />
                <div className="relative overflow-hidden rounded-2xl border p-2 shadow-2xl border-slate-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03] dark:shadow-none">
                  <div className="aspect-[4/3] rounded-xl p-6 bg-slate-50 dark:bg-[#111113]">
                    {/* Mock interface */}
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full bg-[#EF4444]" />
                        <div className="h-3 w-3 rounded-full bg-[#F59E0B]" />
                        <div className="h-3 w-3 rounded-full bg-[#22C55E]" />
                      </div>
                      <div className="h-2 w-24 rounded-full bg-slate-200 dark:bg-white/10" />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-1 space-y-3">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className={`rounded-lg p-3 ${i === 2 ? 'border border-[#3872B9]/50 bg-[#3872B9]/10' : 'bg-white border border-slate-200 dark:bg-white/[0.03] dark:border-transparent'}`}>
                            <div className="mb-2 h-2 w-16 rounded bg-slate-300 dark:bg-white/20" />
                            <div className="h-2 w-full rounded bg-slate-200 dark:bg-white/10" />
                          </div>
                        ))}
                      </div>
                      <div className="col-span-2 rounded-xl border p-4 border-slate-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.02]">
                        <div className="mb-3 h-3 w-32 rounded bg-slate-300 dark:bg-white/20" />
                        <div className="space-y-2">
                          <div className="h-2 w-full rounded bg-slate-200 dark:bg-white/10" />
                          <div className="h-2 w-5/6 rounded bg-slate-200 dark:bg-white/10" />
                          <div className="h-2 w-4/6 rounded bg-slate-200 dark:bg-white/10" />
                        </div>
                        <div className="mt-4 rounded-lg bg-gradient-to-r from-[#3872B9]/10 to-[#B33275]/10 p-3 dark:from-[#3872B9]/20 dark:to-[#B33275]/20">
                          <div className="mb-2 h-2 w-20 rounded bg-[#3872B9]/40 dark:bg-[#3872B9]/50" />
                          <div className="space-y-1.5">
                            <div className="h-2 w-full rounded bg-slate-300 dark:bg-white/20" />
                            <div className="h-2 w-5/6 rounded bg-slate-300 dark:bg-white/20" />
                            <div className="h-2 w-3/4 rounded bg-slate-300 dark:bg-white/20" />
                          </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                          <div className="h-8 w-24 rounded-lg bg-[#22C55E]/20" />
                          <div className="h-8 w-20 rounded-lg bg-slate-200 dark:bg-white/10" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ROI Calculator Section */}
        <section id="calculator" className="relative py-24">
          <div className="mx-auto max-w-4xl px-6">
            <div className="text-center mb-12">
              <h2 className="font-[var(--font-custom)] text-4xl font-medium tracking-tight text-slate-900 dark:text-white md:text-5xl">
                Stop Overspending
                <span className="block text-slate-500 dark:text-white/50">on Support</span>
              </h2>
              <p className="mt-6 text-lg text-slate-600 dark:text-white/50">
                Every minute spent on repetitive support emails drains your budget. See how much you could save.
              </p>
            </div>

            <div className="rounded-3xl border p-8 md:p-10 border-slate-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03]">
              <h3 className="text-xl font-semibold mb-8 text-center text-slate-900 dark:text-white">
                Support Cost & Savings Estimator
              </h3>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <label className="space-y-2">
                  <span className="text-sm text-slate-500 dark:text-white/50">Tickets per month</span>
                  <input
                    type="number"
                    value={tickets}
                    min={0}
                    onChange={(e) => setTickets(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-xl border bg-transparent px-4 py-3 text-slate-900 border-slate-200 focus:border-[#3872B9] focus:outline-none focus:ring-1 focus:ring-[#3872B9] dark:border-white/[0.12] dark:text-white dark:focus:border-[#3872B9]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-slate-500 dark:text-white/50">Avg minutes per ticket</span>
                  <input
                    type="number"
                    value={minutes}
                    min={0}
                    onChange={(e) => setMinutes(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-xl border bg-transparent px-4 py-3 text-slate-900 border-slate-200 focus:border-[#3872B9] focus:outline-none focus:ring-1 focus:ring-[#3872B9] dark:border-white/[0.12] dark:text-white dark:focus:border-[#3872B9]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm text-slate-500 dark:text-white/50">Support cost per hour ($)</span>
                  <input
                    type="number"
                    value={costPerHour}
                    min={0}
                    onChange={(e) => setCostPerHour(Math.max(0, Number(e.target.value)))}
                    className="w-full rounded-xl border bg-transparent px-4 py-3 text-slate-900 border-slate-200 focus:border-[#3872B9] focus:outline-none focus:ring-1 focus:ring-[#3872B9] dark:border-white/[0.12] dark:text-white dark:focus:border-[#3872B9]"
                  />
                </label>
              </div>

              {/* Results */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="rounded-2xl border p-6 text-center border-slate-200 dark:border-white/[0.08]">
                  <div className="text-sm text-slate-500 dark:text-white/50 mb-2">Current monthly cost</div>
                  <div className="text-3xl font-bold text-slate-900 dark:text-white">{formatUSD(currentCost)}</div>
                </div>

                <div className="rounded-2xl border p-6 text-center border-slate-200 bg-gradient-to-br from-emerald-50 to-transparent dark:border-white/[0.08] dark:from-emerald-500/5">
                  <div className="text-sm text-slate-500 dark:text-white/50 mb-2">Monthly net savings (after $167 plan)</div>
                  <div className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                    {formatUSD(Math.max(0, netSavings))}
                  </div>
                  {netSavings <= 0 && (
                    <div className="text-xs text-slate-500 dark:text-white/40 mt-2">
                      Maybe you don&apos;t need Aidly yet 😉
                    </div>
                  )}
                </div>
              </div>

              {/* Assumptions */}
              <div className="text-center text-sm text-slate-500 dark:text-white/40 space-y-2">
                <p>Assumptions, based on typical Aidly customers:</p>
                <ul className="inline-block text-left space-y-1">
                  <li>• Automation of repetitive tickets: <span className="font-medium">60–85%</span></li>
                  <li>• Time reduction on remaining tickets: <span className="font-medium">40%</span></li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="relative py-32">
          <div className="mx-auto max-w-4xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-[var(--font-custom)] text-4xl font-medium tracking-tight text-slate-900 dark:text-white md:text-5xl">
                Results from companies
                <span className="block text-slate-500 dark:text-white/50">like yours</span>
              </h2>
              <p className="mt-6 text-lg text-slate-600 dark:text-white/50">
                See how teams are transforming their customer support with Aidly.
              </p>
            </div>

            <div className="mt-16 flex justify-center">
              {testimonials.map((testimonial, i) => (
                <div key={testimonial.author} className="max-w-xl">
                  <TestimonialCard {...testimonial} index={i} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="relative py-32">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#B33275]/5 to-transparent" />

          <div className="relative mx-auto max-w-4xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-[var(--font-custom)] text-4xl font-medium tracking-tight text-slate-900 dark:text-white md:text-5xl">
                Simple, transparent
                <span className="block bg-gradient-to-r from-[#F38135] to-[#B33275] bg-clip-text text-transparent">pricing</span>
              </h2>
              <p className="mt-6 text-lg text-slate-600 dark:text-white/50">
                Bring your favorite AI provider. Get a full multilingual support team — deployed in minutes.
              </p>
            </div>

            {/* Billing toggle */}
            <div className="mt-10 flex items-center justify-center gap-3">
              <button
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                  !annual
                    ? "border-[#3872B9] bg-[#3872B9] text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 dark:border-white/[0.12] dark:bg-transparent dark:text-white/60 dark:hover:border-white/25"
                }`}
                onClick={() => setAnnual(false)}
              >
                Monthly
              </button>
              <button
                className={`rounded-lg border px-4 py-2 text-sm font-medium transition-all ${
                  annual
                    ? "border-[#3872B9] bg-[#3872B9] text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:border-slate-400 dark:border-white/[0.12] dark:bg-transparent dark:text-white/60 dark:hover:border-white/25"
                }`}
                onClick={() => setAnnual(true)}
              >
                Yearly
              </button>
            </div>

            {/* Pricing card */}
            <div className="mt-10">
              <div className="relative overflow-hidden rounded-3xl border p-1 shadow-xl border-slate-200 bg-white dark:border-white/[0.1] dark:bg-white/[0.03] dark:shadow-none">
                {/* Decorative gradient border */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-[#3872B9]/20 via-[#B33275]/20 to-[#F38135]/20 opacity-50 dark:from-[#3872B9]/50 dark:via-[#B33275]/50 dark:to-[#F38135]/50 dark:opacity-20" />

                <div className="relative rounded-[22px] p-10 bg-white dark:bg-[#0A0A0B]">
                  <div className="flex flex-col items-center text-center">
                    {/* Badge */}
                    {annual && (
                      <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#F38135]/20 to-[#B33275]/20 px-4 py-1.5 text-sm font-medium text-[#B33275] dark:text-[#F38135]">
                        Best Value
                      </div>
                    )}

                    {/* Price */}
                    <div className="mt-8">
                      <div className="flex items-baseline justify-center gap-2">
                        <span className="font-[var(--font-custom)] text-6xl font-medium text-slate-900 dark:text-white md:text-7xl">
                          ${annual ? "167" : "199"}
                        </span>
                        <span className="text-lg text-slate-500 dark:text-white/50">/month</span>
                      </div>
                      {annual ? (
                        <p className="mt-2 text-sm text-slate-500 dark:text-white/40">Billed annually at $1,999 • Save $389</p>
                      ) : (
                        <p className="mt-2 text-sm text-slate-500 dark:text-white/40">Billed monthly • Switch to yearly anytime</p>
                      )}
                    </div>

                    {/* Features */}
                    <div className="mt-10 grid gap-4 sm:grid-cols-2">
                      {[
                        "Lightning-fast AI replies",
                        "Self-learning from your replies",
                        "Full approval control",
                        "Multilingual support",
                        "Custom training data",
                        "Priority email support",
                        "EU-based infrastructure",
                        "Data encrypted at rest",
                      ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-3 text-left text-slate-700 dark:text-white/70">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-[#3872B9]/20 to-[#B33275]/20 dark:from-[#3872B9]/30 dark:to-[#B33275]/30">
                            <svg className="h-3 w-3 text-[#3872B9] dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          {feature}
                        </div>
                      ))}
                    </div>

                    {/* BYOK Note */}
                    <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
                      <p className="text-sm text-slate-600 dark:text-white/50">
                        <span className="font-medium text-slate-700 dark:text-white/70">Bring your own API key</span> — Connect your OpenAI, Anthropic, or other AI provider. You pay them directly for token usage.
                      </p>
                    </div>

                    {/* CTA */}
                    <Button
                      size="lg"
                      className="mt-10 h-14 w-full max-w-sm px-8 text-base font-semibold transition-all bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg dark:bg-white dark:text-[#0A0A0B] dark:hover:bg-white dark:hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]"
                      onClick={startCheckout}
                      disabled={loading}
                    >
                      {loading ? 'Setting up secure payment...' : 'Try Aidly Today'}
                    </Button>
                    {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

                    <p className="mt-4 text-sm text-slate-500 dark:text-white/40">
                      Secure Stripe checkout • Cancel anytime
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="relative overflow-hidden py-32">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-t from-[#FAFBFC] via-transparent to-[#FAFBFC] dark:from-[#0A0A0B] dark:to-[#0A0A0B]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#3872B9_0%,_transparent_70%)] opacity-5 dark:opacity-10" />
          </div>

          <div className="relative mx-auto max-w-4xl px-6 text-center">
            <h2 className="font-[var(--font-custom)] text-4xl font-medium tracking-tight text-slate-900 dark:text-white md:text-5xl lg:text-6xl">
              Ready to transform your
              <span className="block bg-gradient-to-r from-[#3872B9] via-[#B33275] to-[#F38135] bg-clip-text text-transparent">
                customer support?
              </span>
            </h2>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-white/50">
              Start saving hours on support today. Cancel anytime.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                className="h-14 px-10 text-base font-semibold transition-all bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg dark:bg-white dark:text-[#0A0A0B] dark:hover:bg-white dark:hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]"
                onClick={startCheckout}
                disabled={loading}
              >
                {loading ? 'Setting up secure payment...' : 'Try Aidly Today'}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-10 text-base font-medium border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-700 dark:border-white/[0.12] dark:bg-transparent dark:text-white dark:hover:border-white/25 dark:hover:bg-white/[0.03] dark:hover:text-white"
                asChild
              >
                <Link href="mailto:hello@aidly.io">Contact Sales</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="relative py-32">
          <div className="mx-auto max-w-4xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-[var(--font-custom)] text-4xl font-medium tracking-tight text-slate-900 dark:text-white md:text-5xl">
                Frequently Asked
                <span className="block bg-gradient-to-r from-[#3872B9] to-[#B33275] bg-clip-text text-transparent">Questions</span>
              </h2>
              <p className="mt-6 text-lg text-slate-600 dark:text-white/50">
                Everything you need to know to move forward with confidence.
              </p>
            </div>

            <div className="mt-16 space-y-6">
              {[
                {
                  q: "What if it doesn't work for our specific industry/use case?",
                  a: "Aidly works across all industries - SaaS, e-commerce, healthcare, finance, and more. You provide industry-specific instructions and examples during setup. If you're not seeing results within 14 days, we'll refund your money. Zero risk, massive upside."
                },
                {
                  q: "What does AI usage cost?",
                  a: "Aidly requires you to bring your own API key from your preferred AI provider (OpenAI, Anthropic, etc.). You pay the provider directly for token usage, which varies based on response length and model choice. This gives you full control over costs and provider choice, and is still a fraction of the cost of a support agent."
                },
                {
                  q: "What if the AI gives wrong answers?",
                  a: "You stay in complete control. AI drafts responses, but nothing sends without your approval. Think of it as the world's smartest assistant - it does the heavy lifting, you do the quality control. Plus, Aidly learns from your feedback over time. If a draft misses the mark, tweak it or write your own reply, Aidly will learn from what you chose."
                },
                {
                  q: "How does this compare to hiring more support staff?",
                  a: "A new support agent costs $36,000+ annually plus benefits, training, and management overhead. Aidly costs $1,999/year and works 24/7 without sick days. One Aidly subscription replaces the workload of 2-3 additional hires while providing better consistency and faster responses."
                },
                {
                  q: "Is our data secure?",
                  a: "Your data is encrypted at rest with per-organization keys, protected by TLS in transit, and accessed only with least-privilege principles. We're EU-based and working towards full GDPR compliance. You own your data and can export or delete it anytime."
                }
              ].map((faq, i) => (
                <div
                  key={i}
                  className="rounded-2xl border p-6 transition-all border-slate-200 bg-white hover:shadow-md dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
                >
                  <h3 className="text-lg font-medium text-[#B33275] dark:text-[#F38135]">{faq.q}</h3>
                  <p className="mt-3 text-slate-600 leading-relaxed dark:text-white/60">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t py-16 border-slate-200 bg-white dark:border-white/[0.06] dark:bg-transparent">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
              <div className="flex items-center gap-3">
                <Image src="/logo-60x.png" alt="Aidly" width={24} height={24} className="rounded-lg" />
                <span className="text-sm text-slate-500 dark:text-white/40">© {new Date().getFullYear()} Aidly. All rights reserved.</span>
              </div>

              <div className="flex items-center gap-8 text-sm text-slate-500 dark:text-white/40">
                <Link href="/privacy" className="transition-colors hover:text-slate-900 dark:hover:text-white">Privacy</Link>
                <Link href="/terms" className="transition-colors hover:text-slate-900 dark:hover:text-white">Terms</Link>
                <Link href="/careers" className="transition-colors hover:text-slate-900 dark:hover:text-white">Careers</Link>
                <Link href="/dpa" className="transition-colors hover:text-slate-900 dark:hover:text-white">DPA</Link>
              </div>

              <div className="text-sm text-slate-500 dark:text-white/40">
                Made with ❤️ in 🇫🇷
              </div>
            </div>
          </div>
        </footer>

        {/* Global animations */}
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&display=swap');

          .font-serif {
            font-family: 'Playfair Display', Georgia, serif;
          }

          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          html {
            scroll-behavior: smooth;
          }

          /* Ambient floating animations for branded rings */
          @keyframes float1 {
            0%, 100% { transform: translate(0, 0); }
            25% { transform: translate(8px, -12px); }
            50% { transform: translate(-5px, -18px); }
            75% { transform: translate(12px, -8px); }
          }

          @keyframes float2 {
            0%, 100% { transform: translate(0, 0); }
            25% { transform: translate(-10px, 8px); }
            50% { transform: translate(6px, 15px); }
            75% { transform: translate(-8px, -5px); }
          }

          @keyframes float3 {
            0%, 100% { transform: translate(0, 0); }
            33% { transform: translate(15px, 10px); }
            66% { transform: translate(-8px, -12px); }
          }

          @keyframes float4 {
            0%, 100% { transform: translate(0, 0); }
            20% { transform: translate(-6px, 10px); }
            40% { transform: translate(10px, 5px); }
            60% { transform: translate(4px, -12px); }
            80% { transform: translate(-10px, -6px); }
          }

          @keyframes float5 {
            0%, 100% { transform: translate(0, 0); }
            50% { transform: translate(10px, -8px); }
          }

          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}
