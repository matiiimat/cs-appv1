import Link from 'next/link'

export default function CareersPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Careers at Aidly</h1>
      <p className="mt-3 text-muted-foreground">We&apos;re building the future of customer support. Join us.</p>

      <section className="mt-8 space-y-8">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Backend Developer (TypeScript/Node, React experience)</h2>
          <p className="mt-2 text-sm text-muted-foreground">Remote • Full-time</p>
          <div className="mt-4 space-y-2 text-sm">
            <p className="font-medium">What you&apos;ll do</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Design and build APIs and data models powering AI-assisted workflows</li>
              <li>Integrate email providers, Stripe billing, and multi-tenant features</li>
              <li>Collaborate on product decisions and ship iteratively</li>
            </ul>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <p className="font-medium">What you&apos;ll bring</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Strong TypeScript/Node, SQL, and API design</li>
              <li>Experience with React/Next.js (full‑stack mindset)</li>
              <li>Product sense, pragmatism, and ownership</li>
            </ul>
          </div>
          <div className="mt-4">
            <a href="mailto:jobs@aidly.me?subject=Backend%20Developer%20Application" className="text-blue-600 underline">Apply via email</a>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Business Developer</h2>
          <p className="mt-2 text-sm text-muted-foreground">Remote • Full-time</p>
          <div className="mt-4 space-y-2 text-sm">
            <p className="font-medium">What you&apos;ll do</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Identify and qualify prospects in startups/SMBs</li>
              <li>Own outbound, demos, and partnership opportunities</li>
              <li>Close pilot deals and gather product feedback</li>
            </ul>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <p className="font-medium">What you&apos;ll bring</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>1–3+ years in B2B SaaS sales or BizDev</li>
              <li>Clear communication and structured thinking</li>
              <li>Comfort with early‑stage ambiguity and speed</li>
            </ul>
          </div>
          <div className="mt-4">
            <a href="mailto:jobs@aidly.me?subject=Business%20Developer%20Application" className="text-blue-600 underline">Apply via email</a>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          Don&apos;t see a fit? Send us a note at <a href="mailto:jobs@aidly.me" className="underline">jobs@aidly.me</a>.
        </div>
      </section>
    </main>
  )
}

