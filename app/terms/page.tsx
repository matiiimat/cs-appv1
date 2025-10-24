export default function TermsPage() {
  return (
    <main className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">Terms of Service</h1>
      <p className="mt-3 text-muted-foreground">Last updated: {new Date().getFullYear()}</p>

      <section className="mt-8 space-y-6 text-sm leading-6">
        <div>
          <h2 className="text-lg font-semibold">1. Acceptance</h2>
          <p className="mt-2">
            By accessing or using Aidly (the “Service”), you agree to these Terms. If you do not agree, do not use the Service. We may update these Terms from time to time; material changes are effective upon posting. Continued use constitutes acceptance.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">2. The Service</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2">
            <li>Aidly helps teams triage inbound messages, generate AI‑assisted drafts, and send outbound email replies.</li>
            <li>AI output can be inaccurate or incomplete. You remain responsible for reviewing and approving content before sending.</li>
            <li>The Service integrates with providers (e.g., Stripe, email vendors, hosting, optional AI providers you configure). Use of those providers is subject to their own terms.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">3. Eligibility, Accounts, and Organizations</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2">
            <li>The Service is intended for lawful business use by individuals 18+.</li>
            <li>Each organization controls its users and roles. You are responsible for activity under your organization and for safeguarding access.</li>
            <li>Access uses email-based magic links. Keep your email account secure.</li>
            <li>Demo mode is for evaluation only; do not use with production data.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">4. Customer Content and License</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2">
            <li>You retain ownership of content you and your customers provide (e.g., emails, subjects, attachments, metadata).</li>
            <li>You grant us a limited, worldwide, non‑exclusive, revocable, royalty‑free license to host, process, and transmit content solely to provide the Service (including receiving, storing, encrypting, analyzing for triage, and sending emails).</li>
            <li>Bring‑Your‑Own AI Keys: If you connect your own AI provider or endpoint, you authorize sending content to that provider. Such use is under that provider’s terms and privacy practices; you are responsible for configuring and complying with them.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">5. Data Protection (EU/FR)</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2">
            <li>For personal data in your content, you act as controller and we act as processor under GDPR.</li>
            <li>A <a className="underline" href="/dpa">Data Processing Agreement</a> (including a <a className="underline" href="/subprocessors">subprocessor list</a>) governs processing, international transfers, and data subject rights.</li>
            <li>Where data is transferred outside the EEA/UK, we implement appropriate safeguards (e.g., SCCs) with our subprocessors.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">6. Sensitive/Prohibited Data</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2">
            <li>Do not upload special categories of data under GDPR (e.g., health, biometric, children’s data), payment card data (PCI), or government identifiers unless expressly agreed in writing with additional safeguards.</li>
            <li>You must have a lawful basis to process personal data and must not use the Service for unlawful, harmful, or deceptive content, spam, malware, or rights violations.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">7. Email Compliance</h2>
          <p className="mt-2">You are responsible for complying with applicable email and marketing laws (e.g., consent, opt‑outs under GDPR/PECR/CAN‑SPAM where applicable) when contacting recipients.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">8. Privacy and Security</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2">
            <li>Our <a className="underline" href="/privacy">Privacy Policy</a> explains how we collect and use personal data.</li>
            <li>We use reasonable safeguards including encryption in transit and encryption at rest for sensitive fields, access controls, and monitoring. No method is 100% secure; you are responsible for your users and environment.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">9. Billing and Subscriptions</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2">
            <li>Paid subscriptions renew automatically until canceled. Billing is processed by Stripe; you authorize recurring charges for fees and applicable taxes.</li>
            <li>Refunds: 14‑day satisfaction guarantee on the first subscription charge. Request within 14 days of initial purchase for a full refund. After 14 days, cancellations take effect at the end of the current billing period (month or year); no refunds for partial periods or renewals.</li>
            <li>You may cancel anytime via your account; access continues through the paid period.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">10. Availability, Support, and Changes</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2">
            <li>We strive for high availability but do not guarantee uninterrupted service.</li>
            <li>Best‑effort support during business hours; no formal SLA unless agreed in writing.</li>
            <li>We may modify or discontinue features with reasonable notice where practical.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">11. Intellectual Property</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2">
            <li>The Service (software, designs, trademarks) is owned by us or our licensors.</li>
            <li>You grant us a perpetual, worldwide, royalty‑free license to use feedback to improve the Service.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">12. Confidentiality</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2">
            <li>“Confidential Information” means non‑public information disclosed by either party that is marked confidential or would reasonably be considered confidential.</li>
            <li>Each party will use the other’s Confidential Information only to perform under these Terms and protect it using reasonable measures, subject to standard exceptions (public, already known, independently developed, or legally required).</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">13. Disclaimers</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2">
            <li>The Service and AI features are provided “as is” and “as available”. We disclaim all warranties to the fullest extent permitted by law, including merchantability, fitness for a particular purpose, and non‑infringement.</li>
            <li>You are responsible for any decisions or communications based on AI‑assisted content.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">14. Limitation of Liability</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2">
            <li>To the maximum extent permitted by law, neither party is liable for indirect, incidental, special, consequential, or punitive damages.</li>
            <li>Our aggregate liability arising out of or related to the Service will not exceed the fees you paid in the 12 months preceding the claim.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">15. Indemnification</h2>
          <p className="mt-2">You will indemnify and hold us harmless from claims arising from your content, your use of the Service (including emails you send), or your violation of these Terms or applicable law.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">16. Term and Termination</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2">
            <li>These Terms remain in effect while you use the Service.</li>
            <li>We may suspend or terminate for violations, nonpayment, or risks to the Service. You may terminate by canceling your subscription and ceasing use.</li>
            <li>Upon termination, access ceases. We may retain data as required by law or for legitimate business needs; you may request export or deletion subject to our data retention practices.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold">17. Data Retention</h2>
          <p className="mt-2">We retain content for the duration of your subscription and for a limited period thereafter to meet legal and operational needs (e.g., backups and logs). We follow industry‑standard retention windows and document them in our DPA/subprocessor disclosures. You may request deletion consistent with our Privacy Policy and DPA.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">18. Governing Law and Venue</h2>
          <p className="mt-2">These Terms are governed by the laws of France. The courts of Paris, France shall have exclusive jurisdiction, subject to any mandatory consumer protection laws if you qualify as a consumer (the Service is intended for business use).</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold">19. Miscellaneous</h2>
          <ul className="mt-2 list-disc pl-5 space-y-2">
            <li>These Terms, order forms, the <a className="underline" href="/privacy">Privacy Policy</a>, and the <a className="underline" href="/dpa">DPA</a> constitute the entire agreement.</li>
            <li>You may not assign these Terms without our consent; we may assign in connection with a merger, acquisition, or sale.</li>
            <li>If any provision is unenforceable, the remainder remains in effect. Failure to enforce is not a waiver.</li>
            <li>We may provide notices to your account email; you may contact us at <a className="underline" href="mailto:support@aidly.me">support@aidly.me</a>.</li>
          </ul>
        </div>
      </section>
    </main>
  )
}
