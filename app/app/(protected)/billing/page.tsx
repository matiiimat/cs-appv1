import { redirect } from "next/navigation"

export default function BillingRedirect() {
  // Redirect to the billing section in settings
  // The actual billing UI is now integrated into the settings page
  redirect("/app?view=settings&section=billing")
}
