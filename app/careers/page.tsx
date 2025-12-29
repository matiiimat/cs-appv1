"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"

export default function CareersPage() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setIsDark(mediaQuery.matches)
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return (
    <div className={`min-h-screen antialiased ${isDark ? 'dark' : ''}`}>
      <div className="min-h-screen bg-[#FAFBFC] text-slate-900 dark:bg-[#0A0A0B] dark:text-white">
        {/* Navigation */}
        <nav className="border-b border-slate-200 bg-white dark:border-white/[0.06] dark:bg-[#0A0A0B]">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
              <Image src="/logo-60x.png" alt="Aidly" width={28} height={28} className="rounded-lg" />
              <span className="text-lg font-semibold tracking-tight">Aidly</span>
            </Link>
          </div>
        </nav>

        <main className="mx-auto max-w-3xl px-6 py-12">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Careers at Aidly</h1>
          <p className="mt-3 text-slate-500 dark:text-white/50">We&apos;re building the future of customer support. Join us.</p>

          <section className="mt-8 space-y-8">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Backend Developer (TypeScript/Node, React experience)</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-white/50">Remote • Full-time</p>
              <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-white/70">
                <p className="font-medium text-slate-900 dark:text-white">What you&apos;ll do</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Design and build APIs and data models powering AI-assisted workflows</li>
                  <li>Integrate email providers, Stripe billing, and multi-tenant features</li>
                  <li>Collaborate on product decisions and ship iteratively</li>
                </ul>
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-white/70">
                <p className="font-medium text-slate-900 dark:text-white">What you&apos;ll bring</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Strong TypeScript/Node, SQL, and API design</li>
                  <li>Experience with React/Next.js (full‑stack mindset)</li>
                  <li>Product sense, pragmatism, and ownership</li>
                </ul>
              </div>
              <div className="mt-4">
                <a href="mailto:mathieu@aidly.me?subject=Backend%20Developer%20Application" className="text-[#3872B9] underline hover:text-[#B33275]">Apply via email</a>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.03]">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Business Developer</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-white/50">Remote • Full-time</p>
              <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-white/70">
                <p className="font-medium text-slate-900 dark:text-white">What you&apos;ll do</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Identify and qualify prospects in startups/SMBs</li>
                  <li>Own outbound, demos, and partnership opportunities</li>
                  <li>Close pilot deals and gather product feedback</li>
                </ul>
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-white/70">
                <p className="font-medium text-slate-900 dark:text-white">What you&apos;ll bring</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>1–3+ years in B2B SaaS sales or BizDev</li>
                  <li>Clear communication and structured thinking</li>
                  <li>Comfort with early‑stage ambiguity and speed</li>
                </ul>
              </div>
              <div className="mt-4">
                <a href="mailto:mathieu@aidly.me?subject=Business%20Developer%20Application" className="text-[#3872B9] underline hover:text-[#B33275]">Apply via email</a>
              </div>
            </div>

            <div className="text-sm text-slate-500 dark:text-white/50">
              Don&apos;t see a fit? Send us a note at <a href="mailto:mathieu@aidly.me" className="text-[#3872B9] underline hover:text-[#B33275]">mathieu@aidly.me</a>.
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-8 dark:border-white/[0.06] dark:bg-transparent">
          <div className="mx-auto max-w-3xl px-6">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="flex items-center gap-2">
                <Image src="/logo-60x.png" alt="Aidly" width={20} height={20} className="rounded-lg" />
                <span className="text-sm text-slate-500 dark:text-white/40">© {new Date().getFullYear()} Aidly</span>
              </div>
              <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-white/40">
                <Link href="/privacy" className="transition-colors hover:text-slate-900 dark:hover:text-white">Privacy</Link>
                <Link href="/terms" className="transition-colors hover:text-slate-900 dark:hover:text-white">Terms</Link>
                <Link href="/careers" className="transition-colors hover:text-slate-900 dark:hover:text-white">Careers</Link>
                <Link href="/dpa" className="transition-colors hover:text-slate-900 dark:hover:text-white">DPA</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
