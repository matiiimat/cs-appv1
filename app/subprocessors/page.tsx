export default function SubprocessorsPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Subprocessors</h1>
      <p className="mt-3 text-muted-foreground">Last updated: {new Date().getFullYear()}</p>

      <section className="mt-8 space-y-6 text-sm leading-6">
        <p>
          In connection with providing the Aidly Service, we engage the following third-party subprocessors to process personal data on behalf of our customers. We ensure that all subprocessors are bound by data protection obligations consistent with our Data Processing Agreement and GDPR requirements.
        </p>

        <div className="overflow-x-auto mt-6">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-3 px-4 text-left font-semibold">Subprocessor</th>
                <th className="py-3 px-4 text-left font-semibold">Purpose</th>
                <th className="py-3 px-4 text-left font-semibold">Data Location</th>
                <th className="py-3 px-4 text-left font-semibold">Safeguards</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="py-3 px-4">
                  <div className="font-medium">Anthropic PBC</div>
                  <div className="text-xs text-muted-foreground">
                    <a href="https://www.anthropic.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">anthropic.com</a>
                  </div>
                </td>
                <td className="py-3 px-4">AI-powered message processing, triage, and response generation (Free and Plus plans only)</td>
                <td className="py-3 px-4">United States</td>
                <td className="py-3 px-4">Standard Contractual Clauses (SCCs), does not train on API data</td>
              </tr>
              <tr>
                <td className="py-3 px-4">
                  <div className="font-medium">Stripe, Inc.</div>
                  <div className="text-xs text-muted-foreground">
                    <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">stripe.com</a>
                  </div>
                </td>
                <td className="py-3 px-4">Payment processing and subscription management</td>
                <td className="py-3 px-4">United States, EU</td>
                <td className="py-3 px-4">Standard Contractual Clauses (SCCs), PCI DSS certified</td>
              </tr>
              <tr>
                <td className="py-3 px-4">
                  <div className="font-medium">Vercel Inc.</div>
                  <div className="text-xs text-muted-foreground">
                    <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">vercel.com</a>
                  </div>
                </td>
                <td className="py-3 px-4">Application hosting and infrastructure</td>
                <td className="py-3 px-4">United States, EU</td>
                <td className="py-3 px-4">Standard Contractual Clauses (SCCs), SOC 2 Type II</td>
              </tr>
              <tr>
                <td className="py-3 px-4">
                  <div className="font-medium">Neon (Neon, Inc.)</div>
                  <div className="text-xs text-muted-foreground">
                    <a href="https://neon.tech" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">neon.tech</a>
                  </div>
                </td>
                <td className="py-3 px-4">Database hosting and storage (PostgreSQL)</td>
                <td className="py-3 px-4">EU, United States</td>
                <td className="py-3 px-4">Encryption at rest and in transit, Standard Contractual Clauses (SCCs)</td>
              </tr>
              <tr>
                <td className="py-3 px-4">
                  <div className="font-medium">SendGrid (Twilio Inc.)</div>
                  <div className="text-xs text-muted-foreground">
                    <a href="https://sendgrid.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">sendgrid.com</a>
                  </div>
                </td>
                <td className="py-3 px-4">Transactional and outbound email delivery (magic links, notifications, customer emails)</td>
                <td className="py-3 px-4">United States</td>
                <td className="py-3 px-4">Standard Contractual Clauses (SCCs)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="text-lg font-semibold">AI Providers (Pro Plan - Customer-Configured)</h2>
          <p className="mt-2">
            If you are on the Pro plan and connect your own AI provider or endpoint (Bring Your Own Key), message content you select will be sent to that provider under your agreement with them. Your use of those providers is governed by their terms and privacy policies, and you are responsible for ensuring appropriate safeguards.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Subprocessor Changes</h2>
          <p className="mt-2">
            We may update this list from time to time. We will provide reasonable notice of material changes to our subprocessors, including the addition of new subprocessors or changes to existing ones. If you object to a new subprocessor, you may terminate your subscription in accordance with our Terms of Service.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">International Data Transfers</h2>
          <p className="mt-2">
            Where personal data is transferred from the EEA or UK to subprocessors located outside these regions (primarily the United States), we ensure appropriate safeguards are in place through Standard Contractual Clauses (SCCs) and additional security measures as required by GDPR Chapter V.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Contact</h2>
          <p className="mt-2">
            Questions about our subprocessors? Contact <a className="underline hover:text-primary" href="mailto:support@aidlyhq.com">support@aidlyhq.com</a>.
          </p>
        </div>
      </section>
    </main>
  )
}

