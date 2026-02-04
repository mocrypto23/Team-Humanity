// app/(site)/layout.tsx
import { Suspense, type ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";

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
