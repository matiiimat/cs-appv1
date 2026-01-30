"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"

// Industry benchmarks
const BENCHMARKS = {
  emailsPerAgentLow: 250,      // Spare capacity or complex tickets
  emailsPerAgentTypical: 350,  // Industry average
  emailsPerAgentHigh: 450,     // High performers
  emailsPerAgentMax: 600,      // Likely overwhelmed
  overheadMultiplier: 1.35,    // Benefits, taxes, equipment (35%)
  turnoverCostPercent: 0.10,   // ~35% turnover rate, costs ~30% salary to replace
  aiProductivityMultiplier: 2.5, // AI-assisted agents handle 2.5x more
}

// Aidly pricing tiers
const getAidlyMonthlyCost = (monthlyEmails: number): number => {
  if (monthlyEmails <= 1000) return 166
  if (monthlyEmails <= 5000) return 208
  // For volumes over 5,000, scale by 5k increments
  const tiers = Math.ceil(monthlyEmails / 5000)
  return tiers * 208
}

type ProductivityLevel = "spare" | "typical" | "high" | "overwhelmed"

const getProductivityLevel = (emailsPerAgent: number): ProductivityLevel => {
  if (emailsPerAgent < BENCHMARKS.emailsPerAgentLow) return "spare"
  if (emailsPerAgent < BENCHMARKS.emailsPerAgentHigh) return "typical"
  if (emailsPerAgent < BENCHMARKS.emailsPerAgentMax) return "overwhelmed"
  return "overwhelmed"
}

const getProductivityLabel = (level: ProductivityLevel): { label: string; color: string; description: string } => {
  switch (level) {
    case "spare":
      return {
        label: "Spare Capacity",
        color: "text-blue-600 dark:text-blue-400",
        description: "Your team has room for more volume, or handles complex tickets that take longer."
      }
    case "typical":
      return {
        label: "Typical Utilization",
        color: "text-green-600 dark:text-green-400",
        description: "Your team is at industry-standard productivity levels."
      }
    case "high":
      return {
        label: "High Performers",
        color: "text-amber-600 dark:text-amber-400",
        description: "Your team handles more than average—efficient processes or simpler tickets."
      }
    case "overwhelmed":
      return {
        label: "Potentially Overwhelmed",
        color: "text-red-600 dark:text-red-400",
        description: "This volume per agent is unusually high. Quality or response times may suffer."
      }
  }
}

