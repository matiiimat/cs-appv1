import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${customFont.variable} ${customFont.className} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
