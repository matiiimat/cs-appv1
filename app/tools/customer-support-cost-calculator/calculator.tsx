"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"

export default function CostCalculator() {
  const [isDark, setIsDark] = useState(false)

  // Form inputs
  const [numAgents, setNumAgents] = useState<number>(5)
  const [avgSalary, setAvgSalary] = useState<number>(50000)
  const [monthlyEmails, setMonthlyEmails] = useState<number>(3000)
  const [currentToolCost, setCurrentToolCost] = useState<number>(115)

  // Calculated results
  const [results, setResults] = useState({
    totalAnnualCost: 0,
    laborCost: 0,
    toolCost: 0,
    costPerTicket: 0,
    aidlyCost: 0,
    aidlyLaborCost: 0,
    agentsNeededWithAidly: 0,
    totalWithAidly: 0,
    costPerTicketWithAidly: 0,
    annualSavings: 0,
    savingsPercent: 0,
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setIsDark(mediaQuery.matches)
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    calculateCosts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numAgents, avgSalary, monthlyEmails, currentToolCost])

  const calculateCosts = () => {
    // CURRENT SETUP: Cost to handle monthly email volume
    const annualLaborCost = numAgents * avgSalary
    const annualToolCost = numAgents * currentToolCost * 12
    const totalAnnual = annualLaborCost + annualToolCost

    // Cost per ticket (current setup)
    const annualEmails = monthlyEmails * 12
    const costPerTicket = annualEmails > 0 ? totalAnnual / annualEmails : 0

    // WITH AIDLY: Calculate agents needed to handle same volume
    // Industry standard: 1 agent handles ~350 emails/month
    // With AI assistance: 1 agent handles ~875 emails/month (2.5x capacity)
    const emailsPerAgentWithAI = 875

    // Agents needed with Aidly to handle the SAME volume
    const agentsNeededWithAidly = Math.max(1, Math.ceil(monthlyEmails / emailsPerAgentWithAI))

    // Aidly cost calculation (based on email volume, not agents)
    // Plus plan: $208/mo for 5,000 emails/mo
    // Pro plan: $166/mo for 1,000 emails/mo
    let aidlyMonthlyCost = 0
    if (monthlyEmails <= 1000) {
      aidlyMonthlyCost = 166
    } else if (monthlyEmails <= 5000) {
      aidlyMonthlyCost = 208
    } else {
      // For volumes over 5,000, calculate proportionally
      const extraThousands = Math.ceil((monthlyEmails - 5000) / 5000)
      aidlyMonthlyCost = 208 + (extraThousands * 208)
    }

    const aidlyAnnualCost = aidlyMonthlyCost * 12

    // Total cost with Aidly (fewer agents needed + Aidly subscription)
    const aidlyLaborCost = agentsNeededWithAidly * avgSalary
    const totalWithAidly = aidlyLaborCost + aidlyAnnualCost

    // Savings calculation
    const annualSavings = totalAnnual - totalWithAidly
    const savingsPercent = totalAnnual > 0 ? (annualSavings / totalAnnual) * 100 : 0

    // Cost per ticket with Aidly
    const costPerTicketWithAidly = annualEmails > 0 ? totalWithAidly / annualEmails : 0

    setResults({
      totalAnnualCost: totalAnnual,
      laborCost: annualLaborCost,
      toolCost: annualToolCost,
      costPerTicket: costPerTicket,
      aidlyCost: aidlyAnnualCost,
      aidlyLaborCost: aidlyLaborCost,
      agentsNeededWithAidly: agentsNeededWithAidly,
      totalWithAidly: totalWithAidly,
      costPerTicketWithAidly: costPerTicketWithAidly,
      annualSavings: Math.max(0, annualSavings),
      savingsPercent: Math.max(0, savingsPercent),
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className={`min-h-screen antialiased ${isDark ? 'dark' : ''}`}>
      <div className="min-h-screen bg-[#FAFBFC] text-slate-900 dark:bg-[#0A0A0B] dark:text-white">
        {/* Schema markup for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Customer Support Cost Calculator",
              "applicationCategory": "BusinessApplication",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "description": "Free customer support cost calculator to calculate team costs, cost per ticket, and potential savings with AI",
            })
          }}
        />

        {/* Navigation */}
        <nav className="border-b border-slate-200 bg-white dark:border-white/[0.06] dark:bg-[#0A0A0B]">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
              <Image src="/logo-60x.png" alt="Aidly" width={28} height={28} className="rounded-lg" />
              <span className="text-lg font-semibold tracking-tight">Aidly</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/blog" className="text-sm text-slate-600 transition-colors hover:text-slate-900 dark:text-white/60 dark:hover:text-white">
                Blog
              </Link>
              <Link href="/#pricing" className="text-sm text-slate-600 transition-colors hover:text-slate-900 dark:text-white/60 dark:hover:text-white">
                Pricing
              </Link>
            </div>
          </div>
        </nav>

        <main className="mx-auto max-w-5xl px-6 py-12">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white sm:text-5xl">
              Customer Support Cost Calculator
            </h1>
            <p className="mt-4 text-lg text-slate-600 dark:text-white/70">
              Calculate your team&apos;s total costs, cost per ticket, and potential savings with AI-assisted support
            </p>
          </div>

          {/* Calculator Section */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Input Form */}
            <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-white/[0.06] dark:bg-white/[0.02]">
              <h2 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-white">Your Current Setup</h2>

              <div className="space-y-6">
                {/* Number of Agents */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-white/80">
                    Number of Support Agents
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={numAgents}
                    onChange={(e) => setNumAgents(parseInt(e.target.value) || 1)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:border-[#3872B9] focus:outline-none focus:ring-2 focus:ring-[#3872B9]/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-white/50">Full-time support team members</p>
                </div>

                {/* Average Salary */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-white/80">
                    Average Agent Salary (Annual)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-white/50">$</span>
                    <input
                      type="number"
                      min="20000"
                      max="150000"
                      step="5000"
                      value={avgSalary}
                      onChange={(e) => setAvgSalary(parseInt(e.target.value) || 30000)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 pl-8 text-slate-900 focus:border-[#3872B9] focus:outline-none focus:ring-2 focus:ring-[#3872B9]/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-white/50">US average: $45,000 - $65,000</p>
                </div>

                {/* Monthly Email Volume */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-white/80">
                    Monthly Email Volume
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="50000"
                    step="100"
                    value={monthlyEmails}
                    onChange={(e) => setMonthlyEmails(parseInt(e.target.value) || 100)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:border-[#3872B9] focus:outline-none focus:ring-2 focus:ring-[#3872B9]/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-white/50">Total customer emails received per month</p>
                </div>

                {/* Current Tool Cost */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-white/80">
                    Current Tool Cost (per agent/month)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-white/50">$</span>
                    <input
                      type="number"
                      min="0"
                      max="500"
                      step="5"
                      value={currentToolCost}
                      onChange={(e) => setCurrentToolCost(parseInt(e.target.value) || 0)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 pl-8 text-slate-900 focus:border-[#3872B9] focus:outline-none focus:ring-2 focus:ring-[#3872B9]/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-white/50">Zendesk, Intercom, etc. (typically $55-150/agent)</p>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="space-y-6">
              {/* Current Costs */}
              <div className="rounded-2xl border border-slate-200 bg-white p-8 dark:border-white/[0.06] dark:bg-white/[0.02]">
                <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Your Current Annual Costs</h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-white/60">Labor Cost</span>
                    <span className="text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(results.laborCost)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-white/60">Tool Cost</span>
                    <span className="text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(results.toolCost)}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-4 dark:border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900 dark:text-white">Total Annual Cost</span>
                      <span className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(results.totalAnnualCost)}</span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4 dark:bg-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600 dark:text-white/60">Cost per Ticket</span>
                      <span className="text-lg font-semibold text-slate-900 dark:text-white">{formatCurrency(results.costPerTicket)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Savings with Aidly */}
              <div className="rounded-2xl border-2 border-[#3872B9] bg-gradient-to-br from-[#3872B9]/5 to-[#B33275]/5 p-8">
                <div className="mb-4 flex items-center gap-2">
                  <div className="rounded-lg bg-[#3872B9] px-3 py-1 text-xs font-semibold text-white">
                    With Aidly
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Cost to Handle Same Volume</h3>
                </div>

                <div className="mb-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-white/60">Agents Needed</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{results.agentsNeededWithAidly} (vs {numAgents} current)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-white/60">Labor Cost</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(results.aidlyLaborCost)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-white/60">Aidly Subscription</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(results.aidlyCost)}</span>
                  </div>
                  <div className="border-t border-[#3872B9]/20 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-900 dark:text-white">Total Annual Cost</span>
                      <span className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(results.totalWithAidly)}</span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-white/50 p-3 dark:bg-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600 dark:text-white/60">Cost per Ticket</span>
                      <span className="font-semibold text-slate-900 dark:text-white">{formatCurrency(results.costPerTicketWithAidly)}</span>
                    </div>
                  </div>
                </div>

                <div className="my-6 border-t border-[#3872B9]/30 pt-6">
                  <div className="text-center">
                    <div className="text-sm font-medium text-slate-600 dark:text-white/60">Annual Savings</div>
                    <div className="mt-1 text-4xl font-bold text-[#3872B9] dark:text-[#3872B9]">
                      {formatCurrency(results.annualSavings)}
                    </div>
                    <div className="mt-1 text-xl font-semibold text-[#B33275]">
                      {results.savingsPercent.toFixed(0)}% cost reduction
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600 dark:text-white/70">
                  <p>✓ Each agent handles 2.5x more emails with AI assistance</p>
                  <p>✓ Same quality support, fewer agents needed</p>
                  <p>✓ Unlimited agents included in all plans</p>
                  <p className="italic">*Based on industry average of 350 emails/agent/month without AI</p>
                </div>

                <div className="mt-6">
                  <Link
                    href="/#pricing"
                    className="block w-full rounded-lg bg-[#3872B9] px-6 py-3 text-center font-semibold text-white transition-colors hover:bg-[#2d5a93]"
                  >
                    Try Aidly Free - 5 Emails
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Related Resources */}
          <div className="mt-16 rounded-2xl border border-slate-200 bg-white p-8 dark:border-white/[0.06] dark:bg-white/[0.02]">
            <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">Related Resources</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Link
                href="/blog/email-support-cost-comparison"
                className="group rounded-lg border border-slate-200 p-4 transition-colors hover:border-[#3872B9] dark:border-white/10 dark:hover:border-[#3872B9]"
              >
                <h3 className="font-semibold text-slate-900 group-hover:text-[#3872B9] dark:text-white dark:group-hover:text-[#3872B9]">
                  The True Cost of Email Support in 2026
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-white/60">
                  Detailed breakdown: hiring vs outsourcing vs AI-assisted support
                </p>
              </Link>
              <Link
                href="/blog/ai-vs-hiring-support-agent"
                className="group rounded-lg border border-slate-200 p-4 transition-colors hover:border-[#3872B9] dark:border-white/10 dark:hover:border-[#3872B9]"
              >
                <h3 className="font-semibold text-slate-900 group-hover:text-[#3872B9] dark:text-white dark:group-hover:text-[#3872B9]">
                  Should You Hire or Use AI?
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-white/60">
                  Decision framework for your first support hire vs AI-assisted
                </p>
              </Link>
              <Link
                href="/blog/gorgias-alternative-shopify"
                className="group rounded-lg border border-slate-200 p-4 transition-colors hover:border-[#3872B9] dark:border-white/10 dark:hover:border-[#3872B9]"
              >
                <h3 className="font-semibold text-slate-900 group-hover:text-[#3872B9] dark:text-white dark:group-hover:text-[#3872B9]">
                  Best Gorgias Alternative for Shopify
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-white/60">
                  Compare pricing and features for Shopify stores
                </p>
              </Link>
              <Link
                href="/blog/zendesk-vs-aidly-comparison"
                className="group rounded-lg border border-slate-200 p-4 transition-colors hover:border-[#3872B9] dark:border-white/10 dark:hover:border-[#3872B9]"
              >
                <h3 className="font-semibold text-slate-900 group-hover:text-[#3872B9] dark:text-white dark:group-hover:text-[#3872B9]">
                  Zendesk vs Aidly Comparison
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-white/60">
                  Feature and pricing breakdown for B2C teams
                </p>
              </Link>
            </div>
          </div>

        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-8 dark:border-white/[0.06] dark:bg-transparent">
          <div className="mx-auto max-w-5xl px-6">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="flex items-center gap-2">
                <Image src="/logo-60x.png" alt="Aidly" width={20} height={20} className="rounded-lg" />
                <span className="text-sm text-slate-500 dark:text-white/40">© {new Date().getFullYear()} Aidly</span>
              </div>
              <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-white/40">
                <Link href="/legal-notice" className="transition-colors hover:text-slate-900 dark:hover:text-white">Legal Notice</Link>
                <Link href="/privacy" className="transition-colors hover:text-slate-900 dark:hover:text-white">Privacy</Link>
                <Link href="/terms" className="transition-colors hover:text-slate-900 dark:hover:text-white">Terms</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
