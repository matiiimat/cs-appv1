export default function PrivacyPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-3 text-muted-foreground">Last updated: {new Date().getFullYear()}</p>
      <section className="mt-8 space-y-6 text-sm leading-6">
        <p>
          This Privacy Policy describes how Aidly (“we”, “us”) collects, uses, and safeguards
          information in connection with our customer support platform.
        </p>

        <div>
          <h2 className="text-lg font-semibold">Information We Collect</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2">
            <li>
              <span className="font-medium">Account & Authentication:</span> email address to send magic-link sign-in. We may store
              your name and organization details. We do not require passwords.
            </li>
            <li>
              <span className="font-medium">Customer Messages:</span> email content, subject, sender name/email, and metadata needed to
              deliver and process messages. Sensitive message fields are encrypted at rest.
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
          <h2 className="text-lg font-semibold">How We Use Information</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2">
            <li>Provide and improve the platform, including AI-based triage and agent workflows.</li>
            <li>Authenticate users via magic-link sign-in.</li>
            <li>Send transactional emails (e.g., sign-in links, receipts).</li>
            <li>Maintain security, debug issues, and prevent abuse.</li>
            <li>Comply with legal obligations.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Subprocessors</h2>
          <p className="mt-2">We use trusted vendors to deliver the service:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            <li>Stripe (billing and payments)</li>
            <li>Transactional email provider (e.g., SendGrid/Brevo/Postmark) for outbound and inbound email</li>
            <li>Cloud hosting and database providers</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Data Retention</h2>
          <p className="mt-2">
            We retain data for as long as needed to provide the service and meet legal obligations. You may request deletion of
            your organization&apos;s data by contacting support.
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
          <h2 className="text-lg font-semibold">Your Rights</h2>
          <p className="mt-2">
            Depending on your location, you may have rights to access, rectify, or delete your data. Contact us to exercise these
            rights.
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
