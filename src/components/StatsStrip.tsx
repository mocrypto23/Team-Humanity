"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function useInViewOnce<T extends Element>(rootMargin = "0px") {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return { ref, inView } as const;
}

function useCountUp(target: number, enabled: boolean, durationMs = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, enabled, durationMs]);

  return value;
}

function Ring({
  progress, 
  children,
}: {
  progress: number;
  children: React.ReactNode;
}) {
  const size = 92;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * Math.max(0, Math.min(1, progress));
  const gap = c - dash;

  return (
    <div className="relative grid place-items-center">
      <svg width={size} height={size} className="block">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(16,185,129,0.18)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(16,185,129,0.85)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>

      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

export default function StatsStrip() {
  const { ref, inView } = useInViewOnce<HTMLDivElement>("-80px");

  const stats = useMemo(
    () => [
      { type: "count" as const, n: 200, prefix: "+", label: "Supporters reached" },
      { type: "count" as const, n: 20, prefix: "+", label: "Trusted stories" },
      { type: "text" as const, text: "Fast", label: "Direct links" },
    ],
    []
  );

  const v0 = useCountUp(stats[0].type === "count" ? stats[0].n : 0, inView, 1000);
  const v1 = useCountUp(stats[1].type === "count" ? stats[1].n : 0, inView, 900);

  const p0 = Math.min(1, v0 / 220);
  const p1 = Math.min(1, v1 / 30);
  const p2 = 0.82;

  return (
    <section className="mx-auto max-w-6xl px-4" ref={ref}>
      <div className="grid gap-3 rounded-3xl border border-emerald-200 bg-white/80 p-5 shadow-soft sm:grid-cols-3">
        {/* 1 */}
        <div className="rounded-2xl border border-emerald-100 bg-white p-4">
          <div className="flex items-center gap-4">
            <Ring progress={p0}>
              <div className="text-center">
                <div className="text-2xl font-semibold text-zinc-900">
                  +{v0}
                </div>
                <div className="text-[11px] font-semibold text-emerald-800">
                  LIVE
                </div>
              </div>
            </Ring>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900">Impact</p>
              <p className="mt-1 text-sm text-zinc-600">{stats[0].label}</p>
            </div>
          </div>
        </div>

        {/* 2 */}
        <div className="rounded-2xl border border-emerald-100 bg-white p-4">
          <div className="flex items-center gap-4">
            <Ring progress={p1}>
              <div className="text-center">
                <div className="text-2xl font-semibold text-zinc-900">
                  +{v1}
                </div>
                <div className="text-[11px] font-semibold text-emerald-800">
                  VERIFIED
                </div>
              </div>
            </Ring>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900">Trust</p>
              <p className="mt-1 text-sm text-zinc-600">{stats[1].label}</p>
            </div>
          </div>
        </div>

        {/* 3 */}
        <div className="rounded-2xl border border-emerald-100 bg-white p-4">
          <div className="flex items-center gap-4">
            <Ring progress={p2}>
              <div className="text-center">
                <div className="text-xl font-semibold text-zinc-900">Fast</div>
                <div className="text-[11px] font-semibold text-emerald-800">
                  DIRECT
                </div>
              </div>
            </Ring>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900">Speed</p>
              <p className="mt-1 text-sm text-zinc-600">{stats[2].label}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
