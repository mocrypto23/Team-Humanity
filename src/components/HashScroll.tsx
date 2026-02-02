"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

function scrollToHash(hash: string) {
  const id = hash.replace("#", "");
  if (!id) return false;

  const el = document.getElementById(id);
  if (!el) return false;

  el.scrollIntoView({ behavior: "smooth", block: "start" });
  return true;
}

export default function HashScroll() {
  const pathname = usePathname();
  const doneRef = useRef<string | null>(null);

  useEffect(() => {
    // نشتغل بس على الهوم
    if (pathname !== "/") return;

    const hash = window.location.hash;
    if (!hash) return;

    // لو نفس الهاش اتنفذ قبل كده في نفس الزيارة، متعيدوش
    if (doneRef.current === hash) return;

    // 1) جرّب فوراً
    if (scrollToHash(hash)) {
      doneRef.current = hash;
      return;
    }

    // 2) لو العنصر مش موجود لسه: استنى لحد ما يظهر باستخدام MutationObserver
    const obs = new MutationObserver(() => {
      if (scrollToHash(hash)) {
        doneRef.current = hash;
        obs.disconnect();
      }
    });

    obs.observe(document.body, { childList: true, subtree: true });

    // Safety: اقفل الـ observer بعد 10 ثواني
    const t = window.setTimeout(() => obs.disconnect(), 10_000);

    return () => {
      window.clearTimeout(t);
      obs.disconnect();
    };
  }, [pathname]);

  useEffect(() => {
    // لما الهاش يتغير وإنت على الهوم (click داخل نفس الصفحة)
    const onHashChange = () => {
      if (window.location.pathname !== "/") return;
      const hash = window.location.hash;
      if (!hash) return;

      // متحفظش هنا.. عادي كل تغيير هاش لازم يسكرول
      scrollToHash(hash);
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return null;
}
