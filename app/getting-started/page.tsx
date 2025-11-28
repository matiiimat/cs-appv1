"use client"

import Image from "next/image"
import { useEffect, useState } from "react"

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
    <main className="container mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-bold">Getting Started</h1>
      <p className="mt-3 text-muted-foreground">A quick guide to launch Aidly in minutes.</p>

      <section className="mt-8 space-y-10 text-sm leading-6">
        {/* 1) Create account */}
        <div>
          <h2 className="text-lg font-semibold">1) Create your account</h2>
          <p className="mt-2">
            Visit the homepage and click <span className="font-medium">Sign in</span>. Enter your email to receive a magic link
            (no passwords required). Open the link to finish signing in.
          </p>
        </div>

        {/* 2) Workspace setup + image (profile-view) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
          <div className="order-2 md:order-1">
            <h2 className="text-lg font-semibold">2) Set up your workspace</h2>
            <p className="mt-2">
              In the settings page, name your organization and enter the name of your support agent. You can update these anytime.
            </p>
          </div>
          <div
            className="order-1 md:order-2 rounded-xl border bg-card p-[1px] overflow-hidden w-full max-w-[60%] mx-auto cursor-zoom-in"
            onClick={() => setLightbox({ src: '/getting-started/profile-view.png', alt: 'Workspace and profile settings' })}
            role="button"
            aria-label="Enlarge image: Workspace and profile settings"
          >
            <div className="relative w-full transition-transform duration-200 ease-out hover:scale-[1.01]" style={{ aspectRatio: '3 / 2' }}>
              <Image src="/getting-started/profile-view.png" alt="Workspace and profile settings" fill className="object-contain" />
            </div>
          </div>
        </div>

        {/* 3) AI provider + image (ai-configuration) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
          <div
            className="rounded-xl border bg-card p-[1px] overflow-hidden w-full max-w-[60%] mx-auto cursor-zoom-in"
            onClick={() => setLightbox({ src: '/getting-started/ai-configuration.png', alt: 'AI configuration' })}
            role="button"
            aria-label="Enlarge image: AI configuration"
          >
            <div className="relative w-full transition-transform duration-200 ease-out hover:scale-[1.01]" style={{ aspectRatio: '3 / 2' }}>
              <Image src="/getting-started/ai-configuration.png" alt="AI configuration" fill className="object-contain" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold">3) Connect your AI provider</h2>
            <p className="mt-2">
              Add your API key for your preferred provider to draft and summarize replies. You remain in control—nothing is sent without approval.
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Paste your API key in Settings → AI.</li>
              <li>Pick a default model and temperature suitable for support tone.</li>
              <li>You can override model choices per‑category later.</li>
            </ul>
          </div>
        </div>

        {/* 4) Categories and SLAs */}
        <div>
          <h2 className="text-lg font-semibold">4) Define categories and SLAs</h2>
          <p className="mt-2">
            Create a few initial categories (e.g., Billing, Technical, Sales) and set response targets. Aidly uses these to triage and prioritize.
          </p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Configure per‑category instructions, examples, and tone of voice.</li>
            <li>Set working hours and escalation thresholds to match your policy.</li>
          </ul>
        </div>

        {/* 5) Custom instructions */}
        <div>
          <h2 className="text-lg font-semibold">5) Add custom instructions</h2>
          <p className="mt-2">
            Provide brand guidelines, do/don’t lists, product context, and links to docs so drafts follow your style and policies.
          </p>
        </div>

        {/* 6) Support email */}
        <div>
          <h2 className="text-lg font-semibold">6) Connect your support email</h2>
          <p className="mt-2">
            Create or copy your Aidly support address, then set up a forward from your existing inbox (e.g., support@yourcompany.com).
            New messages will appear in the triage view.
          </p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Keep your original address public; Aidly stays behind the scenes.</li>
            <li>Optionally verify sending so approved replies go out from your domain.</li>
          </ul>
        </div>

        {/* 7) Generate automatic replies + image (dashboard-view) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
          <div className="order-2 md:order-1">
            <h2 className="text-lg font-semibold">7) Generate the automatic replies</h2>
            <p className="mt-2">
              Enable automatic drafting to have AI propose replies as conversations arrive. You approve every send, and can adjust automation levels per category.
            </p>
          </div>
          <div
            className="order-1 md:order-2 rounded-xl border bg-card p-[1px] overflow-hidden w-full max-w-[60%] mx-auto cursor-zoom-in"
            onClick={() => setLightbox({ src: '/getting-started/dashboard-view.png', alt: 'Dashboard overview' })}
            role="button"
            aria-label="Enlarge image: Dashboard overview"
          >
            <div className="relative w-full transition-transform duration-200 ease-out hover:scale-[1.01]" style={{ aspectRatio: '3 / 2' }}>
              <Image src="/getting-started/dashboard-view.png" alt="Dashboard overview" fill className="object-contain" />
            </div>
          </div>
        </div>

        {/* 8) Triage emails + image (triage-view) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
          <div
            className="rounded-xl border bg-card p-[1px] overflow-hidden w-full max-w-[60%] mx-auto cursor-zoom-in"
            onClick={() => setLightbox({ src: '/getting-started/triage-view.png', alt: 'Triage view' })}
            role="button"
            aria-label="Enlarge image: Triage view"
          >
            <div className="relative w-full transition-transform duration-200 ease-out hover:scale-[1.01]" style={{ aspectRatio: '3 / 2' }}>
              <Image src="/getting-started/triage-view.png" alt="Triage view" fill className="object-contain" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold">8) Triage the newly received emails</h2>
            <p className="mt-2">
              Review incoming threads, confirm categories and priorities, and apply quick actions. Open any draft to edit before approving send.
            </p>
          </div>
        </div>

        {/* 9) Review mode + image (inbox-view) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
          <div className="order-2 md:order-1">
            <h2 className="text-lg font-semibold">9) Go deeper with the review mode</h2>
            <p className="mt-2">
              Use review mode to inspect message history, suggestions, and rationale. Collaborate with teammates via notes before finalizing a response.
            </p>
          </div>
          <div
            className="order-1 md:order-2 rounded-xl border bg-card p-[1px] overflow-hidden w-full max-w-[60%] mx-auto cursor-zoom-in"
            onClick={() => setLightbox({ src: '/getting-started/inbox-view.png', alt: 'Inbox review mode' })}
            role="button"
            aria-label="Enlarge image: Inbox review mode"
          >
            <div className="relative w-full transition-transform duration-200 ease-out hover:scale-[1.01]" style={{ aspectRatio: '3 / 2' }}>
              <Image src="/getting-started/inbox-view.png" alt="Inbox review mode" fill className="object-contain" />
            </div>
          </div>
        </div>

        {/* 10) Pick a plan */}
        <div>
          <h2 className="text-lg font-semibold">10) Pick a plan</h2>
          <p className="mt-2">
            Choose monthly or annual billing when you’re ready. You can upgrade, downgrade, or cancel anytime. See <a className="underline" href="/pricing">Pricing</a>.
          </p>
        </div>

        {/* Tips */}
        <div>
          <h2 className="text-lg font-semibold">Tips</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Keep instructions concise and example‑rich; drafts improve with context.</li>
            <li>Use SLAs to surface urgent conversations and reduce response variance.</li>
            <li>Start with human‑in‑the‑loop; enable more automation as quality stabilizes.</li>
          </ul>
        </div>

        {/* Help */}
        <div>
          <h2 className="text-lg font-semibold">Need help?</h2>
          <p className="mt-2">
            We’re here to help with setup, migration, and best practices. Email <a className="underline" href="mailto:support@aidly.me">support@aidly.me</a>.
          </p>
        </div>
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
