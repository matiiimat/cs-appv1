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
          <p className="mt-3 text-slate-500 dark:text-white/50">Last updated: {new Date().getFullYear()}</p>

          <section className="mt-8 space-y-6 text-sm leading-6 text-slate-600 dark:text-white/70">
            <p>
              This Privacy Policy describes how Aidly (&quot;we&quot;, &quot;us&quot;) collects, uses, and safeguards information in connection with our
              customer support platform. The Service is intended for lawful business use by individuals 18+.
            </p>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Data Controller and Contact</h2>
              <p className="mt-2">
                For account, billing, and site usage data, the data controller is: <span className="font-medium">Aidly</span>, Paris, France.
                You can contact us at <a className="text-[#3872B9] underline hover:text-[#B33275]" href="mailto:support@aidly.me">support@aidly.me</a>.
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
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">AI Providers and BYO Keys</h2>
              <p className="mt-2">
                If you connect your own AI provider or endpoint, selected content may be sent to that provider under your configuration.
                Such processing is governed by that provider&apos;s terms and privacy policy; you are responsible for ensuring lawful use and
                appropriate configuration.
              </p>
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
                We retain data for as long as needed to provide the Service and meet legal obligations. We follow industry‑standard
                retention practices and document details in our <Link className="text-[#3872B9] underline hover:text-[#B33275]" href="/dpa">DPA</Link>. You may request deletion of your
                organization&apos;s data by contacting support.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Your Rights</h2>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li>Access, rectification, erasure, restriction, portability, and objection (subject to legal limits).</li>
                <li>To exercise your rights, contact <a className="text-[#3872B9] underline hover:text-[#B33275]" href="mailto:support@aidly.me">support@aidly.me</a>.</li>
                <li>You have the right to lodge a complaint with your local authority. In France: <a className="text-[#3872B9] underline hover:text-[#B33275]" href="https://www.cnil.fr/">CNIL</a>.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Cookies</h2>
              <p className="mt-2">
                We keep cookies minimal and do not use third‑party analytics cookies at launch. See our
                <Link className="text-[#3872B9] underline hover:text-[#B33275] ml-1" href="/cookies">Cookies Policy</Link> for details.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Contact</h2>
              <p className="mt-2">
                Questions? Email <a className="text-[#3872B9] underline hover:text-[#B33275]" href="mailto:support@aidly.me">support@aidly.me</a>.
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
