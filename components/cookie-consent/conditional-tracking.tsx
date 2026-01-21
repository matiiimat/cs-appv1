"use client"

import { useEffect, useState } from "react"
import Script from "next/script"
import Image from "next/image"
import { Analytics } from "@vercel/analytics/next"
import { getCookieConsent, type CookieConsent } from "./cookie-banner"

export function ConditionalTracking() {
  // Initialize consent from localStorage immediately (client-side only)
  const [consent, setConsent] = useState<ReturnType<typeof getCookieConsent>>(() => {
    if (typeof window === 'undefined') return null
    return getCookieConsent()
  })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Double-check consent in case initial state wasn't set
    const currentConsent = getCookieConsent()
    if (JSON.stringify(currentConsent) !== JSON.stringify(consent)) {
      setConsent(currentConsent)
    }

    // Listen for consent changes
    const handleConsentChange = (event: Event) => {
      const customEvent = event as CustomEvent<CookieConsent>
      setConsent(customEvent.detail)
    }

    window.addEventListener("cookieConsentChanged", handleConsentChange)

    return () => {
      window.removeEventListener("cookieConsentChanged", handleConsentChange)
    }
  }, [consent])

  // Don't render anything on server
  if (!mounted) return null

  const hasMarketingConsent = consent?.marketing === true
  const hasAnalyticsConsent = consent?.analytics === true

  return (
    <>
      {/* LinkedIn Insight Tag - only load if marketing consent given */}
      {hasMarketingConsent && (
        <>
          <Script
            id="linkedin-partner-id"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                _linkedin_partner_id = "9242769";
                window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
                window._linkedin_data_partner_ids.push(_linkedin_partner_id);
              `,
            }}
          />
          <Script
            id="linkedin-insight"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(l) {
                  if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
                  window.lintrk.q=[]}
                  var s = document.getElementsByTagName("script")[0];
                  var b = document.createElement("script");
                  b.type = "text/javascript";b.async = true;
                  b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
                  s.parentNode.insertBefore(b, s);})(window.lintrk);
              `,
            }}
          />
          <noscript>
            <Image
              height={1}
              width={1}
              style={{ display: "none" }}
              alt=""
              src="https://px.ads.linkedin.com/collect/?pid=9242769&fmt=gif"
            />
          </noscript>
        </>
      )}

      {/* Vercel Analytics - only load if analytics consent given */}
      {hasAnalyticsConsent && <Analytics />}
    </>
  )
}
