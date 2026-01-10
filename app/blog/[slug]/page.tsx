import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import { getAllPosts, getPostBySlug } from '../lib/posts'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const posts = await getAllPosts()
  return posts.map((post) => ({
    slug: post.slug,
  }))
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
              <div className="mb-4 inline-flex items-center rounded-full bg-gradient-to-r from-[#3872B9]/10 to-[#B33275]/10 px-3 py-1 text-xs font-medium text-[#3872B9] dark:text-[#B33275]">
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
          <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-[var(--font-custom)] prose-headings:tracking-tight prose-a:text-[#3872B9] dark:prose-a:text-[#B33275] prose-a:no-underline hover:prose-a:underline">
            <MDXRemote
              source={post.content}
              options={{
                mdxOptions: {
                  remarkPlugins: [remarkGfm],
                  rehypePlugins: [rehypeHighlight],
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
