import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface ComparisonPageProps {
  params: Promise<{ slug: string }>
}

const comparisons = {
  'zendesk-alternative': {
    title: 'Aidly vs Zendesk: The Modern Alternative for B2C Email Support',
    competitor: 'Zendesk',
    description: 'Compare Aidly and Zendesk for B2C customer support. See how Aidly delivers better AI automation, simpler setup, and 70% lower costs.',
    keywords: ['zendesk alternative', 'aidly vs zendesk', 'zendesk competitor', 'cheaper than zendesk'],
    heroSubtitle: 'Get 90% of Zendesk\'s power at 30% of the cost',

    aidlyPros: [
      'AI included - no API key needed',
      'Setup in 2 minutes vs days',
      '$208/mo all-inclusive vs $150+/agent',
      'Self-learning from your replies',
      'No per-agent pricing',
      'Modern, intuitive interface'
    ],

    competitorCons: [
      'Expensive per-agent pricing',
      'Complex setup requiring IT',
      'AI features cost extra',
      'Steep learning curve',
      'Overkill for small-medium teams',
      'Legacy interface'
    ],

    comparisonTable: [
      { feature: 'Starting Price', aidly: '$208/mo (unlimited agents)', competitor: '$55/agent/mo (quickly scales)' },
      { feature: 'AI Responses', aidly: 'Included with Claude AI', competitor: 'Add-on, expensive' },
      { feature: 'Setup Time', aidly: '2 minutes', competitor: '2-5 days' },
      { feature: 'Email Volume', aidly: '5,000/mo included', competitor: 'Unlimited' },
      { feature: 'Learning Curve', aidly: 'Simple, intuitive', competitor: 'Steep, requires training' },
      { feature: 'Best For', aidly: 'Growing B2C teams', competitor: 'Large enterprises' },
    ]
  },

  'help-scout-alternative': {
    title: 'Aidly vs Help Scout: AI-Powered Support That Scales',
    competitor: 'Help Scout',
    description: 'See how Aidly combines Help Scout\'s simplicity with powerful AI automation. Better features, smarter AI, similar pricing.',
    keywords: ['help scout alternative', 'aidly vs help scout', 'help scout competitor'],
    heroSubtitle: 'Help Scout\'s simplicity + AI superpowers',

    aidlyPros: [
      'Built-in AI (not just knowledge base)',
      'Self-learning system',
      'All-inclusive pricing',
      'Handles drafts automatically',
      'No per-user limits on Plus plan',
      'Modern AI-first design'
    ],

    competitorCons: [
      'Limited AI capabilities',
      'Manual response writing',
      'Per-user pricing adds up',
      'Basic automation only',
      'No self-learning',
      'Designed pre-AI era'
    ],

    comparisonTable: [
      { feature: 'AI Draft Responses', aidly: 'Yes, with learning', competitor: 'No' },
      { feature: 'Starting Price', aidly: '$208/mo unlimited', competitor: '$20-50/user/mo' },
      { feature: 'Automation', aidly: 'AI-powered', competitor: 'Rule-based' },
      { feature: 'Setup', aidly: '2 minutes', competitor: '10-30 minutes' },
      { feature: 'Learning System', aidly: 'Self-improving', competitor: 'Static' },
      { feature: 'Best For', aidly: 'AI-first teams', competitor: 'Simple email support' },
    ]
  },

  'intercom-alternative': {
    title: 'Aidly vs Intercom: Email-First Support Done Right',
    competitor: 'Intercom',
    description: 'Why email-first support beats chat-first for B2C. Compare Aidly\'s focused email approach to Intercom\'s chat-heavy platform.',
    keywords: ['intercom alternative', 'email vs intercom', 'intercom competitor', 'cheaper than intercom'],
    heroSubtitle: 'Built for email. Not retrofitted from chat.',

    aidlyPros: [
      'Email-first design',
      'AI optimized for written support',
      'Transparent pricing ($208/mo)',
      'Focus on support, not marketing',
      'GDPR compliant by default',
      'No bloat, just support'
    ],

    competitorCons: [
      'Chat-first, email secondary',
      'Expensive ($400+/mo typical)',
      'Complex pricing tiers',
      'Marketing features you don\'t need',
      'Overkill for support teams',
      'Heavy, slow interface'
    ],

    comparisonTable: [
      { feature: 'Primary Focus', aidly: 'Email support', competitor: 'Chat & marketing' },
      { feature: 'Typical Cost', aidly: '$208/mo', competitor: '$400-800/mo' },
      { feature: 'Setup Complexity', aidly: 'Simple', competitor: 'Complex' },
      { feature: 'AI for Email', aidly: 'Purpose-built', competitor: 'Basic' },
      { feature: 'Feature Bloat', aidly: 'Focused', competitor: 'Heavy suite' },
      { feature: 'Best For', aidly: 'B2C email teams', competitor: 'Product companies' },
    ]
  }
}

