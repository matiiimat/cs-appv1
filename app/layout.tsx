import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const customFont = localFont({
  // Use a path relative to this file so next/font/local can resolve it at build time
  src: "../public/fonts/CreatoDisplay-Regular.otf",
  variable: "--font-custom",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Aidly - AI-Powered Customer Support Software for B2C Email Ticketing",
    template: "%s | Aidly"
  },
  description: "Transform your B2C customer support with AI-powered email ticketing. Get intelligent draft responses in seconds. Reduce costs by 90% while delivering faster, more consistent service. GDPR compliant.",
  keywords: [
    "customer support software",
    "email ticketing system",
    "AI customer support",
    "B2C helpdesk",
    "customer service software",
    "support ticket system",
    "email support software",
    "AI email assistant",
    "customer support automation",
    "ecommerce customer support",
    "helpdesk software",
    "customer service platform",
    "support desk software",
    "email management system",
    "AI-powered support"
  ],
  authors: [{ name: "Aidly" }],
  creator: "Aidly",
  publisher: "Aidly",
  metadataBase: new URL('https://aidly.me'),
  alternates: {
    canonical: '/'
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://aidly.me',
    title: 'Aidly - AI-Powered Customer Support Software for B2C Email Ticketing',
    description: 'Transform your B2C customer support with AI-powered email ticketing. Get intelligent draft responses in seconds. Reduce costs by 90%.',
    siteName: 'Aidly',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Aidly - AI-Powered Customer Support'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aidly - AI-Powered Customer Support Software',
    description: 'Transform your B2B customer support with AI-powered email ticketing. Reduce costs by 90%.',
    images: ['/og-image.png'],
    creator: '@aidly_ai'
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add your verification codes here once you register with search engines
    // Google Search Console: https://search.google.com/search-console
    // Bing Webmaster Tools: https://www.bing.com/webmasters
    // google: 'your-google-verification-code',
    // bing: 'your-bing-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* LinkedIn Insight Tag */}
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `
              _linkedin_partner_id = "9242769";
              window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
              window._linkedin_data_partner_ids.push(_linkedin_partner_id);
            `,
          }}
        />
        <script
          type="text/javascript"
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
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            alt=""
            src="https://px.ads.linkedin.com/collect/?pid=9242769&fmt=gif"
          />
        </noscript>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${customFont.variable} ${customFont.className} antialiased`}
      >
        {/* Pre-hydration theme setter to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => { try { const t = localStorage.getItem('aidly-theme'); if (t === 'dark') { document.documentElement.classList.add('dark'); } else { document.documentElement.classList.remove('dark'); } } catch(_) {} })();`,
          }}
        />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
