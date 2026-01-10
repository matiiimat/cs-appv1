import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { getAllPosts } from './lib/posts'

export const metadata: Metadata = {
  title: 'Blog - Customer Support Insights & AI Tips',
  description: 'Expert insights on customer support automation, AI email assistants, and building better B2B customer experiences.',
  openGraph: {
    title: 'Aidly Blog - Customer Support Insights & AI Tips',
    description: 'Expert insights on customer support automation, AI email assistants, and building better B2B customer experiences.',
  },
}

// Category color mapping
const categoryColors: Record<string, { bg: string; text: string; hover: string }> = {
  'Comparison': {
    bg: 'bg-gradient-to-r from-[#3872B9]/10 to-[#3872B9]/20',
    text: 'text-[#3872B9]',
    hover: 'group-hover:text-[#3872B9]'
  },
  'How-To': {
    bg: 'bg-gradient-to-r from-[#10B981]/10 to-[#10B981]/20',
    text: 'text-[#10B981]',
    hover: 'group-hover:text-[#10B981]'
  },
  'Strategy': {
    bg: 'bg-gradient-to-r from-[#B33275]/10 to-[#B33275]/20',
    text: 'text-[#B33275]',
    hover: 'group-hover:text-[#B33275]'
  },
  'Best Practices': {
    bg: 'bg-gradient-to-r from-[#8B5CF6]/10 to-[#8B5CF6]/20',
    text: 'text-[#8B5CF6]',
    hover: 'group-hover:text-[#8B5CF6]'
  },
  'Industry Insights': {
    bg: 'bg-gradient-to-r from-[#F38135]/10 to-[#F38135]/20',
    text: 'text-[#F38135]',
    hover: 'group-hover:text-[#F38135]'
  },
  'Compliance': {
    bg: 'bg-gradient-to-r from-[#0EA5E9]/10 to-[#0EA5E9]/20',
    text: 'text-[#0EA5E9]',
    hover: 'group-hover:text-[#0EA5E9]'
  },
  'Business Growth': {
    bg: 'bg-gradient-to-r from-[#EC4899]/10 to-[#EC4899]/20',
    text: 'text-[#EC4899]',
    hover: 'group-hover:text-[#EC4899]'
  },
  'Business Case': {
    bg: 'bg-gradient-to-r from-[#14B8A6]/10 to-[#14B8A6]/20',
    text: 'text-[#14B8A6]',
    hover: 'group-hover:text-[#14B8A6]'
  },
  'Use Case': {
    bg: 'bg-gradient-to-r from-[#F59E0B]/10 to-[#F59E0B]/20',
    text: 'text-[#F59E0B]',
    hover: 'group-hover:text-[#F59E0B]'
  },
  'Customer Support': {
    bg: 'bg-gradient-to-r from-[#3872B9]/10 to-[#B33275]/10',
    text: 'text-[#3872B9]',
    hover: 'group-hover:text-[#B33275]'
  }
}

export default async function BlogPage() {
  const posts = await getAllPosts()

  return (
    <div className="min-h-screen bg-[#FAFBFC] dark:bg-[#0A0A0B]">
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

      {/* Hero Section */}
      <section className="px-6 pt-32 pb-16">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="font-[var(--font-custom)] text-5xl font-medium tracking-tight text-slate-900 dark:text-white md:text-6xl">
            Customer Support
            <span className="block bg-gradient-to-r from-[#3872B9] to-[#B33275] bg-clip-text text-transparent">
              Insights & Resources
            </span>
          </h1>
          <p className="mt-6 text-lg text-slate-600 dark:text-white/50">
            Learn how to transform your customer support with AI, best practices, and industry insights.
          </p>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="px-6 pb-32">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => {
              const colors = post.category ? categoryColors[post.category] : categoryColors['Customer Support']

              return (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 border-slate-200 bg-white hover:shadow-lg dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
              >
                {post.category && (
                  <div className={`mb-4 inline-flex items-center rounded-full ${colors.bg} px-3 py-1 text-xs font-medium ${colors.text}`}>
                    {post.category}
                  </div>
                )}

                <h2 className={`mb-3 font-[var(--font-custom)] text-xl font-medium tracking-tight text-slate-900 dark:text-white ${colors.hover} transition-colors`}>
                  {post.title}
                </h2>

                <p className="mb-4 text-sm leading-relaxed text-slate-600 dark:text-white/60">
                  {post.excerpt}
                </p>

                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-white/40">
                  <time dateTime={post.date}>
                    {new Date(post.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </time>
                  <span>•</span>
                  <span>{post.readTime}</span>
                </div>

                {/* Hover gradient effect */}
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-[#3872B9]/0 via-[#B33275]/0 to-[#F38135]/0 opacity-0 blur-xl transition-opacity duration-500 -z-10 group-hover:opacity-20" />
              </Link>
            )}
            )}
          </div>

          {posts.length === 0 && (
            <div className="text-center py-20">
              <p className="text-slate-600 dark:text-white/50">No blog posts yet. Check back soon!</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