export async function generateStaticParams() {
  return Object.keys(comparisons).map((slug) => ({
    slug,
  }))
}

export async function generateMetadata({ params }: ComparisonPageProps): Promise<Metadata> {
  const { slug } = await params
  const comparison = comparisons[slug as keyof typeof comparisons]

  if (!comparison) {
    return { title: 'Comparison Not Found' }
  }

  return {
    title: comparison.title,
    description: comparison.description,
    keywords: comparison.keywords,
    openGraph: {
      title: comparison.title,
      description: comparison.description,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: comparison.title,
      description: comparison.description,
    },
  }
}

export default async function ComparisonPage({ params }: ComparisonPageProps) {
  const { slug } = await params
  const comparison = comparisons[slug as keyof typeof comparisons]

  if (!comparison) {
    notFound()
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": comparison.title,
    "description": comparison.description,
    "about": {
      "@type": "SoftwareApplication",
      "name": "Aidly"
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC] dark:bg-[#0A0A0B]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Navigation */}
      <nav className="fixed left-0 right-0 top-0 z-40 border-b backdrop-blur-xl border-slate-200/80 bg-white/80 dark:border-white/[0.06] dark:bg-[#0A0A0B]/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
            <Image src="/logo-60x.png" alt="Aidly" width={28} height={28} className="rounded-lg" />
            <span className="text-lg font-semibold tracking-tight">Aidly</span>
          </Link>
          <Link href="/" className="text-sm text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white">
            Back to Home
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-32 pb-16">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm border-slate-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03]">
            <span className="text-slate-600 dark:text-white/60">Comparison Guide</span>
          </div>

          <h1 className="font-[var(--font-custom)] text-4xl font-medium tracking-tight text-slate-900 dark:text-white md:text-5xl lg:text-6xl">
            {comparison.title}
          </h1>

          <p className="mt-6 text-lg text-slate-600 dark:text-white/50">
            {comparison.heroSubtitle}
          </p>

          <div className="mt-8">
            <Button size="lg" className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-[#0A0A0B]" asChild>
              <Link href="/#pricing">Try Aidly Free</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03]">
            <div className="grid grid-cols-3 gap-4 border-b p-6 border-slate-200 bg-slate-50 dark:border-white/[0.08] dark:bg-white/[0.02]">
              <div className="font-medium text-slate-900 dark:text-white">Feature</div>
              <div className="font-medium text-[#3872B9] dark:text-[#B33275]">Aidly</div>
              <div className="font-medium text-slate-600 dark:text-white/60">{comparison.competitor}</div>
            </div>

            {comparison.comparisonTable.map((row, i) => (
              <div key={i} className="grid grid-cols-3 gap-4 border-b p-6 last:border-b-0 border-slate-200 dark:border-white/[0.08]">
                <div className="font-medium text-slate-900 dark:text-white">{row.feature}</div>
                <div className="text-slate-700 dark:text-white/70">{row.aidly}</div>
                <div className="text-slate-600 dark:text-white/60">{row.competitor}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Aidly */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-8 md:grid-cols-2">
            {/* Aidly Advantages */}
            <div className="rounded-2xl border p-8 border-slate-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03]">
              <h2 className="mb-6 font-[var(--font-custom)] text-2xl font-medium text-slate-900 dark:text-white">
                Why Choose Aidly
              </h2>
              <ul className="space-y-3">
                {comparison.aidlyPros.map((pro, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-700 dark:text-white/70">
                    <svg className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {pro}
                  </li>
                ))}
              </ul>
            </div>

            {/* Competitor Limitations */}
            <div className="rounded-2xl border p-8 border-slate-200 bg-slate-50 dark:border-white/[0.08] dark:bg-white/[0.02]">
              <h2 className="mb-6 font-[var(--font-custom)] text-2xl font-medium text-slate-900 dark:text-white">
                {comparison.competitor} Limitations
              </h2>
              <ul className="space-y-3">
                {comparison.competitorCons.map((con, i) => (
                  <li key={i} className="flex items-start gap-3 text-slate-600 dark:text-white/60">
                    <svg className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 pb-32">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border p-12 text-center border-slate-200 bg-gradient-to-br from-white to-slate-50 dark:border-white/[0.08] dark:from-white/[0.03] dark:to-white/[0.01]">
            <h2 className="mb-4 font-[var(--font-custom)] text-3xl font-medium text-slate-900 dark:text-white">
              Ready to switch?
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-slate-600 dark:text-white/60">
              Start with 5 free emails. No credit card required. See the difference yourself.
            </p>
            <Button size="lg" className="bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-[#0A0A0B]" asChild>
              <Link href="/#pricing">Start Free Trial</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
