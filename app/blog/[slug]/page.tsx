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

  // FAQ Schema for posts with FAQ content
  const faqSchemas: Record<string, object> = {
    'apology-email-to-customer': {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How do you write a professional apology email to a customer?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "A professional apology email should include: 1) A clear acknowledgment of the issue in the first sentence, 2) A sincere apology without excuses, 3) A brief explanation of what went wrong, 4) The specific steps you're taking to fix it, and 5) Compensation or next steps if appropriate. Keep it concise, personal, and focused on the customer's experience."
          }
        },
        {
          "@type": "Question",
          "name": "What should you never say in an apology email to a customer?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Avoid phrases like 'I'm sorry you feel that way' (shifts blame), 'It's not our fault' (defensive), 'Per our policy' (cold and corporate), 'This never happens' (dismissive), or 'Mistakes happen' (minimizes the issue). These phrases make customers feel unheard and can escalate the situation instead of resolving it."
          }
        },
        {
          "@type": "Question",
          "name": "How quickly should you send an apology email to a customer?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Ideally within 1-4 hours of discovering the issue. Research shows that businesses responding within one hour are 7x more likely to retain the customer. A quick, genuine apology is always better than a perfect one sent days later. If you need more time to investigate, send a brief acknowledgment immediately."
          }
        },
        {
          "@type": "Question",
          "name": "Should you offer compensation in a customer apology email?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "It depends on the severity of the issue. For minor inconveniences, a sincere apology may suffice. For significant problems like wrong orders, service outages, or billing errors, offering a discount, refund, or account credit shows you value the customer relationship. Match the compensation to the level of inconvenience caused."
          }
        }
      ]
    }
  }

  const faqSchema = faqSchemas[slug]

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

      {/* FAQ Schema for applicable posts */}
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

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
