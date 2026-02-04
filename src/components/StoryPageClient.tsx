"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import type { InfluencerRow } from "@/lib/types";
import { publicStorageUrl } from "@/lib/storage";
import { createPortal } from "react-dom";

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

function parseInstagram(url?: string | null): null | {
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
    const embedKind = kind === "reel" ? "reel" : kind;
    const embed = `https://www.instagram.com/${embedKind}/${shortcode}/embed/`;

    return { shortcode, kind, canonical, embed };
  } catch {
    return null;
  }
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
    const t = setTimeout(() => setMountFrame(true), 60);
    return () => clearTimeout(t);
  }, [open]);

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
                onClick={onClose}
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
                  isReel ? "h-[calc(100vh-180px)] aspect-[9/16] max-w-[560px]" : "w-full aspect-video max-w-[980px]",
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
                  <div className="absolute inset-0 grid place-items-center bg-white text-sm text-zinc-500">Loading…</div>
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
                  onClick={onClose}
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

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
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

            <Image
              src={src}
              alt={alt}
              fill
              className="object-contain pointer-events-none"
              sizes="100vw"
              priority
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}


export default function StoryPageClient({ influencer }: { influencer: InfluencerRow }) {
  const [activeImg, setActiveImg] = useState(0);
  const [igOpen, setIgOpen] = useState(false);
  const [ytOpen, setYtOpen] = useState(false);
  const [imgOpen, setImgOpen] = useState(false);

  const images = useMemo(() => (influencer.image_paths ?? []).filter(Boolean), [influencer.image_paths]);
  const activeUrl = images[activeImg] ? publicStorageUrl("influencers", images[activeImg]!) : null;

  const ytId = extractYouTubeId(influencer.video_url);
  const ig = parseInstagram(influencer.video_url);

  const igEmbedUrl = ig?.embed ?? null;
  const ytEmbedUrl = ytId ? `https://www.youtube.com/embed/${ytId}` : null;
  const ytWatchUrl = ytId ? `https://www.youtube.com/watch?v=${ytId}` : influencer.video_url || "";

  const confirmedText = influencer.confirmed_label || "Confirmed by Team Humanity";
  const isHighlight = influencer.highlight_slot === 1 || influencer.highlight_slot === 2;

 function inferDonateLabel(url: string) {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();

    if (host.includes("gofundme.com")) return "GoFundMe";
    if (host.includes("chuffed.org")) return "Chuffed";
    if (host.includes("paypal.com") || host.includes("paypal.me")) return "PayPal";

    return "Donate";
  } catch {
    return "Donate";
  }
}

