"use client";

import Link from "next/link";
import { useLayoutEffect } from "react";

function getStoriesTop(): number | null {
  const el = document.getElementById("stories");
  if (!el) return null;
  return el.getBoundingClientRect().top + window.scrollY;
}

export default function PaginationControls({
  page,
  hasPrev,
  hasNext,
}: {
  page: number;
  hasPrev: boolean;
  hasNext: boolean;
}) {
  // ✅ بعد التنقل: ارجع فورا لمكان stories (بدون smooth)
  useLayoutEffect(() => {
    const y = sessionStorage.getItem("scrollY:storiesTop");
    if (!y) return;

    sessionStorage.removeItem("scrollY:storiesTop");
    const yy = Number(y);
    if (!Number.isFinite(yy)) return;

    // فوري
    window.scrollTo(0, yy);
  }, [page]);

  const prevPage = Math.max(1, page - 1);
  const nextPage = page + 1;

  const prevHref = prevPage <= 1 ? `/?page=1` : `/?page=${prevPage}`;
  const nextHref = nextPage <= 1 ? `/?page=1` : `/?page=${nextPage}`;

  function rememberStoriesTop() {
    const top = getStoriesTop();
    if (top == null) return;
    sessionStorage.setItem("scrollY:storiesTop", String(top));
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href={prevHref}
        scroll={false}
        onClick={() => {
          if (!hasPrev) return;
          rememberStoriesTop();
        }}
        className={[
          "rounded-2xl border px-4 py-2 text-sm font-semibold",
          hasPrev
            ? "border-zinc-200 bg-white hover:bg-zinc-50"
            : "border-zinc-100 bg-zinc-50 text-zinc-400 pointer-events-none",
        ].join(" ")}
        aria-disabled={!hasPrev}
      >
        Prev
      </Link>

      <Link
        href={nextHref}
        scroll={false}
        onClick={() => {
          if (!hasNext) return;
          rememberStoriesTop();
        }}
        className={[
          "rounded-2xl border px-4 py-2 text-sm font-semibold",
          hasNext
            ? "border-zinc-200 bg-white hover:bg-zinc-50"
            : "border-zinc-100 bg-zinc-50 text-zinc-400 pointer-events-none",
        ].join(" ")}
        aria-disabled={!hasNext}
      >
        Next
      </Link>
    </div>
  );
}
