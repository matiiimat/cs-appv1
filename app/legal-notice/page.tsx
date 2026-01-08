"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"

export default function LegalNoticePage() {
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Legal Notice</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-white/50">Mentions Légales</p>
          <p className="mt-3 text-slate-500 dark:text-white/50">Last updated: January 2026</p>

          <section className="mt-8 space-y-6 text-sm leading-6 text-slate-600 dark:text-white/70">
            <p>
              In accordance with Article 6 of French Law n° 2004-575 of 21 June 2004 for confidence in the digital economy (LCEN), this page provides information about the publisher and host of this website.
            </p>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Site Publisher</h2>
              <p className="mt-2">
                <span className="font-medium text-slate-900 dark:text-white">Service Name:</span> Aidly
              </p>
              <p className="mt-2">
                <span className="font-medium text-slate-900 dark:text-white">Contact Email:</span>{" "}
                <a className="text-[#3872B9] underline hover:text-[#B33275]" href="mailto:support@aidlyhq.com">support@aidlyhq.com</a>
              </p>
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-900/10">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  Company registration details will be updated here once the legal entity is formed.
                </p>
                <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">
                  The following information will be provided upon company formation:
                </p>
                <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-amber-800 dark:text-amber-300">
                  <li>Legal form (e.g., SAS, SARL)</li>
                  <li>Share capital (Capital social)</li>
                  <li>SIRET number</li>
                  <li>RCS registration (Trade and Companies Register)</li>
                  <li>VAT number (Numéro de TVA intracommunautaire)</li>
                  <li>Registered office address</li>
                  <li>Legal representative name and title</li>
                </ul>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Publication Director</h2>
              <p className="mt-2">
                <span className="font-medium text-slate-900 dark:text-white">Email:</span>{" "}
                <a className="text-[#3872B9] underline hover:text-[#B33275]" href="mailto:support@aidlyhq.com">support@aidlyhq.com</a>
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Hosting Provider</h2>
              <p className="mt-2">
                This website is hosted by:
              </p>
              <div className="mt-2 space-y-1">
                <p><span className="font-medium text-slate-900 dark:text-white">Provider:</span> Vercel Inc.</p>
                <p><span className="font-medium text-slate-900 dark:text-white">Address:</span> 440 N Barranca Ave #4133, Covina, CA 91723, United States</p>
                <p><span className="font-medium text-slate-900 dark:text-white">Website:</span>{" "}
                  <a className="text-[#3872B9] underline hover:text-[#B33275]" href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a>
                </p>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Intellectual Property</h2>
              <p className="mt-2">
                The content of this website, including but not limited to text, graphics, logos, images, software, and its structure, is the exclusive property of Aidly or its licensors and is protected by French and international intellectual property laws.
              </p>
              <p className="mt-2">
                Any reproduction, representation, modification, publication, or adaptation of all or part of the elements of the site, regardless of the means or process used, is prohibited without prior written permission from Aidly.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Personal Data</h2>
              <p className="mt-2">
                For information about how we collect, use, and protect your personal data, please refer to our{" "}
                <Link className="text-[#3872B9] underline hover:text-[#B33275]" href="/privacy">Privacy Policy</Link>.
              </p>
              <p className="mt-2">
                In accordance with the General Data Protection Regulation (GDPR) and the French Data Protection Act (Loi Informatique et Libertés), you have rights regarding your personal data. See our Privacy Policy for details on how to exercise these rights.
              </p>
              <p className="mt-2">
                <span className="font-medium text-slate-900 dark:text-white">Supervisory Authority:</span> Commission Nationale de l&apos;Informatique et des Libertés (CNIL)
              </p>
              <p className="mt-1">
                <span className="font-medium text-slate-900 dark:text-white">Address:</span> 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07, France
              </p>
              <p className="mt-1">
                <span className="font-medium text-slate-900 dark:text-white">Website:</span>{" "}
                <a className="text-[#3872B9] underline hover:text-[#B33275]" href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Cookies</h2>
              <p className="mt-2">
                This website does not use cookies or similar tracking technologies. We do not place any cookies on your device, and no third-party cookies are used for analytics, advertising, or any other purpose.
              </p>
              <p className="mt-2">
                Your browser may store essential session data required for authentication (magic link sign-in), but this is strictly limited to functional requirements and does not track your activity.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Applicable Law and Jurisdiction</h2>
              <p className="mt-2">
                This website and its content are governed by French law. Any dispute relating to the use of this website shall be subject to the exclusive jurisdiction of the French courts, specifically the courts of Paris, France.
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Contact</h2>
              <p className="mt-2">
                For any questions regarding this Legal Notice or any other legal matter, please contact us at:{" "}
                <a className="text-[#3872B9] underline hover:text-[#B33275]" href="mailto:support@aidlyhq.com">support@aidlyhq.com</a>
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
