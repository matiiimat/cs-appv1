"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"

export default function DpaPage() {
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Data Processing Agreement (DPA)</h1>
          <p className="mt-3 text-slate-500 dark:text-white/50">Last updated: {new Date().getFullYear()}</p>

          <section className="mt-8 space-y-6 text-sm leading-6 text-slate-600 dark:text-white/70">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">1. Parties and Roles</h2>
              <p className="mt-2">
                This DPA forms part of the Terms of Service between you (the &quot;Controller&quot;) and Aidly (the &quot;Processor&quot;) and governs
                our processing of personal data on your behalf in connection with the Service.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">2. Subject Matter and Duration</h2>
              <p className="mt-2">
                Subject matter: processing of personal data in customer messages and related metadata for the provision of the Service.
                Duration: for the term of your subscription and a reasonable period thereafter for backups, logs, and legal obligations.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">3. Nature and Purpose of Processing</h2>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li>Receiving, storing, encrypting, triaging, and transmitting messages.</li>
                <li>Generating AI‑assisted classifications and reply drafts as configured by the Controller.</li>
                <li>Sending outbound transactional emails and maintaining operational records.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">4. Categories of Data Subjects and Data</h2>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li>Data subjects: Controller&apos;s end customers, agents, and authorized users.</li>
                <li>Personal data: names, email addresses, message content, and operational metadata provided by Controller.</li>
                <li>Sensitive data: Controller must not submit special categories of data unless expressly agreed with additional safeguards.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">5. Instructions</h2>
              <p className="mt-2">
                We will process personal data only on documented instructions from the Controller, including via the Terms and your
                settings (e.g., configured AI providers), unless required by law. We will promptly inform you if an instruction infringes
                applicable law (where legally permitted).
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">6. Confidentiality</h2>
              <p className="mt-2">
                We ensure persons authorized to process personal data are bound by confidentiality obligations and receive appropriate
                training.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">7. Security</h2>
              <p className="mt-2">
                We implement appropriate technical and organizational measures, including encryption in transit and at rest for sensitive
                fields, access controls, and monitoring, designed to protect personal data against accidental or unlawful destruction,
                loss, alteration, unauthorized disclosure, or access.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">8. Subprocessors</h2>
              <p className="mt-2">
                We may engage subprocessors to support the Service. A current list is available at <Link className="text-[#3872B9] underline hover:text-[#B33275]" href="/subprocessors">/subprocessors</Link>.
                We impose data protection obligations on subprocessors equivalent to those herein and remain responsible for their performance.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">9. International Transfers</h2>
              <p className="mt-2">
                Where personal data is transferred outside the EEA/UK to a country not deemed adequate, we implement appropriate safeguards
                such as Standard Contractual Clauses and additional measures as needed.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">10. Assistance</h2>
              <ul className="mt-2 list-disc pl-5 space-y-2">
                <li>We will assist the Controller in responding to data subject requests under GDPR.</li>
                <li>We will provide reasonable assistance with DPIAs and consultations with supervisory authorities where required.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">11. Personal Data Breach</h2>
              <p className="mt-2">
                We will notify the Controller without undue delay upon becoming aware of a personal data breach affecting personal data
                we process for the Controller, and provide information reasonably required to meet the Controller&apos;s obligations.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">12. Audits</h2>
              <p className="mt-2">
                Upon reasonable notice, we will make available information necessary to demonstrate compliance and allow for audits,
                including inspections, conducted by the Controller or an auditor mandated by the Controller, subject to confidentiality
                and reasonable limitations to protect the security and integrity of the Service.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">13. Return or Deletion</h2>
              <p className="mt-2">
                Upon termination of the Service, at the Controller&apos;s choice and subject to legal obligations, we will delete or return
                personal data and delete existing copies within a reasonable period from backups and logs.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">14. Liability</h2>
              <p className="mt-2">
                Liability is as set forth in the Terms. Nothing in this DPA limits rights or remedies available to data subjects under
                applicable law.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">15. Contact</h2>
              <p className="mt-2">Questions about this DPA? Contact <a className="text-[#3872B9] underline hover:text-[#B33275]" href="mailto:legal@aidly.me">legal@aidly.me</a>.</p>
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
