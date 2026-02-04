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
    },
    'zendesk-vs-aidly-comparison': {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is the best Zendesk alternative for small businesses?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For small B2C teams (1-20 people) focused on email support, Aidly is the best Zendesk alternative. It costs $208/month flat (vs Zendesk's $55-150/agent/month), includes AI response drafting, and sets up in minutes instead of weeks. You save 70-80% compared to Zendesk while getting faster response times."
          }
        },
        {
          "@type": "Question",
          "name": "How much does Zendesk cost per month?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Zendesk Suite starts at $55/agent/month for Suite Team, $89 for Suite Growth, and $115 for Suite Professional. AI features cost an extra $50-100/agent/month. A 5-agent team on Professional with AI costs around $950/month ($11,400/year). Enterprise plans are custom priced, typically $150-200+/agent."
          }
        },
        {
          "@type": "Question",
          "name": "Is Zendesk worth it for small teams?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For small teams under 20 agents, Zendesk is often overkill. Most small teams use only 20% of Zendesk's features while paying enterprise prices. If email is your primary support channel, simpler alternatives like Aidly or Help Scout offer better value. Zendesk makes sense for enterprises needing omnichannel support and complex workflows."
          }
        },
        {
          "@type": "Question",
          "name": "Can I switch from Zendesk to another tool?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes, migration from Zendesk is straightforward. Most teams switch in 1-2 hours: forward your support email to the new tool, import your macros/templates, and train your team (usually 15 minutes per agent). You can run both systems in parallel during transition to ensure nothing falls through the cracks."
          }
        }
      ]
    },
    'gorgias-alternative-shopify': {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is the best Gorgias alternative for Shopify stores?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For Shopify stores focused on email support, Aidly is the best Gorgias alternative. It costs $208/month flat vs Gorgias's ticket-based pricing ($300-900+/month at scale). Aidly includes AI that drafts complete responses, not just macros, and your costs don't spike during Black Friday or holiday rushes."
          }
        },
        {
          "@type": "Question",
          "name": "How much does Gorgias cost per month?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Gorgias uses ticket-based pricing: Starter at $50/month (300 tickets), Basic at $180/month (2,000 tickets), Pro at $450/month (5,000 tickets), and Advanced at $900/month (10,000 tickets). Costs scale with volume, meaning your bill can triple during peak seasons like Black Friday."
          }
        },
        {
          "@type": "Question",
          "name": "Is Gorgias worth it for small Shopify stores?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Gorgias can be overkill for small stores. If you mainly use email (not chat, phone, or social), you're paying for features you don't use. Gorgias shines for omnichannel support, but if 70-80% of your volume is email, a focused email tool with AI drafting often provides better ROI."
          }
        },
        {
          "@type": "Question",
          "name": "What's cheaper than Gorgias for Shopify?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For email-focused Shopify stores, Aidly ($208/month flat) and Re:amaze ($29/user/month) are cheaper than Gorgias at most volume levels. At 2,000 tickets/month, Gorgias costs ~$450 while Aidly costs $208. The savings increase as your volume grows since Aidly's pricing is flat, not per-ticket."
          }
        }
      ]
    },
    'email-support-cost-comparison': {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How much does email customer support cost per ticket?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The average B2C company pays $15-25 per support ticket with traditional staffing. Outsourcing costs $3-8 per ticket. AI-assisted support (where AI drafts and humans review) costs $0.50-2 per ticket. The difference comes from AI handling repetitive writing while humans focus on review and judgment."
          }
        },
        {
          "@type": "Question",
          "name": "Is it cheaper to hire support agents or use AI?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "AI-assisted support is 85-90% cheaper than hiring. A full-time US support agent costs $6,000-9,500/month total (salary, benefits, training, turnover). AI-assisted support for the same volume costs $500-1,500/month. AI handles drafting; one reviewer can manage what used to require 3-4 agents."
          }
        },
        {
          "@type": "Question",
          "name": "How much does it cost to hire a customer support agent?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The true cost of a US-based support agent is $69,000-110,000/year, not just the $45K salary. This includes payroll taxes, health insurance, PTO, equipment, software, training, management time, and turnover costs (30% annual industry average). That's $5,750-9,150/month per agent."
          }
        },
        {
          "@type": "Question",
          "name": "What is the cheapest way to handle customer support emails?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "AI-assisted support is the cheapest option that maintains quality. AI drafts responses instantly, you review and approve in 1-2 minutes per ticket. Cost: $200-500/month for software plus your review time. Compared to hiring ($6,000+/month) or outsourcing ($3,000+/month), it's 80-95% cheaper."
          }
        }
      ]
    },
    'ai-vs-hiring-support-agent': {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Should I hire a support agent or use AI for customer service?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For under 1,500 tickets/month, AI-assisted support is more cost-effective. You pay $200-500/month for AI software plus 1-2 hours/day reviewing drafts. Hiring makes sense above 1,500 tickets/month or when you need to completely remove yourself from support. AI-assisted is 90% cheaper with the same quality."
          }
        },
        {
          "@type": "Question",
          "name": "When should I hire my first customer support agent?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Consider hiring when you exceed 1,500 tickets/month and AI review time becomes a full-time job, or when you need phone/chat support (AI works best for email). Try AI-assisted first—you might find it handles your volume without needing to hire, saving $70,000+/year."
          }
        },
        {
          "@type": "Question",
          "name": "Can AI replace customer support agents?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "AI doesn't fully replace agents—it augments them. With AI-assisted support, AI handles drafting (80% of the work) while humans review, edit, and approve. One person reviewing AI drafts can handle what used to require 3-4 agents writing manually. You still need human judgment, just less human typing."
          }
        },
        {
          "@type": "Question",
          "name": "Is AI customer support as good as human support?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "With human-in-the-loop AI, customers get human-quality responses because a human reviews everything before sending. Customers can't tell the difference—they just see faster, more consistent replies. The key is AI-assisted (human reviews) not AI-autonomous (bot replies automatically)."
          }
        }
      ]
    },
    'reduce-customer-support-costs': {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How can I reduce customer support costs?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The fastest way to cut support costs by 90% is AI-assisted support: AI drafts responses, humans review and approve. This cuts time per ticket from 7-11 minutes to 1-2 minutes. One reviewer handles what used to need 3-4 agents. Other strategies: flat-rate pricing, automated context gathering, and eliminating tier-1 staffing."
          }
        },
        {
          "@type": "Question",
          "name": "What is a good cost per support ticket?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Industry average is $15-25 per ticket with traditional staffing. Good is under $10. Excellent is under $5. AI-assisted support achieves $0.50-2 per ticket. If you're paying more than $10/ticket for email support, you're likely overspending on manual processes that AI can handle."
          }
        },
        {
          "@type": "Question",
          "name": "How do I calculate customer support cost per ticket?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Cost per ticket = Total monthly support costs ÷ Monthly ticket volume. Include salaries, benefits, software, training, and management time. Example: $12,000 monthly cost ÷ 1,000 tickets = $12/ticket. Most companies underestimate by forgetting hidden costs like turnover, training, and management overhead."
          }
        }
      ]
    },
    'reamaze-alternative': {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is the best Re:amaze alternative?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For email-focused e-commerce teams, Aidly is the best Re:amaze alternative. It offers AI response drafting (not just automation), flat pricing at $208/month vs Re:amaze's per-seat pricing, and faster setup. For multi-channel needs, consider Gorgias or Freshdesk. For simplicity, Help Scout works well."
          }
        },
        {
          "@type": "Question",
          "name": "How much does Re:amaze cost?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Re:amaze uses per-user pricing: Basic at $29/user/month, Pro at $49/user/month, and Plus at $69/user/month. A team of 5 on Pro costs $245/month. Unlike flat-rate alternatives, your costs scale with team size even if ticket volume stays the same."
          }
        },
        {
          "@type": "Question",
          "name": "Is Re:amaze good for Shopify stores?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Re:amaze has decent Shopify integration and multi-channel support. However, its AI is basic (rule-based, not generative), and per-seat pricing gets expensive as teams grow. For Shopify stores where email is the primary channel, specialized tools like Aidly or Gorgias often provide better value."
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