const donationButtons = useMemo(() => {
  const list = (influencer.donation_links ?? []).filter(Boolean) as any[];
  const cleaned = Array.isArray(list)
    ? list
        .map((x) => {
          const url = String(x?.url || "").trim();
          const rawLabel = String(x?.label || x?.platform || x?.name || "").trim(); // ✅ fallback keys
          return {
            label: rawLabel || (url ? inferDonateLabel(url) : "Donate"),
            url,
          };
        })
        .filter((x) => x.url)
    : [];

  if (!cleaned.length && influencer.donation_link) {
    return [{ label: inferDonateLabel(influencer.donation_link), url: influencer.donation_link }];
  }
  return cleaned;
}, [influencer.donation_links, influencer.donation_link]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white text-zinc-900">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute top-40 left-10 h-64 w-64 rounded-full bg-emerald-300/15 blur-3xl" />
        <div className="absolute top-64 right-10 h-64 w-64 rounded-full bg-emerald-200/20 blur-3xl" />
      </div>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-8">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/#stories"
            className="rounded-2xl border border-emerald-200 bg-white/80 px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm backdrop-blur hover:bg-emerald-50"
          >
            ← Back
          </Link>

          {isHighlight ? (
            <span className="rounded-full bg-red-600 px-3 py-1 text-[11px] font-extrabold text-white shadow">
              URGENT
            </span>
          ) : null}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
            className="rounded-[28px] border border-emerald-200/70 bg-white/70 p-5 shadow-soft backdrop-blur"
            style={{ transform: "translateZ(0)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold">{influencer.name}</h1>

                {influencer.is_confirmed ? (
                  <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {confirmedText}
                  </div>
                ) : (
                  <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-medium text-zinc-600">
                    Story
                  </div>
                )}
              </div>
            </div>

            <div
              className="mt-5 overflow-hidden rounded-3xl border border-emerald-200/70 bg-emerald-50/40 cursor-pointer"
              onClick={() => activeUrl && setImgOpen(true)}
              role="button"
              aria-label="Open image"
              title="Open image"
            >
              <div className="relative h-[380px]">
                {activeUrl ? (
                  <>
                    <Image src={activeUrl} alt="" fill className="object-cover blur-2xl scale-110 opacity-40" aria-hidden />
                    <Image
                      src={activeUrl}
                      alt={influencer.name}
                      fill
                      className="object-cover"
                      priority={isHighlight}
                      sizes="(max-width: 1024px) 100vw, 50vw"
                    />
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
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/15 to-transparent" />
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-zinc-500">No image yet</div>
                )}
              </div>
            </div>

            {images.length > 1 ? (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {images.slice(0, 8).map((p, idx) => {
                  const url = publicStorageUrl("influencers", p);
                  const isActive = idx === activeImg;
                  return (
                    <button
                      key={`${p}-${idx}`}
                      onClick={() => setActiveImg(idx)}
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

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {ytId ? (
                <>
                  <button
                    onClick={() => setYtOpen(true)}
                    className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                    type="button"
                  >
                    Watch Video here
                  </button>
                  <a
                    href={ytWatchUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-center text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
                  >
                    Open in YouTube
                  </a>
                </>
              ) : ig && igEmbedUrl ? (
                <>
                  <button
                    onClick={() => setIgOpen(true)}
                    className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                    type="button"
                  >
                    Watch Video here
                  </button>
                  <a
                    href={ig.canonical}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-center text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
                  >
                    Open on Instagram
                  </a>
                </>
              ) : (
                <div className="sm:col-span-2 rounded-2xl border border-emerald-200 bg-white p-4 text-sm text-zinc-600">
                 Youtube - Instagram reel<span className="font-mono text-zinc-800">video_url</span>.
                </div>
              )}
            </div>
          </motion.div>

          <motion.aside
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 24, delay: 0.04 }}
            className="rounded-[28px] border border-emerald-200/70 bg-white/70 p-5 shadow-soft backdrop-blur"
          >
           {/* ✅ Support FIRST */}
<div>
  <p className="text-sm font-semibold text-zinc-900">Support</p>

  {donationButtons.length ? (
    <div className="mt-3 grid gap-2">
      {donationButtons.map((b, idx) => (
        <a
          key={`${b.url}-${idx}`}
          href={b.url}
          target="_blank"
          rel="noreferrer"
          className={
            idx === 0
              ? "block rounded-2xl bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              : "block rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-center text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
          }
        >
          {b.label || "Donate"}
        </a>
      ))}
    </div>
  ) : (
    <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
      No donation links yet.
    </div>
  )}

  <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-900/80">
    Donations happen through external links. Always verify details before sending money.
  </div>
</div>

{/* ✅ Story AFTER */}
<div className="mt-6">
  <p className="text-sm font-semibold text-zinc-900">Story</p>

  <div className="mt-3 rounded-3xl border border-emerald-200/70 bg-white p-5">
    <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700">
      {influencer.bio || "No story provided yet."}
    </p>
  </div>
</div>

          </motion.aside>
        </div>
      </section>

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

      <ImageModal open={imgOpen} onClose={() => setImgOpen(false)} src={activeUrl} alt={influencer.name} />
    </main>
  );
}
