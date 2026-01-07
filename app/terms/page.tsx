"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"

export default function TermsPage() {
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Terms of Service</h1>
          <p className="mt-3 text-slate-500 dark:text-white/50">Last updated: {new Date().getFullYear()}</p>

          <section className="mt-8 space-y-6 text-sm leading-6 text-slate-600 dark:text-white/70">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">1. Acceptance</h2>
              <p className="mt-2">
                By accessing or using Aidly (the &quot;Service&quot;), you agree to these Terms. If you do not agree, do not use the Service. We may update these Terms from time to time; material changes are effective upon posting. Continued use constitutes acceptance.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">2. The Service</h2>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li>Aidly helps teams triage inbound messages, generate AI‑assisted drafts, and send outbound email replies.</li>
                <li>AI output can be inaccurate or incomplete. You remain responsible for reviewing and approving content before sending.</li>
                <li>The Service integrates with providers (e.g., Stripe, email vendors, hosting, optional AI providers you configure). Use of those providers is subject to their own terms.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">3. Eligibility, Accounts, and Organizations</h2>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li>The Service is intended for lawful business use by individuals 18+.</li>
                <li>Each organization controls its users and roles. You are responsible for activity under your organization and for safeguarding access.</li>
                <li>Access uses email-based magic links. Keep your email account secure.</li>
                <li>Demo mode is for evaluation only; do not use with production data.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">4. Customer Content and License</h2>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li>You retain ownership of content you and your customers provide (e.g., emails, subjects, attachments, metadata).</li>
                <li>You grant us a limited, worldwide, non‑exclusive, revocable, royalty‑free license to host, process, and transmit content solely to provide the Service (including receiving, storing, encrypting, analyzing for triage, and sending emails).</li>
                <li>Bring‑Your‑Own AI Keys: If you connect your own AI provider or endpoint, you authorize sending content to that provider. Such use is under that provider&apos;s terms and privacy practices; you are responsible for configuring and complying with them.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">5. Data Protection (EU/FR)</h2>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li>For personal data in your content, you act as controller and we act as processor under GDPR.</li>
                <li>A <Link className="text-[#3872B9] underline hover:text-[#B33275]" href="/dpa">Data Processing Agreement</Link> (including a <Link className="text-[#3872B9] underline hover:text-[#B33275]" href="/subprocessors">subprocessor list</Link>) governs processing, international transfers, and data subject rights.</li>
                <li>Where data is transferred outside the EEA/UK, we implement appropriate safeguards (e.g., SCCs) with our subprocessors.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">6. Sensitive/Prohibited Data</h2>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li>Do not upload special categories of data under GDPR (e.g., health, biometric, children&apos;s data), payment card data (PCI), or government identifiers unless expressly agreed in writing with additional safeguards.</li>
                <li>You must have a lawful basis to process personal data and must not use the Service for unlawful, harmful, or deceptive content, spam, malware, or rights violations.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">7. Email Compliance</h2>
              <p className="mt-2">You are responsible for complying with applicable email and marketing laws (e.g., consent, opt‑outs under GDPR/PECR/CAN‑SPAM where applicable) when contacting recipients.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">8. Privacy and Security</h2>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li>Our <Link className="text-[#3872B9] underline hover:text-[#B33275]" href="/privacy">Privacy Policy</Link> explains how we collect and use personal data.</li>
                <li>We use reasonable safeguards including encryption in transit and encryption at rest for sensitive fields, access controls, and monitoring. No method is 100% secure; you are responsible for your users and environment.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">9. Billing and Subscriptions</h2>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li>Paid subscriptions renew automatically until canceled. Billing is processed by Stripe; you authorize recurring charges for fees and applicable taxes.</li>
                <li>You may cancel anytime via your account; access continues through the paid period.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">10. Availability, Support, and Changes</h2>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li>We strive for high availability but do not guarantee uninterrupted service.</li>
                <li>Best‑effort support during business hours; no formal SLA unless agreed in writing.</li>
                <li>We may modify or discontinue features with reasonable notice where practical.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">11. Intellectual Property</h2>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li>The Service (software, designs, trademarks) is owned by us or our licensors.</li>
                <li>You grant us a perpetual, worldwide, royalty‑free license to use feedback to improve the Service.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">12. Confidentiality</h2>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li>&quot;Confidential Information&quot; means non‑public information disclosed by either party that is marked confidential or would reasonably be considered confidential.</li>
                <li>Each party will use the other&apos;s Confidential Information only to perform under these Terms and protect it using reasonable measures, subject to standard exceptions (public, already known, independently developed, or legally required).</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">13. Disclaimers</h2>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li>The Service and AI features are provided &quot;as is&quot; and &quot;as available&quot;. We disclaim all warranties to the fullest extent permitted by law, including merchantability, fitness for a particular purpose, and non‑infringement.</li>
                <li>You are responsible for any decisions or communications based on AI‑assisted content.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">14. Limitation of Liability</h2>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li>To the maximum extent permitted by law, neither party is liable for indirect, incidental, special, consequential, or punitive damages.</li>
                <li>Our aggregate liability arising out of or related to the Service will not exceed the fees you paid in the 12 months preceding the claim.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">15. Indemnification</h2>
              <p className="mt-2">You will indemnify and hold us harmless from claims arising from your content, your use of the Service (including emails you send), or your violation of these Terms or applicable law.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">16. Term and Termination</h2>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li>These Terms remain in effect while you use the Service.</li>
                <li>We may suspend or terminate for violations, nonpayment, or risks to the Service. You may terminate by canceling your subscription and ceasing use.</li>
                <li>Upon termination, access ceases. We may retain data as required by law or for legitimate business needs; you may request export or deletion subject to our data retention practices.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">17. Data Retention</h2>
              <p className="mt-2">We retain content for the duration of your subscription and for a limited period thereafter to meet legal and operational needs (e.g., backups and logs). We follow industry‑standard retention windows and document them in our DPA/subprocessor disclosures. You may request deletion consistent with our Privacy Policy and DPA.</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">18. Governing Law and Venue</h2>
              <p className="mt-2">These Terms are governed by the laws of France. The courts of Paris, France shall have exclusive jurisdiction, subject to any mandatory consumer protection laws if you qualify as a consumer (the Service is intended for business use).</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">19. Miscellaneous</h2>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li>These Terms, order forms, the <Link className="text-[#3872B9] underline hover:text-[#B33275]" href="/privacy">Privacy Policy</Link>, and the <Link className="text-[#3872B9] underline hover:text-[#B33275]" href="/dpa">DPA</Link> constitute the entire agreement.</li>
                <li>You may not assign these Terms without our consent; we may assign in connection with a merger, acquisition, or sale.</li>
                <li>If any provision is unenforceable, the remainder remains in effect. Failure to enforce is not a waiver.</li>
                <li>We may provide notices to your account email; you may contact us at <a className="text-[#3872B9] underline hover:text-[#B33275]" href="mailto:support@aidlyhq.com">support@aidlyhq.com</a>.</li>
              </ul>
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
                <Link href="/privacy" className="transition-colors hover:text-slate-900 dark:hover:text-white">Privacy</Link>
                <Link href="/terms" className="transition-colors hover:text-slate-900 dark:hover:text-white">Terms</Link>
                <Link href="/careers" className="transition-colors hover:text-slate-900 dark:hover:text-white">Careers</Link>
                <Link href="/dpa" className="transition-colors hover:text-slate-900 dark:hover:text-white">DPA</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
