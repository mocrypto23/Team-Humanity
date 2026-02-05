"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { InfluencerRow } from "@/lib/types";
import InfluencerCard from "@/components/InfluencerCard";

function withInstantScroll(fn: () => void) {
  const el = document.documentElement;
  const prev = el.style.scrollBehavior;
  el.style.scrollBehavior = "auto";
  fn();
  el.style.scrollBehavior = prev;
}

function scrollCardEndIfNeeded(node: HTMLElement) {
  const r = node.getBoundingClientRect();
  const margin = 16;
  const needsDown = r.bottom > window.innerHeight - margin;
  if (!needsDown) return;

  const target = r.bottom + window.scrollY - (window.innerHeight - margin);
  window.scrollTo({ top: Math.max(0, target), left: 0, behavior: "smooth" });
}


export default function InfluencerFeed({
  influencers,
  variant = "default",
}: {
  influencers: InfluencerRow[];
  variant?: "default" | "highlights";
}) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());

  const cardRefs = useRef(new Map<number, HTMLDivElement | null>());
  const lastOpenedIdRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const list = useMemo(() => {
    return (influencers ?? []).map((x) => ({
      ...x,
      id: Number(x.id),
    }));
  }, [influencers]);

  const toggle = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      const isOpening = !next.has(id);
      if (isOpening) {
        next.add(id);
        lastOpenedIdRef.current = id;
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;

    const id = lastOpenedIdRef.current;
    if (!id) return;
    if (!expandedIds.has(id)) return;

    timerRef.current = window.setTimeout(() => {
      const el = cardRefs.current.get(id);
      if (!el) return;
      scrollCardEndIfNeeded(el);
    }, 60);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [expandedIds]);

  const lgCols =
    variant === "highlights" || list.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3";

  return (
    <section className="mt-2">
      <div
        className={[
          "[overflow-anchor:none]",
          "grid gap-4 items-start [grid-auto-rows:max-content]",
          "sm:grid-cols-2",
          lgCols,
        ].join(" ")}
      >
        {list.map((i) => (
          <div
            key={i.id}
            className="self-start [overflow-anchor:none]"
            ref={(node) => {
              cardRefs.current.set(i.id, node);
            }}
          >
            <InfluencerCard
              influencer={i}
              expanded={expandedIds.has(i.id)}
              onToggle={() => toggle(i.id)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
