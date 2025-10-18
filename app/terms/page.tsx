export default function TermsPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Terms of Service</h1>
      <p className="mt-3 text-muted-foreground">Last updated: {new Date().getFullYear()}</p>
      <section className="mt-8 space-y-6 text-sm leading-6">
        <div>
          <h2 className="text-lg font-semibold">Acceptance of Terms</h2>
          <p className="mt-2">
            By accessing or using Aidly (the "Service"), you agree to these Terms. If you do not agree, do not use the Service.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Accounts & Access</h2>
          <p className="mt-2">
            You must provide accurate information and use the Service in compliance with applicable laws. Access is via email-based
            magic links; you are responsible for securing access to your email account.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Acceptable Use</h2>
          <p className="mt-2">
            Do not abuse, disrupt, or reverse engineer the Service, or violate others&apos; rights. We may suspend or terminate accounts
            for violations.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Subscriptions & Billing</h2>
          <p className="mt-2">
            Paid subscriptions renew automatically until canceled. Billing is handled by Stripe and subject to their terms. You may
            cancel at any time; access continues until the end of the paid period.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Customer Content</h2>
          <p className="mt-2">
            You retain ownership of your content. You grant us a limited license to process content as necessary to provide the
            Service (e.g., receiving, storing, encrypting, analyzing for triage, and sending emails).
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Privacy</h2>
          <p className="mt-2">
            Our <a className="underline" href="/privacy">Privacy Policy</a> explains how we handle personal data.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Availability & Changes</h2>
          <p className="mt-2">
            We strive for high availability but do not guarantee uninterrupted service. We may modify features or these Terms. Continued
            use signifies acceptance.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Limitation of Liability</h2>
          <p className="mt-2">
            To the extent permitted by law, we are not liable for indirect or consequential damages. Our total liability related to the
            Service will not exceed the fees paid in the preceding 12 months.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Contact</h2>
          <p className="mt-2">
            Questions about these Terms? Email <a className="underline" href="mailto:support@aidly.me">support@aidly.me</a>.
          </p>
        </div>
      </section>
    </main>
  )
}
