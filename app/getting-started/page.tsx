"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default function GettingStartedPage() {
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null)

  // Close lightbox with ESC
  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  return (
    <main className="container mx-auto max-w-6xl px-4 py-16">
      <div className="text-center mb-16">
        <Badge variant="outline" className="mb-6 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
          📚 Getting Started Guide
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Launch Aidly in minutes</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Follow this simple guide to set up your AI-powered customer support workflow and start automating responses today.</p>
      </div>

      <section className="space-y-16">
        {/* 1) Create account */}
        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div>
                <h2 className="text-xl font-bold mb-3">Create your account</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Visit the homepage and click <span className="font-medium text-foreground">Sign in</span>. Enter your email to receive a magic link
                  (no passwords required). Open the link to finish signing in.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2) Workspace setup + image (profile-view) */}
        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div className="order-2 lg:order-1">
                <div className="flex items-start gap-4 mb-6">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h2 className="text-xl font-bold mb-3">Set up your workspace</h2>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed ml-12">
                  In the settings page, name your organization and enter the name of your support agent. You can update these anytime.
                </p>
              </div>
              <div
                className="order-1 lg:order-2 rounded-2xl border bg-gradient-to-br from-card to-card/50 p-1 overflow-hidden w-full max-w-[70%] mx-auto cursor-zoom-in group shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={() => setLightbox({ src: '/getting-started/profile-view.png', alt: 'Workspace and profile settings' })}
                role="button"
                aria-label="Enlarge image: Workspace and profile settings"
              >
                <div className="relative w-full transition-transform duration-300 ease-out group-hover:scale-[1.02]" style={{ aspectRatio: '3 / 2' }}>
                  <Image src="/getting-started/profile-view.png" alt="Workspace and profile settings" fill className="object-contain rounded-xl" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3) AI provider + image (ai-configuration) */}
        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div
                className="rounded-2xl border bg-gradient-to-br from-card to-card/50 p-1 overflow-hidden w-full max-w-[70%] mx-auto cursor-zoom-in group shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={() => setLightbox({ src: '/getting-started/ai-configuration.png', alt: 'AI configuration' })}
                role="button"
                aria-label="Enlarge image: AI configuration"
              >
                <div className="relative w-full transition-transform duration-300 ease-out group-hover:scale-[1.02]" style={{ aspectRatio: '3 / 2' }}>
                  <Image src="/getting-started/ai-configuration.png" alt="AI configuration" fill className="object-contain rounded-xl" />
                </div>
              </div>
              <div>
                <div className="flex items-start gap-4 mb-6">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h2 className="text-xl font-bold mb-3">Connect your AI provider</h2>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed mb-4 ml-12">
                  Add your API key for your preferred provider to draft and summarize replies. You remain in control—nothing is sent without approval.
                </p>
                <ul className="ml-12 space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Paste your API key in Settings → AI
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Pick a default model and temperature suitable for support tone
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    You can override model choices per‑category later
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4) Categories and SLAs */}
        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                4
              </div>
              <div>
                <h2 className="text-xl font-bold mb-3">Define categories and SLAs</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Create a few initial categories (e.g., Billing, Technical, Sales) and set response targets. Aidly uses these to triage and prioritize.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Configure per‑category instructions, examples, and tone of voice
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Set working hours and escalation thresholds to match your policy
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 5) Custom instructions */}
        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                5
              </div>
              <div>
                <h2 className="text-xl font-bold mb-3">Add custom instructions</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Provide brand guidelines, do/don&apos;t lists, product context, and links to docs so drafts follow your style and policies.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 6) Support email */}
        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                6
              </div>
              <div>
                <h2 className="text-xl font-bold mb-3">Connect your support email</h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Create or copy your Aidly support address, then set up a forward from your existing inbox (e.g., support@yourcompany.com).
                  New messages will appear in the triage view.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Keep your original address public; Aidly stays behind the scenes
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Optionally verify sending so approved replies go out from your domain
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 7) Generate automatic replies + image (dashboard-view) */}
        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div className="order-2 lg:order-1">
                <div className="flex items-start gap-4 mb-6">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                    7
                  </div>
                  <div>
                    <h2 className="text-xl font-bold mb-3">Generate the automatic replies</h2>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed ml-12">
                  Enable automatic drafting to have AI propose replies as conversations arrive. You approve every send, and can adjust automation levels per category.
                </p>
              </div>
              <div
                className="order-1 lg:order-2 rounded-2xl border bg-gradient-to-br from-card to-card/50 p-1 overflow-hidden w-full max-w-[70%] mx-auto cursor-zoom-in group shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={() => setLightbox({ src: '/getting-started/dashboard-view.png', alt: 'Dashboard overview' })}
                role="button"
                aria-label="Enlarge image: Dashboard overview"
              >
                <div className="relative w-full transition-transform duration-300 ease-out group-hover:scale-[1.02]" style={{ aspectRatio: '3 / 2' }}>
                  <Image src="/getting-started/dashboard-view.png" alt="Dashboard overview" fill className="object-contain rounded-xl" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 8) Triage emails + image (triage-view) */}
        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div
                className="rounded-2xl border bg-gradient-to-br from-card to-card/50 p-1 overflow-hidden w-full max-w-[70%] mx-auto cursor-zoom-in group shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={() => setLightbox({ src: '/getting-started/triage-view.png', alt: 'Triage view' })}
                role="button"
                aria-label="Enlarge image: Triage view"
              >
                <div className="relative w-full transition-transform duration-300 ease-out group-hover:scale-[1.02]" style={{ aspectRatio: '3 / 2' }}>
                  <Image src="/getting-started/triage-view.png" alt="Triage view" fill className="object-contain rounded-xl" />
                </div>
              </div>
              <div>
                <div className="flex items-start gap-4 mb-6">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                    8
                  </div>
                  <div>
                    <h2 className="text-xl font-bold mb-3">Triage the newly received emails</h2>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed ml-12">
                  Review incoming threads, confirm categories and priorities, and apply quick actions. Open any draft to edit before approving send.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 9) Review mode + image (inbox-view) */}
        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div className="order-2 lg:order-1">
                <div className="flex items-start gap-4 mb-6">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                    9
                  </div>
                  <div>
                    <h2 className="text-xl font-bold mb-3">Go deeper with the review mode</h2>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed ml-12">
                  Use review mode to inspect message history, suggestions, and rationale. Collaborate with teammates via notes before finalizing a response.
                </p>
              </div>
              <div
                className="order-1 lg:order-2 rounded-2xl border bg-gradient-to-br from-card to-card/50 p-1 overflow-hidden w-full max-w-[70%] mx-auto cursor-zoom-in group shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={() => setLightbox({ src: '/getting-started/inbox-view.png', alt: 'Inbox review mode' })}
                role="button"
                aria-label="Enlarge image: Inbox review mode"
              >
                <div className="relative w-full transition-transform duration-300 ease-out group-hover:scale-[1.02]" style={{ aspectRatio: '3 / 2' }}>
                  <Image src="/getting-started/inbox-view.png" alt="Inbox review mode" fill className="object-contain rounded-xl" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 10) Pick a plan */}
        <Card className="hover:shadow-md transition-shadow duration-300">
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold text-sm">
                10
              </div>
              <div>
                <h2 className="text-xl font-bold mb-3">Pick a plan</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Choose monthly or annual billing when you&apos;re ready. You can upgrade, downgrade, or cancel anytime. See <Link href="/pricing" className="text-primary hover:underline font-medium">Pricing</Link>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="hover:shadow-md transition-shadow duration-300 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-blue-200 dark:border-blue-800">
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center">
                💡
              </div>
              <div>
                <h2 className="text-xl font-bold mb-4 text-blue-900 dark:text-blue-100">Tips</h2>
                <ul className="space-y-3 text-blue-800 dark:text-blue-200">
                  <li className="flex items-start gap-3">
                    <svg className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Keep instructions concise and example‑rich; drafts improve with context
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Use SLAs to surface urgent conversations and reduce response variance
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Start with human‑in‑the‑loop; enable more automation as quality stabilizes
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Help */}
        <Card className="hover:shadow-md transition-shadow duration-300 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50 border-green-200 dark:border-green-800">
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center">
                🤝
              </div>
              <div>
                <h2 className="text-xl font-bold mb-3 text-green-900 dark:text-green-100">Need help?</h2>
                <p className="text-green-800 dark:text-green-200 leading-relaxed">
                  We&apos;re here to help with setup, migration, and best practices. Email{" "}
                  <a
                    href="mailto:support@aidly.me"
                    className="text-green-700 dark:text-green-300 hover:underline font-medium"
                  >
                    support@aidly.me
                  </a>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Lightbox overlay */}
      {lightbox && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm animate-[lbFade_120ms_ease-out_forwards] flex items-center justify-center"
            onClick={() => setLightbox(null)}
          >
            <div className="relative z-10 p-4 animate-[lbZoom_200ms_ease-out_forwards]" onClick={(e) => e.stopPropagation()}>
              <div className="relative w-[90vw] max-w-5xl h-[80vh] rounded-xl overflow-hidden shadow-2xl bg-black cursor-zoom-out" onClick={() => setLightbox(null)}>
                <Image src={lightbox.src} alt={lightbox.alt} fill sizes="90vw" className="object-contain" />
              </div>
            </div>
          </div>
          <style jsx>{`
            @keyframes lbFade { from { opacity: 0 } to { opacity: 1 } }
            @keyframes lbZoom { from { opacity: 0; transform: scale(0.98) } to { opacity: 1; transform: scale(1) } }
          `}</style>
        </>
      )}
    </main>
  )
}
