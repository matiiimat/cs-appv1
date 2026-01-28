import CostCalculator from "./calculator"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Customer Support Cost Calculator (Free Tool) - Calculate Team ROI | Aidly",
  description: "Free customer support cost calculator. Compare hiring vs outsourcing vs AI. Calculate your team's total costs, cost per ticket, and potential savings. Industry benchmarks included.",
  keywords: [
    "customer support cost calculator",
    "support team cost",
    "cost per ticket calculator",
    "customer service ROI calculator",
    "support team budget calculator",
    "helpdesk cost calculator",
    "email support cost",
    "cheap email support",
    "affordable customer support",
    "hiring vs AI support"
  ],
  openGraph: {
    title: "Customer Support Cost Calculator - Free Tool",
    description: "Calculate your support team costs and discover potential savings with AI-assisted support.",
    type: "website",
  },
}

export default function CostCalculatorPage() {
  return <CostCalculator />
}
