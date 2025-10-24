export default function SubprocessorsPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Subprocessors</h1>
      <p className="mt-3 text-muted-foreground">Last updated: {new Date().getFullYear()}</p>

      <section className="mt-8 space-y-6 text-sm leading-6">
        <p>
          We engage certain third parties as subprocessors to help us deliver the Service. We impose data protection obligations on
          these providers and remain responsible for their performance. Depending on your configuration, some providers may only apply
          when enabled.
        </p>

        <div>
          <h2 className="text-lg font-semibold">Core Infrastructure</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2">
            <li>Cloud hosting and runtime (e.g., managed cloud providers) – infrastructure and application hosting.</li>
            <li>Managed PostgreSQL database – storage of application data with encryption and backups.</li>
            <li>Logging/monitoring – operational logs and metrics to maintain and secure the Service.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Email Delivery</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2">
            <li>Transactional email provider: SendGrid – outbound/inbound email.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Payments</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2">
            <li>Stripe – subscription billing and payment processing.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">AI Providers (Optional, Customer‑Configured)</h2>
          <p className="mt-2">
            If you choose to connect your own AI provider or endpoint, message content you select may be sent to that provider under
            your agreement with them. Examples include OpenAI or self‑hosted/local endpoints you configure. Your use of those providers
            is governed by their terms and privacy policies.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Updates</h2>
          <p className="mt-2">
            We may update this list as our Service evolves. For material changes, we will provide notice where appropriate.
          </p>
        </div>
      </section>
    </main>
  )
}

