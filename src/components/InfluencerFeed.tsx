"use client";

import { useCallback, useMemo, useState } from "react";
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

  const list = useMemo(() => {
    return (influencers ?? []).map((x) => ({
      ...x,
      id: Number(x.id),
    }));
  }, [influencers]);

  const toggle = useCallback((id: number) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const lgCols =
    variant === "highlights" || list.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3";

  return (
    <section className="mt-2">
      <div
        className={[
          "grid gap-4 items-start [grid-auto-rows:max-content]",
          "sm:grid-cols-2",
          lgCols,
        ].join(" ")}
      >
        {list.map((i) => (
          <div key={i.id} className="self-start">
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
