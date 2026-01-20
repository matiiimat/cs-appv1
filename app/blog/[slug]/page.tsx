import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getAllPosts, getPostBySlug } from '../lib/posts'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const posts = await getAllPosts()
  return posts.map((post) => ({
    slug: post.slug,
  }))
}

// Category color mapping
const categoryColors: Record<string, { bg: string; text: string }> = {
  'Comparison': { bg: 'bg-gradient-to-r from-[#3872B9]/10 to-[#3872B9]/20', text: 'text-[#3872B9]' },
  'How-To': { bg: 'bg-gradient-to-r from-[#10B981]/10 to-[#10B981]/20', text: 'text-[#10B981]' },
  'Strategy': { bg: 'bg-gradient-to-r from-[#B33275]/10 to-[#B33275]/20', text: 'text-[#B33275]' },
  'Best Practices': { bg: 'bg-gradient-to-r from-[#8B5CF6]/10 to-[#8B5CF6]/20', text: 'text-[#8B5CF6]' },
  'Industry Insights': { bg: 'bg-gradient-to-r from-[#F38135]/10 to-[#F38135]/20', text: 'text-[#F38135]' },
  'Compliance': { bg: 'bg-gradient-to-r from-[#0EA5E9]/10 to-[#0EA5E9]/20', text: 'text-[#0EA5E9]' },
  'Business Growth': { bg: 'bg-gradient-to-r from-[#EC4899]/10 to-[#EC4899]/20', text: 'text-[#EC4899]' },
  'Business Case': { bg: 'bg-gradient-to-r from-[#14B8A6]/10 to-[#14B8A6]/20', text: 'text-[#14B8A6]' },
  'Use Case': { bg: 'bg-gradient-to-r from-[#F59E0B]/10 to-[#F59E0B]/20', text: 'text-[#F59E0B]' },
  'Customer Support': { bg: 'bg-gradient-to-r from-[#3872B9]/10 to-[#B33275]/10', text: 'text-[#3872B9]' },
  'Prompts': { bg: 'bg-gradient-to-r from-[#6366F1]/10 to-[#6366F1]/20', text: 'text-[#6366F1]' }
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) {
    return {
      title: 'Post Not Found'
    }
  }

  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.date,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
    },
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = await getPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const colors = post.category ? categoryColors[post.category] : categoryColors['Customer Support']

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": post.title,
    "datePublished": post.date,
    "description": post.excerpt,
    "author": {
      "@type": "Organization",
      "name": "Aidly"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Aidly",
      "logo": {
        "@type": "ImageObject",
        "url": "https://aidly.me/logo-60x.png"
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC] dark:bg-[#0A0A0B]">
      {/* Theme Script - Must run before render */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(() => { try { const t = localStorage.getItem('aidly-theme'); if (t === 'dark') { document.documentElement.classList.add('dark'); } else { document.documentElement.classList.remove('dark'); } } catch(_) {} })();`,
        }}
      />

      {/* Structured Data */}
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
          <Link href="/blog" className="text-sm text-slate-600 hover:text-slate-900 dark:text-white/70 dark:hover:text-white">
            Back to Blog
          </Link>
        </div>
      </nav>

      {/* Article */}
      <article className="px-6 pt-32 pb-20">
        <div className="mx-auto max-w-3xl">
          {/* Header */}
          <header className="mb-12">
            {post.category && (
              <div className={`mb-4 inline-flex items-center rounded-full ${colors.bg} px-3 py-1 text-xs font-medium ${colors.text}`}>
                {post.category}
              </div>
            )}

            <h1 className="mb-6 font-[var(--font-custom)] text-4xl font-medium tracking-tight text-slate-900 dark:text-white md:text-5xl">
              {post.title}
            </h1>

            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-white/40">
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
          </header>

          {/* Content */}
          <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-[var(--font-custom)] prose-headings:tracking-tight prose-headings:font-medium prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-a:text-[#3872B9] dark:prose-a:text-[#B33275] prose-a:no-underline hover:prose-a:underline">
            <MDXRemote
              source={post.content}
              options={{
                mdxOptions: {
                  remarkPlugins: [remarkGfm],
                  rehypePlugins: [rehypeSlug, rehypeHighlight],
                }
              }}
            />
          </div>

          {/* Footer CTA */}
          <div className="mt-16 rounded-2xl border p-8 text-center border-slate-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.03]">
            <h3 className="mb-3 font-[var(--font-custom)] text-2xl font-medium text-slate-900 dark:text-white">
              Ready to transform your customer support?
            </h3>
            <p className="mb-6 text-slate-600 dark:text-white/60">
              Start with 5 free emails. No credit card required.
            </p>
            <Link
              href="/#pricing"
              className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-[#0A0A0B] dark:hover:bg-white/90"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </article>
    </div>
  )
}
