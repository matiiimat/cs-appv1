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
  title: "Aidly",
  description: "Grow your business, not your support costs, with intelligent automation that delivers faster, smarter support at lower cost.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
