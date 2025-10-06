import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { auth } from "@/lib/auth/server"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "")
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ""

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get("stripe-signature")

    if (!signature) {
      console.error("[Stripe Webhook] Missing signature")
      return NextResponse.json({ error: "Missing signature" }, { status: 400 })
    }

    if (!webhookSecret) {
      console.error("[Stripe Webhook] Missing webhook secret")
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error("[Stripe Webhook] Signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    console.log(`[Stripe Webhook] Processing event: ${event.type}`)

    // Forward to Better Auth's Stripe plugin handler
    try {
      await auth.handler({
        method: "POST",
        path: "/stripe/webhook",
        body: JSON.stringify(event),
        headers: {
          "content-type": "application/json",
        },
      } as any)

      console.log(`[Stripe Webhook] Successfully processed ${event.type}`)
      return NextResponse.json({ received: true })
    } catch (handlerError) {
      console.error(`[Stripe Webhook] Handler error for ${event.type}:`, handlerError)
      return NextResponse.json({ error: "Handler failed" }, { status: 500 })
    }

  } catch (error) {
    console.error("[Stripe Webhook] Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

