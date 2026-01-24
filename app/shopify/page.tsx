import ShopifyLandingPageClient from "./shopify-client"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Shopify Customer Support | AI-Powered Helpdesk with Native Shopify Integration | Aidly",
  description: "Native Shopify integration with AI-powered email support. See order history, tracking, and customer LTV in every ticket. 2-minute setup. Try 5 emails free. $208/month vs $900 for Gorgias.",
  keywords: [
    "shopify customer support",
    "shopify helpdesk",
    "shopify email support",
    "shopify support software",
    "gorgias alternative",
    "shopify customer service",
    "shopify support app",
    "ai shopify support",
    "shopify order lookup",
    "shopify support integration"
  ],
  openGraph: {
    title: "Customer Support Built for Shopify Stores | Aidly",
    description: "AI-powered email support with native Shopify integration. See orders, tracking, and LTV in every ticket. 1/3 the price of Gorgias.",
    type: "website",
  },
}

export default function ShopifyLandingPage() {
  return <ShopifyLandingPageClient />
}
