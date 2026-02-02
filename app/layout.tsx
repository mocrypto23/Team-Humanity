import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const siteName = "Team Humanity";
const siteDescription = "Help directly. Transparently.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    default: siteName,
    template: `%s · ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: ["donations", "charity", "stories", "influencers", "support", "humanitarian"],
  authors: [{ name: siteName }],
  creator: siteName,

  icons: {
    icon: "/favicon.ico",
  },

  openGraph: {
    type: "website",
    siteName,
    title: siteName,
    description: siteDescription,
    images: [{ url: "/og.webp", width: 1200, height: 630, alt: siteName }],
  },

  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
    images: ["/og.webp"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
