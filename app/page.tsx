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

  // Checkout function
  async function startCheckout(plan: 'plus' | 'pro' = 'plus') {
    setError("")
    try {
      setLoading(true)
      const resp = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annual, plan })
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

  // Structured Data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "name": "Aidly",
        "applicationCategory": "BusinessApplication",
        "applicationSubCategory": "Customer Support Software",
        "operatingSystem": "Web",
        "offers": {
          "@type": "AggregateOffer",
          "priceCurrency": "USD",
          "lowPrice": "0",
          "highPrice": "249",
          "offerCount": "3",
          "offers": [
            {
              "@type": "Offer",
              "name": "Free Trial",
              "price": "0",
              "priceCurrency": "USD"
            },
            {
              "@type": "Offer",
              "name": "Plus Plan",
              "price": annual ? "208" : "249",
              "priceCurrency": "USD",
              "billingIncrement": annual ? "year" : "month"
            },
            {
              "@type": "Offer",
              "name": "Pro Plan",
              "price": annual ? "166" : "199",
              "priceCurrency": "USD",
              "billingIncrement": annual ? "year" : "month"
            }
          ]
        },
        "description": "AI-powered customer support software for email ticketing. Get intelligent draft responses in seconds.",
        "url": "https://aidly.me",
        "image": "https://aidly.me/logo-60x.png",
        "softwareVersion": "1.0",
        "author": {
          "@type": "Organization",
          "name": "Aidly"
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": "5.0",
          "ratingCount": "1",
          "bestRating": "5"
        }
      },
      {
        "@type": "Organization",
        "name": "Aidly",
        "url": "https://aidly.me",
        "logo": "https://aidly.me/logo-60x.png",
        "description": "AI-powered customer support automation platform",
        "foundingDate": "2024",
        "address": {
          "@type": "PostalAddress",
          "addressCountry": "FR"
        },
        "sameAs": [
          "https://twitter.com/aidly_ai"
        ]
      },
      {
        "@type": "WebSite",
        "name": "Aidly",
        "url": "https://aidly.me",
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": "https://aidly.me/search?q={search_term_string}"
          },
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "What if it doesn't work for our specific industry/use case?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Aidly works across all industries - SaaS, e-commerce, healthcare, finance, and more. You provide industry-specific instructions and examples during setup. If you're not seeing results within 14 days, we'll refund your money."
            }
          },
          {
            "@type": "Question",
            "name": "What does AI usage cost?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Plus plan: AI is included — no API key needed, no extra costs. Pro plan: Bring your own API key and pay your provider directly for token usage."
            }
          },
          {
            "@type": "Question",
            "name": "Is our data secure?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Absolutely. Your data is encrypted at rest, protected by TLS in transit, and customer PII is anonymized. We're fully GDPR compliant with EU-based infrastructure."
            }
          }
        ]
      }
    ]
  }

  return (
    <div className={`min-h-screen antialiased ${isDark ? 'dark' : ''}`}>
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

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

            <div className="flex items-center gap-3">
              <Link
                href="/blog"
                className="text-sm text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white transition-colors"
              >
                Blog
              </Link>
              <Button variant="ghost" className="text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-white/70 dark:hover:bg-white/5 dark:hover:text-white" asChild>
                <Link href="/app/login">Sign in</Link>
              </Button>
              <Button className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-[#0A0A0B] dark:hover:bg-white/90" asChild>
                <Link href="#pricing">Start Free</Link>
              </Button>
            </div>
          </div>
        </nav>

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

            {/* Main headline - SEO optimized with semantic hidden text */}
            <h1 className="font-[var(--font-custom)] text-5xl font-medium leading-[1.1] tracking-tight md:text-7xl lg:text-8xl animate-[fadeInUp_0.8s_ease-out_0.3s_both]">
              {/* Hidden SEO text for search engines */}
              <span className="sr-only">Aidly - AI-Powered Customer Support Software for Email Ticketing and Helpdesk</span>
              {/* Visible marketing text */}
              <span className="block text-slate-900 dark:text-white" aria-hidden="true">An entire support team.</span>
              <span className="relative" aria-hidden="true">
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
              AI-powered email support that drafts perfect responses instantly—you have the final word. Save hours on repetitive emails while maintaining your brand voice. Native Shopify integration included.
            </p>

            {/* CTA button */}
            <div className="mt-12 animate-[fadeInUp_0.8s_ease-out_0.7s_both]">
              <Button
                size="lg"
                className="group relative h-14 overflow-hidden px-8 text-base font-medium transition-all bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg dark:bg-white dark:text-[#0A0A0B] dark:hover:bg-white dark:hover:shadow-[0_0_40px_rgba(255,255,255,0.15)]"
                asChild
              >
                <Link href="#pricing">
                  <span className="relative z-10">Start Free</span>
                  <span className="absolute inset-0 -z-0 bg-gradient-to-r from-[#3872B9]/20 via-[#B33275]/20 to-[#F38135]/20 opacity-0 transition-opacity group-hover:opacity-100" />
                </Link>
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="mt-16 flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-sm text-slate-500 dark:text-white/40 animate-[fadeInUp_0.8s_ease-out_0.9s_both]">
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
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-[#3872B9]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                GDPR Compliant
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-[fadeInUp_0.8s_ease-out_1.1s_both]">
            <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-white/30">
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
                  See it in
                  <span className="text-slate-500 dark:text-white/50"> action</span>
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

              {/* Product demo GIF */}
              <div className="relative">
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-[#3872B9]/10 via-[#B33275]/10 to-[#F38135]/10 blur-3xl dark:from-[#3872B9]/20 dark:via-[#B33275]/20 dark:to-[#F38135]/20" />
                <div className="relative overflow-hidden rounded-2xl border p-2 shadow-2xl border-slate-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03] dark:shadow-none">
                  <Image
                    src="/landing-page-overview.gif"
                    alt="Aidly product demo"
                    width={800}
                    height={600}
                    className="rounded-xl"
                    unoptimized
                  />
                </div>
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

          <div className="relative mx-auto max-w-5xl px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-[var(--font-custom)] text-4xl font-medium tracking-tight text-slate-900 dark:text-white md:text-5xl">
                Start free, upgrade
                <span className="block bg-gradient-to-r from-[#F38135] to-[#B33275] bg-clip-text text-transparent">when you&apos;re ready</span>
              </h2>
              <p className="mt-6 text-lg text-slate-600 dark:text-white/50">
                Try Aidly with 5 free emails. No credit card required. Bring your own AI API key — you only pay for what you use.
              </p>
            </div>

            {/* Billing toggle (for Pro plan) */}
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

            {/* Pricing cards - Four tiers */}
            <div className="mt-10 grid gap-6 lg:grid-cols-4">
              {/* Free Trial */}
              <div className="relative overflow-hidden rounded-3xl border p-1 border-slate-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03]">
                <div className="relative h-full rounded-[22px] p-6 bg-white dark:bg-[#0A0A0B]">
                  <div className="flex h-full flex-col">
                    {/* Header */}
                    <div className="mb-5">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Free</h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-white/50">Try it out</p>
                    </div>

                    {/* Price */}
                    <div className="mb-5">
                      <div className="flex items-baseline gap-2">
                        <span className="font-[var(--font-custom)] text-4xl font-medium text-slate-900 dark:text-white">$0</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500 dark:text-white/40">5 emails • No credit card</p>
                    </div>

                    {/* Features */}
                    <div className="mb-6 space-y-2.5">
                      {[
                        "AI-powered replies included",
                        "5 emails (one-time)",
                        "Full approval control",
                        "Self-learning AI",
                      ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-white/70">
                          <svg className="h-4 w-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {feature}
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <div className="mt-auto">
                      <Button
                        size="lg"
                        variant="outline"
                        className="w-full h-11 text-sm font-medium border-slate-300 hover:border-slate-400 dark:border-white/[0.12] dark:hover:border-white/25"
                        asChild
                      >
                        <Link href="/app/login">Start Free</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pro Tier - BYOK */}
              <div className="relative overflow-hidden rounded-3xl border p-1 border-slate-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03]">
                <div className="relative h-full rounded-[22px] p-6 bg-white dark:bg-[#0A0A0B]">
                  <div className="flex h-full flex-col">
                    {/* Header */}
                    <div className="mb-5">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Pro</h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-white/50">Bring your own key</p>
                    </div>

                    {/* Price */}
                    <div className="mb-5">
                      <div className="flex items-baseline gap-2">
                        <span className="font-[var(--font-custom)] text-4xl font-medium text-slate-900 dark:text-white">
                          ${annual ? "166" : "199"}
                        </span>
                        <span className="text-slate-500 dark:text-white/50">/mo</span>
                      </div>
                      {annual ? (
                        <p className="mt-2 text-sm text-slate-500 dark:text-white/40">Billed annually ($1,999/yr)</p>
                      ) : (
                        <p className="mt-2 text-sm text-slate-500 dark:text-white/40">+ your AI API costs</p>
                      )}
                    </div>

                    {/* Features */}
                    <div className="mb-6 space-y-2.5">
                      {[
                        "Use your own API key",
                        "1,000 emails per month",
                        "OpenAI, Anthropic, or local",
                        "Self-learning from your replies",
                        "Full approval control",
                        "Multilingual support",
                      ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-white/70">
                          <svg className="h-4 w-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {feature}
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <div className="mt-auto">
                      <Button
                        size="lg"
                        variant="outline"
                        className="w-full h-11 text-sm font-medium border-slate-300 hover:border-slate-400 dark:border-white/[0.12] dark:hover:border-white/25"
                        onClick={() => startCheckout('pro')}
                        disabled={loading}
                      >
                        {loading ? 'Setting up...' : 'Get Pro'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Plus Tier - Most Popular */}
              <div className="relative overflow-hidden rounded-3xl border p-1 shadow-xl border-slate-200 bg-white dark:border-white/[0.1] dark:bg-white/[0.03] dark:shadow-none">
                {/* Decorative gradient border */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-[#3872B9]/20 via-[#B33275]/20 to-[#F38135]/20 opacity-50 dark:from-[#3872B9]/50 dark:via-[#B33275]/50 dark:to-[#F38135]/50 dark:opacity-20" />

                <div className="relative rounded-[22px] p-6 bg-white dark:bg-[#0A0A0B]">
                  <div className="flex flex-col">
                    {/* Header */}
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Plus</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-white/50">All-inclusive AI</p>
                      </div>
                      <div className="inline-flex items-center rounded-full bg-gradient-to-r from-[#3872B9]/20 to-[#B33275]/20 px-2.5 py-1 text-xs font-medium text-[#3872B9] dark:text-[#B33275]">
                        Most Popular
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-5">
                      <div className="flex items-baseline gap-2">
                        <span className="font-[var(--font-custom)] text-4xl font-medium text-slate-900 dark:text-white">
                          ${annual ? "208" : "249"}
                        </span>
                        <span className="text-slate-500 dark:text-white/50">/mo</span>
                      </div>
                      {annual ? (
                        <p className="mt-2 text-sm text-slate-500 dark:text-white/40">Billed annually ($2,499/yr)</p>
                      ) : (
                        <p className="mt-2 text-sm text-slate-500 dark:text-white/40">Billed monthly</p>
                      )}
                    </div>

                    {/* Features */}
                    <div className="mb-6 space-y-2.5">
                      {[
                        "AI included — no API key needed",
                        "5,000 emails per month",
                        "Powered by Claude AI",
                        "Self-learning from your replies",
                        "Full approval control",
                        "Multilingual support",
                      ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-white/70">
                          <svg className="h-4 w-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {feature}
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <Button
                      size="lg"
                      className="w-full h-11 text-sm font-semibold transition-all bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg dark:bg-white dark:text-[#0A0A0B] dark:hover:bg-white dark:hover:shadow-[0_0_40px_rgba(255,255,255,0.15)]"
                      onClick={() => startCheckout('plus')}
                      disabled={loading}
                    >
                      {loading ? 'Setting up...' : 'Get Plus'}
                    </Button>
                    {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
                  </div>
                </div>
              </div>

              {/* Enterprise Tier */}
              <div className="relative overflow-hidden rounded-3xl border p-1 border-slate-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03]">
                <div className="relative h-full rounded-[22px] p-6 bg-white dark:bg-[#0A0A0B]">
                  <div className="flex h-full flex-col">
                    {/* Header */}
                    <div className="mb-5">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Enterprise</h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-white/50">For teams at scale</p>
                    </div>

                    {/* Price */}
                    <div className="mb-5">
                      <div className="flex items-baseline gap-2">
                        <span className="font-[var(--font-custom)] text-4xl font-medium text-slate-900 dark:text-white">Custom</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-500 dark:text-white/40">Tailored to your needs</p>
                    </div>

                    {/* Features */}
                    <div className="mb-6 space-y-2.5">
                      {[
                        "Unlimited emails",
                        "SSO / SAML authentication",
                        "Dedicated account manager",
                        "Custom SLA (99.9% uptime)",
                        "Audit logs & compliance",
                        "Priority support",
                      ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-white/70">
                          <svg className="h-4 w-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          {feature}
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <div className="mt-auto">
                      <Button
                        size="lg"
                        variant="outline"
                        className="w-full h-11 text-sm font-medium border-slate-300 hover:border-slate-400 dark:border-white/[0.12] dark:hover:border-white/25"
                        asChild
                      >
                        <a href="mailto:mathieu@aidlyhq.com?subject=Aidly%20Enterprise%20Inquiry">Contact Us</a>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Plan comparison note */}
            <div className="mt-8 mx-auto max-w-2xl rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 dark:border-white/[0.08] dark:bg-white/[0.02]">
              <p className="text-sm text-slate-600 dark:text-white/50 text-center">
                <span className="font-medium text-slate-700 dark:text-white/70">Plus</span> includes AI — no API key needed. <span className="font-medium text-slate-700 dark:text-white/70">Pro</span> lets you bring your own key for full control over AI costs and models.
              </p>
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
              Start with 5 free emails. No credit card required.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                className="h-14 px-10 text-base font-semibold transition-all bg-slate-900 text-white hover:bg-slate-800 hover:shadow-lg dark:bg-white dark:text-[#0A0A0B] dark:hover:bg-white dark:hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]"
                asChild
              >
                <Link href="/app/login">Start Free</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-10 text-base font-medium border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-700 dark:border-white/[0.12] dark:bg-transparent dark:text-white dark:hover:border-white/25 dark:hover:bg-white/[0.03] dark:hover:text-white"
                asChild
              >
                <Link href="#pricing">View Pricing</Link>
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
                  a: "Plus plan: AI is included — no API key needed, no extra costs. We handle everything. Pro plan: Bring your own API key (OpenAI, Anthropic, etc.) and pay your provider directly for token usage. This gives you full control over costs and provider choice. Either way, it's a fraction of the cost of a support agent."
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
                  a: "Absolutely. Your data is encrypted at rest with per-organization keys, protected by TLS in transit, and customer PII is anonymized before being sent to AI providers. We're fully GDPR compliant: you can export all your data or permanently delete your account anytime from Settings. EU-based infrastructure, your data stays yours."
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
            <div className="grid gap-12 md:grid-cols-4 mb-12">
              {/* Brand */}
              <div className="md:col-span-1">
                <div className="flex items-center gap-2 mb-4">
                  <Image src="/logo-60x.png" alt="Aidly" width={24} height={24} className="rounded-lg" />
                  <span className="font-semibold text-slate-900 dark:text-white">Aidly</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-white/50">
                  AI-powered customer support.
                </p>
              </div>

              {/* Product */}
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white mb-3">Product</h3>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-white/60">
                  <li><Link href="/#features" className="transition-colors hover:text-slate-900 dark:hover:text-white">Features</Link></li>
                  <li><Link href="/#pricing" className="transition-colors hover:text-slate-900 dark:hover:text-white">Pricing</Link></li>
                  <li><Link href="/#testimonials" className="transition-colors hover:text-slate-900 dark:hover:text-white">Testimonials</Link></li>
                  <li><Link href="/#faq" className="transition-colors hover:text-slate-900 dark:hover:text-white">FAQ</Link></li>
                </ul>
              </div>

              {/* Resources */}
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white mb-3">Resources</h3>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-white/60">
                  <li><Link href="/blog" className="transition-colors hover:text-slate-900 dark:hover:text-white">Blog</Link></li>
                  <li><Link href="/compare/zendesk-alternative" className="transition-colors hover:text-slate-900 dark:hover:text-white">Compare</Link></li>
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white mb-3">Legal</h3>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-white/60">
                  <li><Link href="/legal-notice" className="transition-colors hover:text-slate-900 dark:hover:text-white">Legal Notice</Link></li>
                  <li><Link href="/privacy" className="transition-colors hover:text-slate-900 dark:hover:text-white">Privacy</Link></li>
                  <li><Link href="/terms" className="transition-colors hover:text-slate-900 dark:hover:text-white">Terms</Link></li>
                  <li><Link href="/dpa" className="transition-colors hover:text-slate-900 dark:hover:text-white">DPA</Link></li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col items-center justify-between gap-4 border-t pt-8 border-slate-200 dark:border-white/[0.06] md:flex-row">
              <span className="text-sm text-slate-500 dark:text-white/40">© {new Date().getFullYear()} Aidly. All rights reserved.</span>
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
