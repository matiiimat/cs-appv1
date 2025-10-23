export default function PrivacyPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-3 text-muted-foreground">Last updated: {new Date().getFullYear()}</p>
      <section className="mt-8 space-y-6 text-sm leading-6">
        <p>
          This Privacy Policy describes how Aidly (“we”, “us”) collects, uses, and safeguards information in connection with our
          customer support platform. The Service is intended for lawful business use by individuals 18+.
        </p>

        <div>
          <h2 className="text-lg font-semibold">Data Controller and Contact</h2>
          <p className="mt-2">
            For account, billing, and site usage data, the data controller is: <span className="font-medium">Aidly</span>, Paris, France.
            You can contact us at <a className="underline" href="mailto:support@aidly.me">support@aidly.me</a>.
          </p>
          <p className="mt-2">
            For customer message content processed on behalf of your organization, we act as a data processor under GDPR. See our
            <a className="underline ml-1" href="/dpa">Data Processing Agreement (DPA)</a> for details.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Information We Collect</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2">
            <li>
              <span className="font-medium">Account & Authentication:</span> email address to send magic‑link sign‑in; we may store your
              name and organization details. We do not require passwords.
            </li>
            <li>
              <span className="font-medium">Customer Messages (Processor role):</span> message content, subject, sender name/email, and
              metadata needed to deliver and process messages; sensitive message fields are encrypted at rest.
            </li>
            <li>
              <span className="font-medium">Billing:</span> payment details are processed by Stripe. We store subscription status and
              plan information, not full card data.
            </li>
            <li>
              <span className="font-medium">Technical:</span> basic logs (IP, user agent, timestamps) to operate and secure the service.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">How We Use Information (Legal Bases)</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2">
            <li>Provide and improve the platform, including AI‑based triage and agent workflows (performance of contract; legitimate interests).</li>
            <li>Authenticate users via magic‑link sign‑in and manage accounts (performance of contract).</li>
            <li>Send transactional emails (e.g., sign‑in links, receipts) (performance of contract/legal obligation).</li>
            <li>Optional non‑transactional marketing emails if you consent (consent; you can withdraw at any time).</li>
            <li>Maintain security, debug issues, and prevent abuse (legitimate interests).</li>
            <li>Comply with legal obligations (legal obligation).</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">AI Providers and BYO Keys</h2>
          <p className="mt-2">
            If you connect your own AI provider or endpoint, selected content may be sent to that provider under your configuration.
            Such processing is governed by that provider’s terms and privacy policy; you are responsible for ensuring lawful use and
            appropriate configuration.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Subprocessors and International Transfers</h2>
          <p className="mt-2">
            We use trusted vendors to deliver the Service (e.g., hosting, database, email, billing). See our
            <a className="underline ml-1" href="/subprocessors">Subprocessors</a> list. Where personal data is transferred outside the
            EEA/UK (e.g., to US‑based providers such as Stripe or email vendors), we implement appropriate safeguards like Standard
            Contractual Clauses and additional measures as needed.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Security</h2>
          <p className="mt-2">
            We use encryption in transit and at rest for sensitive fields, access controls, and monitoring. No method is 100%
            secure, but we take reasonable measures to protect your data.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Sensitive/Prohibited Data</h2>
          <p className="mt-2">
            The Service is not designed for special categories of data under GDPR (e.g., health, biometric, children’s data), payment
            card data (PCI), or government identifiers. Do not submit such data unless expressly agreed in writing with additional
            safeguards.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Data Retention</h2>
          <p className="mt-2">
            We retain data for as long as needed to provide the Service and meet legal obligations. We follow industry‑standard
            retention practices and document details in our <a className="underline" href="/dpa">DPA</a>. You may request deletion of your
            organization&apos;s data by contacting support.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Your Rights</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2">
            <li>Access, rectification, erasure, restriction, portability, and objection (subject to legal limits).</li>
            <li>To exercise your rights, contact <a className="underline" href="mailto:support@aidly.me">support@aidly.me</a>.</li>
            <li>You have the right to lodge a complaint with your local authority. In France: <a className="underline" href="https://www.cnil.fr/">CNIL</a>.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Cookies</h2>
          <p className="mt-2">
            We keep cookies minimal and do not use third‑party analytics cookies at launch. See our
            <a className="underline ml-1" href="/cookies">Cookies Policy</a> for details.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Contact</h2>
          <p className="mt-2">
            Questions? Email <a className="underline" href="mailto:support@aidly.me">support@aidly.me</a>.
          </p>
        </div>
      </section>
    </main>
  )
}
