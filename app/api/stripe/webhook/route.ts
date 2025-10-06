import { NextRequest } from "next/server"
import { auth } from "@/lib/auth/server"

export async function POST(req: NextRequest) {
  // Better Auth's Stripe plugin handles webhook verification and processing
  // Just forward the request to the auth handler
  return auth.handler(req)
}

