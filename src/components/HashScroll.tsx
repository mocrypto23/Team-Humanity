"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

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
  const sp = useSearchParams();

  useEffect(() => {
    if (pathname !== "/") return;

    const hash = window.location.hash;
    if (!hash) return;

    if (scrollToHash(hash)) return;

    let tries = 0;
    let raf = 0;

    const tick = () => {
      tries += 1;
      if (scrollToHash(hash)) return;
      if (tries > 60) return;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pathname, sp]);

  useEffect(() => {
    const onHashChange = () => {
      if (window.location.pathname !== "/") return;
      const hash = window.location.hash;
      if (!hash) return;
      scrollToHash(hash);
    };

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return null;
}
