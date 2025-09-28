import { NextResponse } from "next/server"

export async function POST() {
  return NextResponse.json({ error: "Stripe webhook pending integration" }, { status: 501 })
}

