"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"

export default function PrivacyPage() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    setIsDark(mediaQuery.matches)
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return (
    <div className={`min-h-screen antialiased ${isDark ? 'dark' : ''}`}>
      <div className="min-h-screen bg-[#FAFBFC] text-slate-900 dark:bg-[#0A0A0B] dark:text-white">
        {/* Navigation */}
        <nav className="border-b border-slate-200 bg-white dark:border-white/[0.06] dark:bg-[#0A0A0B]">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
              <Image src="/logo-60x.png" alt="Aidly" width={28} height={28} className="rounded-lg" />
              <span className="text-lg font-semibold tracking-tight">Aidly</span>
            </Link>
          </div>
        </nav>

        <main className="mx-auto max-w-3xl px-6 py-12">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Privacy Policy</h1>
          <p className="mt-3 text-slate-500 dark:text-white/50">Last updated: January 2026</p>

          <section className="mt-8 space-y-6 text-sm leading-6 text-slate-600 dark:text-white/70">
            <p>
              This Privacy Policy describes how Aidly (&quot;we&quot;, &quot;us&quot;) collects, uses, and safeguards information in connection with our
              customer support platform. The Service is intended for lawful business use by individuals 18+.
            </p>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Data Controller and Contact</h2>
              <p className="mt-2">
                For account, billing, and site usage data, the data controller is: <span className="font-medium">Aidly, Paris, France</span>.
                You can contact us at <a className="text-[#3872B9] underline hover:text-[#B33275]" href="mailto:support@aidlyhq.com">support@aidlyhq.com</a>.
              </p>
              <p className="mt-2">
                For customer message content processed on behalf of your organization, we act as a data processor under GDPR. See our
                <Link className="text-[#3872B9] underline hover:text-[#B33275] ml-1" href="/dpa">Data Processing Agreement (DPA)</Link> for details.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Information We Collect</h2>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li>
                  <span className="font-medium text-slate-900 dark:text-white">Account & Authentication:</span> email address to send magic‑link sign‑in; we may store your
                  name and organization details. We do not require passwords.
                </li>
                <li>
                  <span className="font-medium text-slate-900 dark:text-white">Customer Messages (Processor role):</span> message content, subject, sender name/email, and
                  metadata needed to deliver and process messages; sensitive message fields are encrypted at rest.
                </li>
                <li>
                  <span className="font-medium text-slate-900 dark:text-white">Billing:</span> payment details are processed by Stripe. We store subscription status and
                  plan information, not full card data.
                </li>
                <li>
                  <span className="font-medium text-slate-900 dark:text-white">Technical:</span> basic logs (IP, user agent, timestamps) to operate and secure the service.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">How We Use Information (Legal Bases)</h2>
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
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">AI Providers and Processing</h2>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li>
                  <span className="font-medium text-slate-900 dark:text-white">Free and Plus Plans:</span> We use Anthropic Claude to process message content for AI-assisted triage and response generation. Message content is sent to Anthropic&apos;s API under their <a className="text-[#3872B9] underline hover:text-[#B33275]" href="https://www.anthropic.com/legal/commercial-terms" target="_blank" rel="noopener noreferrer">Commercial Terms</a> and <a className="text-[#3872B9] underline hover:text-[#B33275]" href="https://www.anthropic.com/legal/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>. Anthropic does not train on data submitted via their API.
                </li>
                <li>
                  <span className="font-medium text-slate-900 dark:text-white">Pro Plan (Bring Your Own Key):</span> If you configure your own AI provider or API key, selected content is sent directly to that provider under your account. Such processing is governed by that provider&apos;s terms and privacy policy; you are responsible for ensuring lawful use and appropriate configuration.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Subprocessors and International Transfers</h2>
              <p className="mt-2">
                We use trusted vendors to deliver the Service (e.g., hosting, database, email, billing). See our
                <Link className="text-[#3872B9] underline hover:text-[#B33275] ml-1" href="/subprocessors">Subprocessors</Link> list. Where personal data is transferred outside the
                EEA/UK (e.g., to US‑based providers such as Stripe or email vendors), we implement appropriate safeguards like Standard
                Contractual Clauses and additional measures as needed.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Security</h2>
              <p className="mt-2">
                We use encryption in transit and at rest for sensitive fields, access controls, and monitoring. No method is 100%
                secure, but we take reasonable measures to protect your data.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Sensitive/Prohibited Data</h2>
              <p className="mt-2">
                The Service is not designed for special categories of data under GDPR (e.g., health, biometric, children&apos;s data), payment
                card data (PCI), or government identifiers. Do not submit such data unless expressly agreed in writing with additional
                safeguards.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Data Retention</h2>
              <p className="mt-2">
                We retain data according to the following schedule:
              </p>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li><span className="font-medium text-slate-900 dark:text-white">Active subscription:</span> Message content and account data are retained during your active subscription.</li>
                <li><span className="font-medium text-slate-900 dark:text-white">Account deletion:</span> Upon account deletion, all data is immediately removed from production systems. Backups are automatically purged within 30 days.</li>
                <li><span className="font-medium text-slate-900 dark:text-white">Audit logs:</span> Security and activity logs are retained for 1 year for security and compliance purposes. These may be retained after account deletion as required for legal and security obligations.</li>
                <li><span className="font-medium text-slate-900 dark:text-white">Billing records:</span> Retained as required by French tax law (typically 10 years), even after account deletion.</li>
              </ul>
              <p className="mt-2">
                You may delete your account and request deletion of your organization&apos;s data at any time through your account settings, or by contacting <a className="text-[#3872B9] underline hover:text-[#B33275]" href="mailto:support@aidlyhq.com">support@aidlyhq.com</a>. Data is immediately deleted from production systems, subject to legal retention requirements for billing and audit records.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Law Enforcement and Legal Compliance</h2>
              <p className="mt-2">
                We may disclose personal data when required or permitted by law, including:
              </p>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li><span className="font-medium text-slate-900 dark:text-white">Legal Requests:</span> We respond to valid legal requests from French, EU, and other law enforcement or regulatory authorities, including court orders, subpoenas, search warrants, and national security requests where legally required.</li>
                <li><span className="font-medium text-slate-900 dark:text-white">Illegal Activity:</span> We may investigate and disclose information to authorities when we reasonably believe an account is engaged in illegal activity, fraud, money laundering, or violations of sanctions or counter-terrorism financing laws.</li>
                <li><span className="font-medium text-slate-900 dark:text-white">Regulatory Compliance:</span> We cooperate with CNIL (French data protection authority), financial regulators, and other government agencies as required by French and EU law.</li>
                <li><span className="font-medium text-slate-900 dark:text-white">Data Preservation:</span> We may preserve account data for law enforcement or regulatory investigations as required by law, even after account termination. In some cases, we may be prohibited by law from notifying you of such preservation or disclosure.</li>
                <li><span className="font-medium text-slate-900 dark:text-white">Safety and Security:</span> We may disclose information to protect the rights, property, or safety of Aidly, our users, or the public as permitted by applicable law.</li>
              </ul>
              <p className="mt-2">
                When responding to legal requests, we review each request for legal sufficiency and may challenge overbroad or inappropriate requests. We balance our legal obligations with our commitment to protecting user privacy.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Your Rights</h2>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li><span className="font-medium text-slate-900 dark:text-white">Data Subject Rights:</span> You have the right to access, rectification, erasure, restriction, portability, and objection (subject to legal limits).</li>
                <li><span className="font-medium text-slate-900 dark:text-white">Right to Erasure (Data Deletion):</span> You can delete your account and all associated data at any time through your account settings. Data is immediately deleted from production systems. Backups are automatically purged within 30 days. Billing and audit records may be retained as required by law. In cases of ongoing legal or regulatory investigations, we may be required to retain data beyond normal retention periods.</li>
                <li><span className="font-medium text-slate-900 dark:text-white">Consent Withdrawal:</span> For optional marketing communications, you may withdraw consent at any time via unsubscribe links. To withdraw consent for the Service entirely, delete your account via your account settings or by contacting support.</li>
                <li><span className="font-medium text-slate-900 dark:text-white">Exercising Your Rights:</span> Contact <a className="text-[#3872B9] underline hover:text-[#B33275]" href="mailto:support@aidlyhq.com">support@aidlyhq.com</a> to exercise any of your rights, or use the self-service options in your account settings. In some cases, we may be unable to fulfill requests due to legal obligations or ongoing investigations.</li>
                <li><span className="font-medium text-slate-900 dark:text-white">Complaints:</span> You have the right to lodge a complaint with your local supervisory authority. In France: <a className="text-[#3872B9] underline hover:text-[#B33275]" href="https://www.cnil.fr/" target="_blank" rel="noopener noreferrer">CNIL</a>.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Cookies</h2>
              <p className="mt-2">
                This website does not use cookies or similar tracking technologies. We do not place any cookies on your device for analytics, advertising, or any other purpose.
              </p>
              <p className="mt-2">
                Your browser may store essential session data required for authentication (magic link sign‑in), but this is strictly limited to functional requirements and does not track your activity across the site or other websites.
              </p>
              <p className="mt-2">
                As we do not use cookies, no cookie consent banner is required or displayed. If we introduce cookies in the future, we will update this policy and implement appropriate consent mechanisms in compliance with GDPR and French law (CNIL requirements).
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Contact</h2>
              <p className="mt-2">
                Questions? Email <a className="text-[#3872B9] underline hover:text-[#B33275]" href="mailto:support@aidlyhq.com">support@aidlyhq.com</a>.
              </p>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-8 dark:border-white/[0.06] dark:bg-transparent">
          <div className="mx-auto max-w-3xl px-6">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="flex items-center gap-2">
                <Image src="/logo-60x.png" alt="Aidly" width={20} height={20} className="rounded-lg" />
                <span className="text-sm text-slate-500 dark:text-white/40">© {new Date().getFullYear()} Aidly</span>
              </div>
              <div className="flex items-center gap-6 text-sm text-slate-500 dark:text-white/40">
                <Link href="/legal-notice" className="transition-colors hover:text-slate-900 dark:hover:text-white">Legal Notice</Link>
                <Link href="/privacy" className="transition-colors hover:text-slate-900 dark:hover:text-white">Privacy</Link>
                <Link href="/terms" className="transition-colors hover:text-slate-900 dark:hover:text-white">Terms</Link>
                <Link href="/dpa" className="transition-colors hover:text-slate-900 dark:hover:text-white">DPA</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
