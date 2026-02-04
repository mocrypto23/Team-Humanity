// D:\New-Project\team-humanity\src\components\InfluencerFeed.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { InfluencerRow } from "@/lib/types";
import InfluencerCard from "@/components/InfluencerCard";

export default function InfluencerFeed({
  influencers,
  variant = "default", // "default" | "highlights"
}: {
  influencers: InfluencerRow[];
  variant?: "default" | "highlights";
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // refs لكل كارد wrapper
  const cardRefs = useRef(new Map<number, HTMLDivElement | null>());
  const scrollTimer = useRef<number | null>(null);

  const list = useMemo(() => {
    return (influencers ?? []).map((x) => ({
      ...x,
      id: Number(x.id),
    }));
  }, [influencers]);

  const toggle = useCallback((id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  // ✅ بعد ما expandedId يتغير: انزل لنهاية الكارد سموث
  useEffect(() => {
    if (!expandedId) return;

    // امسح أي تايمر قديم
    if (scrollTimer.current) window.clearTimeout(scrollTimer.current);

    // ادّي فرصة للـ framer-motion يمدد الكارد شوية قبل السّكرول
    scrollTimer.current = window.setTimeout(() => {
      const el = cardRefs.current.get(expandedId);
      if (!el) return;

      // block:end عشان يجيب لك آخر الكارد (الزراير تحت)
      el.scrollIntoView({
        behavior: "smooth",
        block: "end",
        inline: "nearest",
      });
    }, 240); // مناسب مع أنيميشن بسيط

    return () => {
      if (scrollTimer.current) window.clearTimeout(scrollTimer.current);
      scrollTimer.current = null;
    };
  }, [expandedId]);

  const lgCols =
    variant === "highlights" || list.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3";

  return (
    <section className="mt-2">
      <div
        className={[
          // ✅ منع scroll anchoring اللي بيعمل jump
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
              expanded={expandedId === i.id}
              onToggle={() => toggle(i.id)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
