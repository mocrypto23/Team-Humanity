"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { InfluencerRow } from "@/lib/types";
import { publicStorageUrl } from "@/lib/storage";
import { createPortal } from "react-dom";

function slugifyName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function extractYouTubeId(url?: string | null) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();

    if (host.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;

      const parts = u.pathname.split("/").filter(Boolean);
      const shortsIdx = parts.findIndex((p) => p === "shorts");
      if (shortsIdx >= 0 && parts[shortsIdx + 1]) return parts[shortsIdx + 1];

      const embedIdx = parts.findIndex((p) => p === "embed");
      if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1];
    }

    if (host.includes("youtu.be")) {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id || null;
    }

    return null;
  } catch {
    return null;
  }
}

function parseInstagram(
  url?: string | null
): null | {
  shortcode: string;
  kind: "reel" | "p" | "tv";
  canonical: string;
  embed: string;
} {
  if (!url) return null;

  try {
    const u = new URL(url.trim());
    const host = u.hostname.toLowerCase();
    if (!host.includes("instagram.com") && !host.includes("instagr.am")) return null;

    const parts = u.pathname.split("/").filter(Boolean);
    const idx = parts.findIndex((p) => p === "reel" || p === "reels" || p === "p" || p === "tv");
    if (idx < 0) return null;

    const raw = parts[idx];
    const kind: "reel" | "p" | "tv" = raw === "p" ? "p" : raw === "tv" ? "tv" : "reel";
    const shortcode = parts[idx + 1];
    if (!shortcode) return null;

    const canonical = `https://www.instagram.com/${kind}/${shortcode}/`;
    const embed = `https://www.instagram.com/${kind}/${shortcode}/embed/`;

    return { shortcode, kind, canonical, embed };
  } catch {
    return null;
  }
}

function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const touch =
      typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
    setIsTouch(!!touch);
  }, []);
  return isTouch;
}

/**
 * ✅ 3D Tilt Hook
 * - RAF throttling
 * - disables on touch + respects prefers-reduced-motion
 */
function useTilt3D(disabled: boolean) {
  const ref = useRef<HTMLElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const setTransform = useCallback((t: string) => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = t;
  }, []);

  const onMove = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      const el = ref.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const cx = rect.width / 2;
      const cy = rect.height / 2;

      const rotateX = ((y - cy) / cy) * -8; 
      const rotateY = ((x - cx) / cx) * 8;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setTransform(`perspective(1100px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`);
      });
    },
    [disabled, setTransform]
  );

  const onLeave = useCallback(() => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform 180ms ease";
    setTransform("perspective(1100px) rotateX(0deg) rotateY(0deg) scale(1)");
    window.setTimeout(() => {
      if (!ref.current) return;
      ref.current.style.transition = "transform 80ms ease-out";
    }, 190);
  }, [disabled, setTransform]);

  const onEnter = useCallback(() => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;
    el.style.transition = "transform 80ms ease-out";
    el.style.transformStyle = "preserve-3d";
    el.style.willChange = "transform";
  }, [disabled]);

  return { ref, onMove, onLeave, onEnter };
}