export default function CostCalculator() {
  const [isDark, setIsDark] = useState(false)

  // Form inputs
  const [numAgents, setNumAgents] = useState<number>(5)
  const [avgSalary, setAvgSalary] = useState<number>(50000)
  const [monthlyEmails, setMonthlyEmails] = useState<number>(3000)
  const [currentToolCost, setCurrentToolCost] = useState<number>(115)
  const [includeOverhead, setIncludeOverhead] = useState<boolean>(true)

  // Active scenario tab
  const [activeScenario, setActiveScenario] = useState<"growth" | "efficiency" | "quality">("growth")

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setIsDark(mediaQuery.matches)
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  // All calculations in a single useMemo for performance
  const results = useMemo(() => {
    // ===== CURRENT STATE ANALYSIS =====
    const emailsPerAgent = numAgents > 0 ? monthlyEmails / numAgents : 0
    const productivityLevel = getProductivityLevel(emailsPerAgent)
    const productivityInfo = getProductivityLabel(productivityLevel)
    const productivityVsBenchmark = BENCHMARKS.emailsPerAgentTypical > 0
      ? ((emailsPerAgent - BENCHMARKS.emailsPerAgentTypical) / BENCHMARKS.emailsPerAgentTypical) * 100
      : 0

    // ===== TRUE TOTAL COST OF OWNERSHIP =====
    const baseLaborCost = numAgents * avgSalary
    const overheadCost = includeOverhead ? baseLaborCost * (BENCHMARKS.overheadMultiplier - 1) : 0
    const turnoverCost = includeOverhead ? baseLaborCost * BENCHMARKS.turnoverCostPercent : 0
    const annualToolCost = numAgents * currentToolCost * 12

    const totalLaborWithOverhead = baseLaborCost + overheadCost + turnoverCost
    const totalAnnualCost = totalLaborWithOverhead + annualToolCost

    // Cost per ticket
    const annualEmails = monthlyEmails * 12
    const costPerTicket = annualEmails > 0 ? totalAnnualCost / annualEmails : 0

    // ===== AIDLY COSTS =====
    const aidlyMonthlyCost = getAidlyMonthlyCost(monthlyEmails)
    const aidlyAnnualCost = aidlyMonthlyCost * 12

    // ===== SCENARIO A: GROWTH MODE =====
    // Keep same team, but now they can handle 2.5x the volume
    const capacityWithAI = Math.round(numAgents * BENCHMARKS.emailsPerAgentTypical * BENCHMARKS.aiProductivityMultiplier)
    const growthTotalCost = totalLaborWithOverhead + aidlyAnnualCost
    const growthCostPerTicketAtCurrentVolume = annualEmails > 0 ? growthTotalCost / annualEmails : 0
    const growthCostPerTicketAtFullCapacity = capacityWithAI * 12 > 0 ? growthTotalCost / (capacityWithAI * 12) : 0
    const growthCapacityMultiple = monthlyEmails > 0 ? capacityWithAI / monthlyEmails : 0

    // ===== SCENARIO B: EFFICIENCY MODE =====
    // Reduce team to minimum needed for current volume
    const emailsPerAgentWithAI = BENCHMARKS.emailsPerAgentTypical * BENCHMARKS.aiProductivityMultiplier // 875
    const minAgentsNeeded = Math.max(1, Math.ceil(monthlyEmails / emailsPerAgentWithAI))
    const agentsReduced = Math.max(0, numAgents - minAgentsNeeded)

    const efficiencyLaborCost = minAgentsNeeded * avgSalary
    const efficiencyOverhead = includeOverhead ? efficiencyLaborCost * (BENCHMARKS.overheadMultiplier - 1) : 0
    const efficiencyTurnover = includeOverhead ? efficiencyLaborCost * BENCHMARKS.turnoverCostPercent : 0
    const efficiencyTotalLabor = efficiencyLaborCost + efficiencyOverhead + efficiencyTurnover
    const efficiencyTotalCost = efficiencyTotalLabor + aidlyAnnualCost

    const efficiencySavings = totalAnnualCost - efficiencyTotalCost
    const efficiencySavingsPercent = totalAnnualCost > 0 ? (efficiencySavings / totalAnnualCost) * 100 : 0
    const efficiencyCostPerTicket = annualEmails > 0 ? efficiencyTotalCost / annualEmails : 0

    // ===== ROI & BREAK-EVEN =====
    // How many tickets until Aidly pays for itself?
    // Assumption: AI saves ~20 min per ticket on average
    const avgHourlyRate = avgSalary / 2080 // 52 weeks * 40 hours
    const timeSavedPerTicketMinutes = 20
    const valueSavedPerTicket = (timeSavedPerTicketMinutes / 60) * avgHourlyRate
    const breakEvenTickets = valueSavedPerTicket > 0 ? Math.ceil(aidlyMonthlyCost / valueSavedPerTicket) : 0
    const monthlyROI = monthlyEmails > 0 && aidlyMonthlyCost > 0
      ? ((monthlyEmails * valueSavedPerTicket) / aidlyMonthlyCost)
      : 0
    const paybackDays = monthlyEmails > 0 && breakEvenTickets > 0
      ? Math.ceil((breakEvenTickets / monthlyEmails) * 30)
      : 0

    // ===== INPUT VALIDATION =====
    const warnings: string[] = []
    if (emailsPerAgent > 800) {
      warnings.push(`${Math.round(emailsPerAgent)} emails/agent is extremely high. Most teams max out around 400-500. Double-check your numbers.`)
    }
    if (emailsPerAgent < 100 && numAgents > 1) {
      warnings.push(`${Math.round(emailsPerAgent)} emails/agent is quite low. Your team may have significant spare capacity.`)
    }
    if (monthlyEmails < 100) {
      warnings.push("At very low volumes, the ROI of any tool is limited. Consider if dedicated software is needed.")
    }

    return {
      // Current state
      emailsPerAgent: Math.round(emailsPerAgent),
      productivityLevel,
      productivityInfo,
      productivityVsBenchmark,

      // Costs breakdown
      baseLaborCost,
      overheadCost,
      turnoverCost,
      totalLaborWithOverhead,
      annualToolCost,
      totalAnnualCost,
      costPerTicket,

      // Aidly
      aidlyMonthlyCost,
      aidlyAnnualCost,

      // Growth scenario
      capacityWithAI,
      growthTotalCost,
      growthCostPerTicketAtCurrentVolume,
      growthCostPerTicketAtFullCapacity,
      growthCapacityMultiple,

      // Efficiency scenario
      minAgentsNeeded,
      agentsReduced,
      efficiencyTotalLabor,
      efficiencyTotalCost,
      efficiencySavings,
      efficiencySavingsPercent,
      efficiencyCostPerTicket,

      // ROI
      valueSavedPerTicket,
      breakEvenTickets,
      monthlyROI,
      paybackDays,

      // Validation
      warnings,
    }
  }, [numAgents, avgSalary, monthlyEmails, currentToolCost, includeOverhead])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatCurrencyDecimal = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const formatPercent = (num: number) => {
    const sign = num >= 0 ? "+" : ""
    return `${sign}${num.toFixed(0)}%`
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
              "@graph": [
                {
                  "@type": "SoftwareApplication",
                  "name": "Customer Support Cost Calculator",
                  "applicationCategory": "BusinessApplication",
                  "operatingSystem": "Web",
                  "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "USD"
                  },
                  "description": "Free customer support cost calculator. Analyze your true support costs, benchmark against industry standards, and explore AI-assisted support options.",
                  "url": "https://aidly.me/tools/customer-support-cost-calculator",
                  "author": {
                    "@type": "Organization",
                    "name": "Aidly",
                    "url": "https://aidly.me"
                  }
                },
                {
                  "@type": "FAQPage",
                  "mainEntity": [
                    {
                      "@type": "Question",
                      "name": "How much does customer support cost per ticket?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Customer support costs $5-25 per ticket on average, depending on your team size, salaries, and overhead. With in-house agents at $50,000/year handling 350 tickets/month, the true cost is about $7-10 per ticket when including benefits and overhead."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "How many emails can one support agent handle per month?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Industry average is 350 tickets per agent per month for email support. High-performing teams may reach 450-600, while teams handling complex issues may be lower at 250-300. With AI assistance, agents can handle 2-2.5x more volume."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "What are the hidden costs of customer support?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Hidden costs include: benefits and taxes (add 35% to salary), turnover costs (support has ~35% annual turnover), training time, management overhead, and software licenses. True cost is typically 1.3-1.5x the base salary."
                      }
                    },
                    {
                      "@type": "Question",
                      "name": "How can AI reduce customer support costs?",
                      "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "AI-assisted support can reduce costs by 50-90% by: (1) Increasing agent capacity 2-2.5x through instant draft generation, (2) Reducing time per ticket from 7-10 minutes to 1-3 minutes, (3) Enabling the same team to handle more volume without hiring."
                      }
                    }
                  ]
                }
              ]
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
              Understand your true support costs, see how you compare to industry benchmarks, and explore your options
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-5">
            {/* Input Form - Left Column */}
            <div className="lg:col-span-2">
              <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/[0.06] dark:bg-white/[0.02]">
                <h2 className="mb-6 text-xl font-semibold text-slate-900 dark:text-white">Your Current Setup</h2>

                <div className="space-y-5">
                  {/* Number of Agents */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-white/80">
                      Support Agents
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="500"
                      value={numAgents}
                      onChange={(e) => setNumAgents(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:border-[#3872B9] focus:outline-none focus:ring-2 focus:ring-[#3872B9]/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-slate-500 dark:text-white/50">Full-time equivalent agents</p>
                  </div>

                  {/* Average Salary */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-white/80">
                      Average Annual Salary
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-white/50">$</span>
                      <input
                        type="number"
                        min="20000"
                        max="200000"
                        step="5000"
                        value={avgSalary}
                        onChange={(e) => setAvgSalary(Math.max(20000, parseInt(e.target.value) || 30000))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 pl-8 text-slate-900 focus:border-[#3872B9] focus:outline-none focus:ring-2 focus:ring-[#3872B9]/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-white/50">US avg: $45k-$65k</p>
                  </div>

                  {/* Monthly Email Volume */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-white/80">
                      Monthly Ticket Volume
                    </label>
                    <input
                      type="number"
                      min="50"
                      max="100000"
                      step="100"
                      value={monthlyEmails}
                      onChange={(e) => setMonthlyEmails(Math.max(50, parseInt(e.target.value) || 100))}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:border-[#3872B9] focus:outline-none focus:ring-2 focus:ring-[#3872B9]/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-slate-500 dark:text-white/50">Emails, chats, tickets combined</p>
                  </div>

                  {/* Current Tool Cost */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-white/80">
                      Current Tool Cost
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-white/50">$</span>
                      <input
                        type="number"
                        min="0"
                        max="500"
                        step="5"
                        value={currentToolCost}
                        onChange={(e) => setCurrentToolCost(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 pl-8 text-slate-900 focus:border-[#3872B9] focus:outline-none focus:ring-2 focus:ring-[#3872B9]/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-white/50">Per agent/month (Zendesk: $55-150)</p>
                  </div>

                  {/* Overhead Toggle */}
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 dark:bg-white/5">
                    <div>
                      <span className="text-sm font-medium text-slate-700 dark:text-white/80">Include overhead costs</span>
                      <p className="text-xs text-slate-500 dark:text-white/50">Benefits, taxes, equipment (+35%)</p>
                    </div>
                    <button
                      onClick={() => setIncludeOverhead(!includeOverhead)}
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        includeOverhead ? 'bg-[#3872B9]' : 'bg-slate-300 dark:bg-white/20'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                          includeOverhead ? 'left-[22px]' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Warnings */}
                {results.warnings.length > 0 && (
                  <div className="mt-5 space-y-2">
                    {results.warnings.map((warning, i) => (
                      <div key={i} className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                        <span className="mr-1.5">⚠️</span>{warning}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Results - Right Column */}
            <div className="space-y-6 lg:col-span-3">

              {/* Section 1: Current Costs */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/[0.06] dark:bg-white/[0.02]">
                <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
                  Your Support Costs Today
                </h3>

                {/* Productivity Indicator */}
                <div className="mb-5 rounded-lg bg-slate-50 p-4 dark:bg-white/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-slate-600 dark:text-white/60">Agent Productivity</span>
                      <div className="mt-0.5 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-900 dark:text-white">
                          {formatNumber(results.emailsPerAgent)}
                        </span>
                        <span className="text-sm text-slate-500 dark:text-white/50">tickets/agent/month</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm font-semibold ${results.productivityInfo.color}`}>
                        {results.productivityInfo.label}
                      </span>
                      <div className="text-xs text-slate-500 dark:text-white/50">
                        {formatPercent(results.productivityVsBenchmark)} vs avg (350)
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-white/50">
                    {results.productivityInfo.description}
                  </p>
                </div>

                {/* Cost Breakdown */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-white/60">Base Labor</span>
                    <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(results.baseLaborCost)}</span>
                  </div>
                  {includeOverhead && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-white/60">+ Benefits & Overhead</span>
                        <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(results.overheadCost)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-white/60">+ Turnover Costs</span>
                        <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(results.turnoverCost)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-white/60">Tools ({formatCurrency(currentToolCost)}/agent × 12mo)</span>
                    <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(results.annualToolCost)}</span>
                  </div>

                  <div className="border-t border-slate-200 pt-3 dark:border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 dark:text-white">Total Annual Cost</span>
                      <span className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(results.totalAnnualCost)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-white/60">Cost per Ticket</span>
                      <span className="font-semibold text-[#3872B9]">{formatCurrencyDecimal(results.costPerTicket)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Scenarios with AI */}
              <div className="rounded-2xl border-2 border-[#3872B9]/30 bg-gradient-to-br from-[#3872B9]/5 to-transparent p-6">
                <div className="mb-4 flex items-center gap-2">
                  <div className="rounded-lg bg-[#3872B9] px-2.5 py-1 text-xs font-semibold text-white">
                    With AI
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Your Options with Aidly</h3>
                </div>

                {/* Scenario Tabs */}
                <div className="mb-5 flex gap-1 rounded-lg bg-slate-100 p-1 dark:bg-white/10">
                  <button
                    onClick={() => setActiveScenario("growth")}
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      activeScenario === "growth"
                        ? "bg-white text-slate-900 shadow dark:bg-white/20 dark:text-white"
                        : "text-slate-600 hover:text-slate-900 dark:text-white/60 dark:hover:text-white"
                    }`}
                  >
                    Scale for Growth
                  </button>
                  <button
                    onClick={() => setActiveScenario("efficiency")}
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      activeScenario === "efficiency"
                        ? "bg-white text-slate-900 shadow dark:bg-white/20 dark:text-white"
                        : "text-slate-600 hover:text-slate-900 dark:text-white/60 dark:hover:text-white"
                    }`}
                  >
                    Reduce Costs
                  </button>
                  <button
                    onClick={() => setActiveScenario("quality")}
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      activeScenario === "quality"
                        ? "bg-white text-slate-900 shadow dark:bg-white/20 dark:text-white"
                        : "text-slate-600 hover:text-slate-900 dark:text-white/60 dark:hover:text-white"
                    }`}
                  >
                    Better Quality
                  </button>
                </div>

                {/* Growth Scenario */}
                {activeScenario === "growth" && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-white/70">
                      Keep your team and unlock {results.growthCapacityMultiple.toFixed(1)}× more capacity. Ready for growth without hiring.
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-lg bg-white/50 p-4 dark:bg-white/5">
                        <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-white/50">Current Capacity</span>
                        <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                          {formatNumber(monthlyEmails)}<span className="text-sm font-normal text-slate-500">/mo</span>
                        </div>
                      </div>
                      <div className="rounded-lg bg-[#3872B9]/10 p-4">
                        <span className="text-xs font-medium uppercase tracking-wide text-[#3872B9]">With Aidly</span>
                        <div className="mt-1 text-2xl font-bold text-[#3872B9]">
                          {formatNumber(results.capacityWithAI)}<span className="text-sm font-normal text-[#3872B9]/70">/mo</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-white/60">Team Size</span>
                        <span className="font-medium text-slate-900 dark:text-white">{numAgents} agents (no change)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-white/60">Annual Cost</span>
                        <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(results.growthTotalCost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-white/60">Cost per Ticket (current vol)</span>
                        <span className="font-medium text-slate-900 dark:text-white">{formatCurrencyDecimal(results.growthCostPerTicketAtCurrentVolume)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600 dark:text-white/60">Cost per Ticket (at capacity)</span>
                        <span className="font-semibold text-[#3872B9]">{formatCurrencyDecimal(results.growthCostPerTicketAtFullCapacity)}</span>
                      </div>
                    </div>

                    <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                      <p className="text-sm text-green-800 dark:text-green-200">
                        <strong>Growth-ready:</strong> If your volume doubles, you won&apos;t need to hire. Your cost per ticket drops to {formatCurrencyDecimal(results.growthCostPerTicketAtFullCapacity)} at full capacity.
                      </p>
                    </div>
                  </div>
                )}

                {/* Efficiency Scenario */}
                {activeScenario === "efficiency" && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-white/70">
                      Handle your current volume with fewer agents. {results.agentsReduced > 0
                        ? `Reduce from ${numAgents} to ${results.minAgentsNeeded} agents.`
                        : "Your team is already lean for this volume."}
                    </p>

                    {results.agentsReduced > 0 ? (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="rounded-lg bg-white/50 p-4 dark:bg-white/5">
                            <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-white/50">Current Team</span>
                            <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                              {numAgents} <span className="text-sm font-normal text-slate-500">agents</span>
                            </div>
                          </div>
                          <div className="rounded-lg bg-[#3872B9]/10 p-4">
                            <span className="text-xs font-medium uppercase tracking-wide text-[#3872B9]">With Aidly</span>
                            <div className="mt-1 text-2xl font-bold text-[#3872B9]">
                              {results.minAgentsNeeded} <span className="text-sm font-normal text-[#3872B9]/70">agents</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-white/60">Agents Reduced</span>
                            <span className="font-medium text-slate-900 dark:text-white">{results.agentsReduced}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-white/60">New Annual Cost</span>
                            <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(results.efficiencyTotalCost)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-600 dark:text-white/60">New Cost per Ticket</span>
                            <span className="font-medium text-slate-900 dark:text-white">{formatCurrencyDecimal(results.efficiencyCostPerTicket)}</span>
                          </div>
                        </div>

                        <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                          <div className="text-center">
                            <span className="text-sm text-green-800 dark:text-green-200">Annual Savings</span>
                            <div className="text-3xl font-bold text-green-700 dark:text-green-300">
                              {formatCurrency(results.efficiencySavings)}
                            </div>
                            <span className="text-sm text-green-600 dark:text-green-400">
                              {results.efficiencySavingsPercent.toFixed(0)}% cost reduction
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-slate-500 dark:text-white/50 italic">
                          Note: This scenario assumes reducing headcount. Consider the Growth scenario to keep your team and handle more volume instead.
                        </p>
                      </>
                    ) : (
                      <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          Your team of {numAgents} is already optimally sized (or smaller than needed) for {formatNumber(monthlyEmails)} tickets/month with AI assistance.
                          The <strong>Scale for Growth</strong> scenario may be more relevant for you.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Quality Scenario */}
                {activeScenario === "quality" && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-600 dark:text-white/70">
                      Same team, same volume—but dramatically better metrics and agent experience.
                    </p>

                    <div className="grid gap-3">
                      <div className="flex items-center gap-3 rounded-lg bg-white/50 p-3 dark:bg-white/5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3872B9]/10 text-lg">⚡</div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">50-70% Faster Response Times</div>
                          <div className="text-xs text-slate-500 dark:text-white/50">AI drafts responses instantly, agents just review and send</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg bg-white/50 p-3 dark:bg-white/5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3872B9]/10 text-lg">🎯</div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">Consistent Quality</div>
                          <div className="text-xs text-slate-500 dark:text-white/50">Every response follows your tone, policies, and best practices</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg bg-white/50 p-3 dark:bg-white/5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3872B9]/10 text-lg">😊</div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">Reduced Agent Burnout</div>
                          <div className="text-xs text-slate-500 dark:text-white/50">Less repetitive typing, more focus on complex issues</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 rounded-lg bg-white/50 p-3 dark:bg-white/5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3872B9]/10 text-lg">📈</div>
                        <div>
                          <div className="font-medium text-slate-900 dark:text-white">Better CSAT Scores</div>
                          <div className="text-xs text-slate-500 dark:text-white/50">Faster, more accurate responses = happier customers</div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg bg-slate-100 p-4 dark:bg-white/5">
                      <div className="text-sm text-slate-600 dark:text-white/70">
                        <strong>Annual investment:</strong> {formatCurrency(results.aidlyAnnualCost)} ({formatCurrency(results.aidlyMonthlyCost)}/month)
                      </div>
                      <div className="mt-1 text-sm text-slate-600 dark:text-white/70">
                        <strong>Per ticket:</strong> just {formatCurrencyDecimal(results.aidlyAnnualCost / (monthlyEmails * 12))} added per ticket
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: ROI Analysis */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/[0.06] dark:bg-white/[0.02]">
                <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
                  Is It Worth It?
                </h3>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-slate-50 p-4 text-center dark:bg-white/5">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-white/50">Break-even</div>
                    <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{results.breakEvenTickets}</div>
                    <div className="text-xs text-slate-500 dark:text-white/50">tickets/month</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4 text-center dark:bg-white/5">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-white/50">Payback Period</div>
                    <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                      {results.paybackDays < 30 ? `${results.paybackDays} days` : `${Math.ceil(results.paybackDays / 30)} mo`}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-white/50">at your volume</div>
                  </div>
                  <div className="rounded-lg bg-[#3872B9]/10 p-4 text-center">
                    <div className="text-xs font-medium uppercase tracking-wide text-[#3872B9]">Monthly ROI</div>
                    <div className="mt-1 text-2xl font-bold text-[#3872B9]">{results.monthlyROI.toFixed(1)}×</div>
                    <div className="text-xs text-[#3872B9]/70">return on cost</div>
                  </div>
                </div>

                <div className="mt-4 rounded-lg bg-slate-50 p-4 dark:bg-white/5">
                  <p className="text-sm text-slate-600 dark:text-white/70">
                    <strong>How we calculate this:</strong> At {formatCurrency(avgSalary)}/year, your agents cost ~{formatCurrencyDecimal(results.valueSavedPerTicket * 3)}/hour.
                    If AI saves ~20 minutes per ticket, that&apos;s {formatCurrencyDecimal(results.valueSavedPerTicket)} saved per ticket.
                    At {formatNumber(monthlyEmails)} tickets/month, Aidly ({formatCurrency(results.aidlyMonthlyCost)}/mo) pays for itself after just {results.breakEvenTickets} tickets.
                  </p>
                </div>

                <div className="mt-6">
                  <Link
                    href="/#pricing"
                    className="block w-full rounded-lg bg-[#3872B9] px-6 py-3 text-center font-semibold text-white transition-colors hover:bg-[#2d5a93]"
                  >
                    Try Aidly Free
                  </Link>
                  <p className="mt-2 text-center text-xs text-slate-500 dark:text-white/50">
                    5 free AI responses. No credit card required.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Methodology Note */}
          <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/[0.06] dark:bg-white/[0.02]">
            <h3 className="mb-3 text-lg font-semibold text-slate-900 dark:text-white">How This Calculator Works</h3>
            <div className="grid gap-6 text-sm text-slate-600 dark:text-white/70 md:grid-cols-2">
              <div>
                <h4 className="mb-2 font-medium text-slate-900 dark:text-white">Industry Benchmarks</h4>
                <ul className="space-y-1">
                  <li>• Average agent handles 350 tickets/month (email/chat)</li>
                  <li>• With AI assistance: 875 tickets/month (2.5× capacity)</li>
                  <li>• Overhead costs: ~35% on top of base salary</li>
                  <li>• Support turnover: ~35% annually, costs ~30% salary to replace</li>
                </ul>
              </div>
              <div>
                <h4 className="mb-2 font-medium text-slate-900 dark:text-white">Our Assumptions</h4>
                <ul className="space-y-1">
                  <li>• AI saves ~20 minutes per ticket (draft + research)</li>
                  <li>• Your team can realistically achieve 2-2.5× throughput</li>
                  <li>• Aidly replaces your current helpdesk tool cost</li>
                  <li>• Calculations are estimates—your results may vary</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Related Resources */}
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/[0.06] dark:bg-white/[0.02]">
            <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Related Resources</h2>
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
