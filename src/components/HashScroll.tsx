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
    if (pathname !== "/") return;

    const hash = window.location.hash;
    if (!hash) return;

    if (doneRef.current === hash) return;

    if (scrollToHash(hash)) {
      doneRef.current = hash;
      return;
    }

    const obs = new MutationObserver(() => {
      if (scrollToHash(hash)) {
        doneRef.current = hash;
        obs.disconnect();
      }
    });

    obs.observe(document.body, { childList: true, subtree: true });

    const t = window.setTimeout(() => obs.disconnect(), 10_000);

    return () => {
      window.clearTimeout(t);
      obs.disconnect();
    };
  }, [pathname]);

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