function VideoModal({
  open,
  onClose,
  title,
  iframeSrc,
  openExternalHref,
  openExternalLabel,
  variant = "video",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  iframeSrc: string | null;
  openExternalHref: string;
  openExternalLabel: string;
  variant?: "video" | "reel";
}) {
  const [mountFrame, setMountFrame] = useState(false);
  const [frameLoaded, setFrameLoaded] = useState(false);

  useEffect(() => {
    if (!open) {
      setMountFrame(false);
      setFrameLoaded(false);
      return;
    }
    const t = setTimeout(() => setMountFrame(true), 80);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const isReel = variant === "reel";

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/70" />

          <motion.div
            className="relative mx-auto flex h-full w-full max-w-[1100px] flex-col"
            initial={{ y: 16, scale: 0.985, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 10, scale: 0.985, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3">
              <p className="truncate text-sm font-semibold text-white/90">{title}</p>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="rounded-xl border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/15"
                aria-label="Close"
                type="button"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 px-4 pb-4">
              <div
                className={[
                  "relative mx-auto overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl",
                  isReel ? "h-[calc(100vh-180px)] max-w-[560px] aspect-[9/16]" : "w-full max-w-[980px] aspect-video",
                ].join(" ")}
              >
                {!frameLoaded ? (
                  <div className="absolute inset-0 grid place-items-center bg-white">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                  </div>
                ) : null}

                {mountFrame && iframeSrc ? (
                  <iframe
                    className="absolute inset-0 h-full w-full border-0 bg-white"
                    src={iframeSrc}
                    title={title}
                    loading="eager"
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    onLoad={() => setFrameLoaded(true)}
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center bg-white text-sm text-zinc-500">
                    Loading…
                  </div>
                )}
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <a
                  href={openExternalHref}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-white/15"
                >
                  {openExternalLabel}
                </a>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                  type="button"
                >
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function ImageModal({
  open,
  onClose,
  src,
  alt,
}: {
  open: boolean;
  onClose: () => void;
  src: string | null;
  alt: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted || !open || !src) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        style={{ position: "fixed", inset: 0, zIndex: 2147483647 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
          }}
        />

        <motion.div
          style={{ position: "relative", height: "100%", width: "100%" }}
          className="mx-auto flex max-w-[1200px] flex-col px-4 py-4"
          initial={{ y: 16, scale: 0.985, opacity: 0 }}
          animate={{ y: 0, scale: 1, opacity: 1 }}
          exit={{ y: 10, scale: 0.985, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative flex-1 overflow-hidden rounded-3xl border border-white/10 bg-black shadow-2xl">
            <button
  onClick={(e) => {
    e.stopPropagation();
    onClose();
  }}
  className="absolute top-4 right-4 z-50 rounded-full bg-red-600 px-4 py-3 text-lg font-extrabold text-white shadow-2xl hover:bg-red-700"
  type="button"
  aria-label="Close"
>
  ✕
</button>



            <Image src={src} alt={alt} fill className="object-contain pointer-events-none" sizes="100vw" priority />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

export default function InfluencerCard({
  influencer,
  expanded,
  onToggle,
}: {
  influencer: InfluencerRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [activeImg, setActiveImg] = useState(0);
  const [igOpen, setIgOpen] = useState(false);
  const [ytOpen, setYtOpen] = useState(false);
  const [imgOpen, setImgOpen] = useState(false);

  const isTouch = useIsTouchDevice();
  const reduceMotion = useReducedMotion();

  // ✅ tilt disabled on touch & reduced motion
  const tiltDisabled = isTouch || !!reduceMotion;
  const tilt = useTilt3D(tiltDisabled);

  const images = useMemo(() => (influencer.image_paths ?? []).filter(Boolean), [influencer.image_paths]);
  const activeUrl = images[activeImg] ? publicStorageUrl("influencers", images[activeImg]!) : null;

  const ytId = extractYouTubeId(influencer.video_url);
  const ig = parseInstagram(influencer.video_url);

  const confirmedText = influencer.confirmed_label || "Confirmed by Team Humanity";

  const donationButtons = useMemo(() => {
    const list = (influencer.donation_links ?? []).filter(Boolean) as any[];
    const cleaned = Array.isArray(list)
      ? list
          .map((x) => ({
            label: String(x?.label || "").trim() || "Donate",
            url: String(x?.url || "").trim(),
          }))
          .filter((x) => x.url)
      : [];

    if (!cleaned.length && influencer.donation_link) {
      return [{ label: "Donate", url: influencer.donation_link }];
    }
    return cleaned;
  }, [influencer.donation_links, influencer.donation_link]);

  const igEmbedUrl = ig?.embed ?? null;
  const ytEmbedUrl = ytId ? `https://www.youtube.com/embed/${ytId}` : null;
  const ytWatchUrl = ytId ? `https://www.youtube.com/watch?v=${ytId}` : influencer.video_url || "";

  const isHighlight = influencer.highlight_slot === 1 || influencer.highlight_slot === 2;

  const storySlug = slugifyName(String(influencer.name || "story"));

  return (
    <>
      {/* ✅ Wrapper responsible for 3D tilt */}
      <div
        ref={(node) => {
          // typesafe for our hook
          tilt.ref.current = node as unknown as HTMLElement | null;
        }}
        onMouseEnter={tilt.onEnter}
        onMouseMove={tilt.onMove}
        onMouseLeave={tilt.onLeave}
        style={{
          transform: "perspective(1100px) rotateX(0deg) rotateY(0deg) scale(1)",
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      >
        <motion.article
          onClick={onToggle}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className={[
            "group relative w-full self-start min-h-0 cursor-pointer overflow-hidden rounded-3xl border bg-white/85 p-4 shadow-sm backdrop-blur",
            "border-emerald-200/70 hover:shadow-md",
          ].join(" ")}
        >
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-emerald-200/20 blur-2xl" />
          </div>

          <div className={["relative", isHighlight ? "pr-16" : ""].join(" ")}>
            {isHighlight ? (
              <div className="flex items-start gap-3">
                <h2
                  className="min-w-0 flex-1 text-base font-semibold text-zinc-900 leading-snug"
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                  title={String(influencer.name || "")}
                >
                  {influencer.name}
                </h2>

                <div className="flex-none">
                  <div className="rounded-full bg-red-600 px-3 py-1 text-[11px] font-extrabold text-white shadow">
                    URGENT
                  </div>
                </div>
              </div>
            ) : (
              <h2
                className="text-base font-semibold text-zinc-900 leading-snug"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
                title={String(influencer.name || "")}
              >
                {influencer.name}
              </h2>
            )}

            {influencer.is_confirmed ? (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {confirmedText}
              </div>
            ) : null}

            {/* ✅ Buttons */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link
                href={`/stories/${encodeURIComponent(storySlug)}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                title="Read full story"
              >
                Read Full Story
              </Link>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
                type="button"
              >
                {expanded ? "Collapse" : "Expand"}
              </button>
            </div>
          </div>

          {influencer.bio ? (
            <p
              className="relative mt-3 text-sm leading-relaxed text-zinc-600"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {influencer.bio}
            </p>
          ) : null}

          <div
            className={[
              "relative mt-4 overflow-hidden rounded-2xl border bg-emerald-50/40 border-emerald-200/70",
              expanded ? "h-80 md:h-96" : "h-64 md:h-72",
            ].join(" ")}
            onClick={(e) => {
              if (!activeUrl) return;
              e.stopPropagation();
              setImgOpen(true);
            }}
            role="button"
            aria-label="Open image"
            title="Click to view full image"
          >
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-16 bg-gradient-to-t from-black/35 to-transparent" />

            {activeUrl ? (
              <Image
                src={activeUrl}
                alt={String(influencer.name || "story")}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                priority={isHighlight}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-zinc-500">No image yet</div>
            )}

            {activeUrl ? (
              <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
                <div className="flex items-center justify-center rounded-2xl border border-white/25 bg-black/45 px-4 py-3 shadow-lg backdrop-blur">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-white" aria-hidden="true">
                    <path
                      d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              </div>
            ) : null}
          </div>

          {images.length > 1 ? (
            <div className="relative mt-3 flex gap-2 overflow-x-auto pb-1">
              {images.slice(0, 6).map((p, idx) => {
                const url = publicStorageUrl("influencers", p);
                const isActive = idx === activeImg;
                return (
                  <button
                    key={`${p}-${idx}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveImg(idx);
                    }}
                    className={[
                      "relative h-14 w-20 flex-none overflow-hidden rounded-xl border bg-white",
                      isActive ? "border-emerald-400" : "border-emerald-200/70",
                    ].join(" ")}
                    type="button"
                  >
                    <Image src={url} alt="" fill className="object-cover" />
                  </button>
                );
              })}
            </div>
          ) : null}

          <AnimatePresence>
            {expanded ? (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.18 }}
                className="relative mt-4 space-y-3"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="overflow-hidden rounded-2xl border border-emerald-200/70 bg-white p-4">
                  {ytId ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        onClick={() => setYtOpen(true)}
                        className="rounded-2xl bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-700"
                        type="button"
                      >
                        Watch here
                      </button>

                      <a
                        href={ytWatchUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-center text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
                      >
                        Open in YouTube
                      </a>
                    </div>
                  ) : ig && igEmbedUrl ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        onClick={() => setIgOpen(true)}
                        className="rounded-2xl bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-700"
                        type="button"
                      >
                        Watch here
                      </button>

                      <a
                        href={ig.canonical}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-center text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
                      >
                        Open on Instagram
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-600">
                      <span className="font-mono text-zinc-800">video_url</span>.
                    </p>
                  )}
                </div>

                {donationButtons.length ? (
                  <div className="grid gap-2">
                    {donationButtons.map((b, idx) => (
                      <a
                        key={`${b.url}-${idx}`}
                        href={b.url}
                        target="_blank"
                        rel="noreferrer"
                        className={
                          idx === 0
                            ? "block rounded-2xl bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-700"
                            : "block rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-center text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
                        }
                      >
                        {b.label || "Donate"}
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
                    No donation links yet.
                  </div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.article>
      </div>

      <ImageModal open={imgOpen} onClose={() => setImgOpen(false)} src={activeUrl} alt={String(influencer.name || "story")} />

      <VideoModal
        open={igOpen}
        onClose={() => setIgOpen(false)}
        title="Watch Reel"
        iframeSrc={igEmbedUrl}
        openExternalHref={ig?.canonical || influencer.video_url || "#"}
        openExternalLabel="Open on Instagram"
        variant="reel"
      />

      <VideoModal
        open={ytOpen}
        onClose={() => setYtOpen(false)}
        title="Watch Video"
        iframeSrc={ytEmbedUrl}
        openExternalHref={ytWatchUrl || "#"}
        openExternalLabel="Open in YouTube"
        variant="video"
      />
    </>
  );
}
