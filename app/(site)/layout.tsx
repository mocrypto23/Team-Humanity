// app/(site)/layout.tsx
import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: {
    default: "Team Humanity",
    template: "%s • Team Humanity",
  },
  description: "Help directly. Transparently.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "Team Humanity",
    description: "Help directly. Transparently.",
    url: siteUrl,
    siteName: "Team Humanity",
    images: [{ url: "/og.webp", width: 1200, height: 630 }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Team Humanity",
    description: "Help directly. Transparently.",
    images: ["/og.webp"],
  },
};

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
  <Navbar />
<Suspense fallback={null}>
  <ScrollToTop />
</Suspense>
  {children}
  <Footer />
</>

  );
}
