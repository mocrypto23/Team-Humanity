"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { InfluencerRow, DonationLinkItem } from "@/lib/types";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  Link as LinkIcon,
  Image as ImageIcon,
  Check,
  Video,
  ExternalLink,
  UploadCloud,
  Pin,
  PinOff,
} from "lucide-react";

import AdminImageUploader, { type UploadState } from "@/components/AdminImageUploader";
import {
  upsertInfluencer,
  deleteInfluencer,
  moveInfluencerSort,
  setInfluencerPin,
  upsertSiteCopy,
} from "@/app/admin/actions";

const DONATION_LABELS = ["GoFundMe", "Chuffed", "PayPal", "Other"] as const;
type DonationLabelPreset = (typeof DONATION_LABELS)[number];
const INSTAGRAM_PROFILE_LABEL = "__instagram_profile__";

type DonationFormItem = {
  labelPreset: DonationLabelPreset;
  customLabel: string;
  url: string;
};

type SiteCopy = {
  headlineLine1: string;
  headlineLine2: string;
  subheading: string;
};

const EMPTY_UPLOAD_STATE: UploadState = {
  busy: false,
  progress: 0,
  message: "",
  loadedBytes: 0,
  totalBytes: 0,
};

function buildReturnTo(pathname: string, sp: URLSearchParams) {
  const q = sp.toString();
  return q ? `${pathname}?${q}` : pathname;
}

function normalizeLinks(input: unknown): DonationLinkItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((x) => {
      const row = (x || {}) as { label?: unknown; url?: unknown };
      return {
        label: String(row.label || "Donate").trim() || "Donate",
        url: String(row.url || "").trim(),
      };
    })
    .filter((x) => x.url);
}

function firstUrlFromLegacy(row: InfluencerRow) {
  const legacy = row?.donation_link ? String(row.donation_link).trim() : "";
  return legacy ? legacy : "";
}

function getRowLinks(row: InfluencerRow): DonationLinkItem[] {
  const fromNew = normalizeLinks(row?.donation_links);
  if (fromNew.length) return fromNew;
  const legacy = firstUrlFromLegacy(row);
  return legacy ? [{ label: "Donate", url: legacy }] : [];
}

function resolveStorageSrc(raw: string) {
  const p = String(raw || "").trim();
  if (!p) return "";

  if (p.startsWith("http://") || p.startsWith("https://") || p.startsWith("data:")) return p;

  const clean = p.startsWith("/") ? p.slice(1) : p;

  const base = String(process.env.NEXT_PUBLIC_SUPABASE_URL || "")
    .trim()
    .replace(/\/+$/, "");
  const bucket = String(process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "").trim();

  if (!base || !bucket) return `/${clean}`;

  const safePath = clean.split("/").map(encodeURIComponent).join("/");
  return `${base}/storage/v1/object/public/${encodeURIComponent(bucket)}/${safePath}`;
}

function isLegacyExternalVideoUrl(raw: string) {
  const v = String(raw || "").trim();
  if (!v) return false;

  try {
    const host = new URL(v).hostname.toLowerCase();
    return (
      host.includes("youtube.com") ||
      host.includes("youtu.be") ||
      host.includes("instagram.com") ||
      host.includes("instagr.am")
    );
  } catch {
    return false;
  }
}

function getFirstImage(row: InfluencerRow) {
  const arr = (row?.image_paths ?? []).filter(Boolean) as string[];
  const first = arr[0] ? String(arr[0]) : "";
  return resolveStorageSrc(first);
}

function clampText(s: string, max = 120) {
  const v = String(s || "").replace(/\s+/g, " ").trim();
  if (!v) return "";
  return v.length > max ? `${v.slice(0, max).trim()}...` : v;
}

function isPresetLabel(label: string) {
  return (DONATION_LABELS as readonly string[]).includes(label);
}

function formatBytes(value?: number) {
  if (!value || !Number.isFinite(value) || value <= 0) return "0 MB";
  const mb = value / (1024 * 1024);
  if (mb >= 100) return `${Math.round(mb)} MB`;
  if (mb >= 10) return `${mb.toFixed(1)} MB`;
  return `${mb.toFixed(2)} MB`;
}

function normalizeExternalUrl(raw: string) {
  const v = String(raw || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

function isInstagramProfileUrl(raw: string) {
  try {
    const u = new URL(normalizeExternalUrl(raw));
    const host = u.hostname.toLowerCase();
    if (!host.includes("instagram.com") && !host.includes("instagr.am")) return false;

    const first = u.pathname.split("/").filter(Boolean)[0]?.toLowerCase() || "";
    if (!first) return false;
    return !["p", "reel", "reels", "tv"].includes(first);
  } catch {
    return false;
  }
}

function isInstagramProfileEntry(label: string, url: string) {
  const l = String(label || "").trim().toLowerCase();
  if (l === INSTAGRAM_PROFILE_LABEL) return true;
  return isInstagramProfileUrl(url);
}

function extractInstagramProfileUrl(links: DonationLinkItem[]) {
  const direct = links.find((x) => String(x.label || "").trim().toLowerCase() === INSTAGRAM_PROFILE_LABEL);
  if (direct?.url) return String(direct.url).trim();

  const fallback = links.find((x) => isInstagramProfileEntry(String(x.label || ""), String(x.url || "")));
  if (fallback?.url) return String(fallback.url).trim();

  return "";
}

function removeInstagramProfileLinks(links: DonationLinkItem[]) {
  return links.filter((x) => !isInstagramProfileEntry(String(x.label || ""), String(x.url || "")));
}

function UploadProgress({
  state,
  label,
}: {
  state: UploadState;
  label: string;
}) {
  if (!state.busy && !state.message) return null;

  if (state.busy) {
    const isProcessing = state.message.toLowerCase().includes("processing");
    return (
      <div className="mt-3 space-y-1">
        <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full bg-emerald-600 transition-[width] duration-150"
            style={{ width: `${state.progress}%` }}
          />
        </div>
        <p className="text-xs font-semibold text-emerald-700">
          {isProcessing
            ? `Processing ${label}...`
            : state.totalBytes && state.totalBytes > 0
            ? `Uploading ${label}... ${state.progress}% (${formatBytes(state.loadedBytes)} / ${formatBytes(
                state.totalBytes
              )})`
            : `Uploading ${label}... ${state.progress}%`}
        </p>
      </div>
    );
  }

  const isError = state.message.toLowerCase().includes("failed") || state.message.toLowerCase().includes("error");
  return (
    <p className={`mt-3 text-xs font-semibold ${isError ? "text-red-600" : "text-emerald-700"}`}>
      {state.message}
    </p>
  );
}

export default function AdminInfluencersClient({
  influencers,
  siteCopy,
}: {
  influencers: InfluencerRow[];
  siteCopy: SiteCopy;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const ok = sp.get("ok");
  const err = sp.get("err");

  const [toastSec, setToastSec] = useState(0);
  const timerRef = useRef<number | null>(null);
  const navRef = useRef<number | null>(null);

  useEffect(() => {
    if (ok !== "saved") return;

    const next = new URLSearchParams(sp.toString());
    next.delete("edit");
    next.delete("new");
    router.replace(`${pathname}?${next.toString()}#top`);

    setToastSec(3);

    if (timerRef.current) window.clearInterval(timerRef.current);
    if (navRef.current) window.clearTimeout(navRef.current);

    timerRef.current = window.setInterval(() => {
      setToastSec((s) => (s > 0 ? s - 1 : 0));
    }, 1000);

    navRef.current = window.setTimeout(() => {
      router.replace(`${pathname}#top`);
    }, 3000);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (navRef.current) window.clearTimeout(navRef.current);
      timerRef.current = null;
      navRef.current = null;
    };
  }, [ok]);

  const editIdRaw = sp.get("edit") || "";
  const editId = editIdRaw ? Number(editIdRaw) : NaN;
  const isEditMode = Number.isFinite(editId);

  const isCreateMode = sp.get("new") === "1";
  const isModalOpen = isCreateMode || isEditMode;

  const editing = useMemo(() => {
    if (!isEditMode) return null;
    return influencers.find((x) => x.id === editId) ?? null;
  }, [isEditMode, editId, influencers]);

  const returnTo = buildReturnTo(pathname, sp);

  const pinned1 = influencers.find((x) => Number(x.highlight_slot) === 1) ?? null;
  const pinned2 = influencers.find((x) => Number(x.highlight_slot) === 2) ?? null;

  const pinnedCount = (pinned1 ? 1 : 0) + (pinned2 ? 1 : 0);

  const orderedInfluencers = useMemo(() => {
    const pinned = [pinned1, pinned2].filter(Boolean) as InfluencerRow[];

    const rest = influencers
      .filter((x) => Number(x.highlight_slot) !== 1 && Number(x.highlight_slot) !== 2)
      .slice();

    rest.sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));

    return [...pinned, ...rest];
  }, [influencers, pinned1, pinned2]);

  const nonPinnedIndexMap = useMemo(() => {
    const rest = influencers
      .filter((x) => Number(x.highlight_slot) !== 1 && Number(x.highlight_slot) !== 2)
      .slice()
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));

    const m = new Map<number, number>();
    rest.forEach((r, i) => m.set(r.id, i));
    return { map: m, len: rest.length };
  }, [influencers]);

  const isPinned = (row: InfluencerRow) =>
    Number(row.highlight_slot) === 1 || Number(row.highlight_slot) === 2;

  const nextFreeSlot = () => {
    if (!pinned1) return "1";
    if (!pinned2) return "2";
    return "";
  };

  const [storyTitle, setStoryTitle] = useState("");
  const [bio, setBio] = useState("");
  const [instagramProfileUrl, setInstagramProfileUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const [isPublished, setIsPublished] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const [confirmedLabel, setConfirmedLabel] = useState<string>("");
  const [siteCopyOpen, setSiteCopyOpen] = useState(false);
  const [siteHeadline1, setSiteHeadline1] = useState(siteCopy.headlineLine1 || "");
  const [siteHeadline2, setSiteHeadline2] = useState(siteCopy.headlineLine2 || "");
  const [siteSubheading, setSiteSubheading] = useState(siteCopy.subheading || "");

  const [donationLinks, setDonationLinks] = useState<DonationFormItem[]>([
    { labelPreset: "GoFundMe", customLabel: "", url: "" },
  ]);

  const [imagePaths, setImagePaths] = useState<string[]>([]);
  const [imageUploadState, setImageUploadState] = useState<UploadState>(EMPTY_UPLOAD_STATE);
  const [videoUploadState, setVideoUploadState] = useState<UploadState>(EMPTY_UPLOAD_STATE);

  const resetForm = () => {
    setStoryTitle("");
    setBio("");
    setInstagramProfileUrl("");
    setVideoUrl("");
    setDonationLinks([{ labelPreset: "GoFundMe", customLabel: "", url: "" }]);
    setImagePaths([]);
    setImageUploadState(EMPTY_UPLOAD_STATE);
    setVideoUploadState(EMPTY_UPLOAD_STATE);
    setIsPublished(false);
    setIsConfirmed(false);
    setConfirmedLabel("");
  };

  useEffect(() => {
    if (!isModalOpen) return;
    setImageUploadState(EMPTY_UPLOAD_STATE);
    setVideoUploadState(EMPTY_UPLOAD_STATE);

    if (editing) {
      setStoryTitle(editing.name ?? "");
      setBio(editing.bio ?? "");
      setInstagramProfileUrl("");
      setVideoUrl(editing.video_url ?? "");

      setIsPublished(!!editing.is_published);
      setIsConfirmed(!!editing.is_confirmed);

      setConfirmedLabel(editing.confirmed_label ?? "");

      const links = getRowLinks(editing);
      const instagramUrl = extractInstagramProfileUrl(links);
      const donationOnly = removeInstagramProfileLinks(links);
      setInstagramProfileUrl(instagramUrl);

      setDonationLinks(
        donationOnly.length
          ? donationOnly.map((x) => {
              const rawLabel = String(x.label || "").trim() || "Other";
              const url = String(x.url || "").trim();

              if (isPresetLabel(rawLabel)) {
                return {
                  labelPreset: rawLabel as DonationLabelPreset,
                  customLabel: "",
                  url,
                };
              }

              return {
                labelPreset: "Other",
                customLabel: rawLabel || "",
                url,
              };
            })
          : [{ labelPreset: "GoFundMe", customLabel: "", url: "" }]
      );

      setImagePaths(((editing.image_paths ?? []) as string[]).filter(Boolean));
    } else {
      resetForm();
    }
  }, [isModalOpen, editing?.id]);

  const openSiteCopy = () => {
    setSiteHeadline1(siteCopy.headlineLine1 || "");
    setSiteHeadline2(siteCopy.headlineLine2 || "");
    setSiteSubheading(siteCopy.subheading || "");
    setSiteCopyOpen(true);
  };

  const donationLinksJson = useMemo(() => {
    const items: DonationLinkItem[] = donationLinks
      .map((x) => {
        const label =
          x.labelPreset === "Other"
            ? String(x.customLabel || "").trim() || "Donate"
            : x.labelPreset;

        const url = String(x.url || "").trim();
        return { label, url };
      })
      .filter((x) => x.url);

    const profile = normalizeExternalUrl(instagramProfileUrl);
    if (profile && isInstagramProfileUrl(profile)) {
      items.push({ label: INSTAGRAM_PROFILE_LABEL, url: profile });
    }

    return JSON.stringify(items);
  }, [donationLinks, instagramProfileUrl]);

  const imagePathsJson = useMemo(() => {
    const arr = imagePaths.map((x) => String(x || "").trim()).filter(Boolean);
    return JSON.stringify(arr);
  }, [imagePaths]);

  const closeModal = () => {
    const next = new URLSearchParams(sp.toString());
    next.delete("edit");
    next.delete("new");
    const q = next.toString();
    router.push(q ? `${pathname}?${q}#top` : `${pathname}#top`);
  };

  const openCreate = () => {
    const next = new URLSearchParams(sp.toString());
    next.delete("edit");
    next.set("new", "1");
    router.push(`${pathname}?${next.toString()}#top`);
  };

  const openEdit = (id: number) => {
    const next = new URLSearchParams(sp.toString());
    next.delete("new");
    next.set("edit", String(id));
    router.push(`${pathname}?${next.toString()}#top`);
  };

  // Donation helpers (Label + URL)
  const updateDonationUrl = (idx: number, url: string) => {
    setDonationLinks((prev) => prev.map((x, i) => (i === idx ? { ...x, url } : x)));
  };

  const updateDonationLabelPreset = (idx: number, labelPreset: DonationLabelPreset) => {
    setDonationLinks((prev) =>
      prev.map((x, i) =>
        i === idx
          ? {
              ...x,
              labelPreset,
              customLabel: labelPreset === "Other" ? x.customLabel : "",
            }
          : x
      )
    );
  };

  const updateDonationCustomLabel = (idx: number, customLabel: string) => {
    setDonationLinks((prev) => prev.map((x, i) => (i === idx ? { ...x, customLabel } : x)));
  };

  const addDonationLink = () => {
    setDonationLinks((prev) => [...prev, { labelPreset: "GoFundMe", customLabel: "", url: "" }]);
  };

  const removeDonationLink = (idx: number) => {
    setDonationLinks((prev) => prev.filter((_, i) => i !== idx));
  };

  // images helpers
  const firstImageRaw = imagePaths[0] ? String(imagePaths[0]) : "";
  const firstImage = resolveStorageSrc(firstImageRaw);
  const videoPreview = resolveStorageSrc(videoUrl);
  const hasLegacyExternalVideo = isLegacyExternalVideoUrl(videoUrl);

  const removeFirstImage = () => setImagePaths((prev) => prev.slice(1));
  const removeVideo = () => setVideoUrl("");

  const onImageUploaded = (pathOrUrl: string) => {
    const p = String(pathOrUrl || "").trim();
    if (!p) return;

    setImagePaths((prev) => {
      if (!prev.length) return [p];
      return [p, ...prev.slice(1)];
    });
  };

  const onVideoUploaded = (pathOrUrl: string) => {
    const p = String(pathOrUrl || "").trim();
    if (!p) return;
    setVideoUrl(p);
  };

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const openImagePicker = () => imageInputRef.current?.click();
  const openVideoPicker = () => videoInputRef.current?.click();

  return (
    <div className="space-y-6 overflow-x-hidden" id="top">
      {toastSec > 0 ? (
        <div className="fixed top-4 right-4 z-[9999] rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900 shadow-lg">
          Done - closing in {toastSec}s
        </div>
      ) : null}

      {/* Top bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900">Influencers</h1>
          <p className="text-zinc-600 mt-1">Manage profiles, stories, and donation links.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={openSiteCopy}
            className="w-full sm:w-auto justify-center border border-emerald-200 bg-white/80 text-emerald-800 px-5 py-2.5 rounded-2xl font-semibold transition-colors shadow-sm hover:bg-emerald-50 flex items-center gap-2"
          >
            Edit website info
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="w-full sm:w-auto justify-center bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl font-medium transition-colors shadow-lg shadow-emerald-200 flex items-center gap-2 transform active:scale-95"
          >
            <Plus className="w-5 h-5" /> Create New
          </button>
        </div>
      </div>

      {/* status */}
      {(ok || err) && (
        <div className="space-y-2">
          {ok ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
              Saved
            </div>
          ) : null}

          {err ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              Error: {err}
            </div>
          ) : null}
        </div>
      )}

      {/* List */}
      <div className="space-y-4">
        {orderedInfluencers.map((item) => {
          const linksCount = getRowLinks(item).length;
          const avatar = getFirstImage(item);

          const pinned = isPinned(item);
          const canPinMore = pinned || pinnedCount < 2;

          // slot computed
          const slotForAction = pinned ? "" : nextFreeSlot(); // "" => unpin
          const pinDisabled = !pinned && (!canPinMore || !slotForAction);

          const nonPinnedIdx = nonPinnedIndexMap.map.get(item.id);
          const disableUp = pinned || nonPinnedIdx == null ? true : nonPinnedIdx === 0;
          const disableDown =
            pinned || nonPinnedIdx == null ? true : nonPinnedIdx === nonPinnedIndexMap.len - 1;

          return (
            <div
              key={item.id}
              className="bg-white/90 backdrop-blur rounded-3xl p-4 sm:p-5 shadow-sm border border-zinc-100 flex flex-col md:flex-row items-start md:items-center gap-4 sm:gap-6 transition-all hover:shadow-lg hover:border-emerald-200"
            >
              {/* Sort Controls */}
              <div className="flex flex-row md:flex-col gap-2 md:gap-1 bg-zinc-50 p-1 rounded-xl">
                <form action={moveInfluencerSort}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="dir" value="up" />
                  <input type="hidden" name="return_to" value={returnTo} />
                  <button
                    type="submit"
                    disabled={disableUp}
                    className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-zinc-400 hover:text-emerald-600 disabled:opacity-30 transition-all"
                    title="Move up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                </form>

                <form action={moveInfluencerSort}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="dir" value="down" />
                  <input type="hidden" name="return_to" value={returnTo} />
                  <button
                    type="submit"
                    disabled={disableDown}
                    className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-zinc-400 hover:text-emerald-600 disabled:opacity-30 transition-all"
                    title="Move down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* Avatar */}
              <div className="w-24 h-20 bg-zinc-100 rounded-2xl flex-shrink-0 overflow-hidden border border-zinc-200 relative">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-zinc-300 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 min-w-0">
                  <h3 className="font-bold text-lg text-zinc-900 truncate">{item.name}</h3>

                  {pinned ? (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-100 px-2 py-0.5 text-[11px] font-extrabold text-red-600"
                      title={`Pinned (#${item.highlight_slot})`}
                    >
                      <Pin className="w-3.5 h-3.5" /> PIN
                    </span>
                  ) : null}

                  {item.is_confirmed ? (
                    <span className="bg-blue-500 text-white p-0.5 rounded-full shadow-sm" title="Confirmed">
                      <Check className="w-3 h-3" />
                    </span>
                  ) : null}
                </div>

                <p className="text-sm text-zinc-500 line-clamp-1 mb-2 leading-relaxed">
                  {clampText(item.bio || "", 110)}
                </p>

                <div className="flex flex-wrap gap-2 text-xs font-medium">
                  {item.video_url ? (
                    <a
                      href={resolveStorageSrc(String(item.video_url))}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Video className="w-3.5 h-3.5" /> Video
                    </a>
                  ) : null}

                  {linksCount > 0 ? (
                    <span className="flex items-center gap-1 bg-emerald-50 px-2.5 py-1.5 rounded-lg text-emerald-700">
                      <LinkIcon className="w-3.5 h-3.5" /> {linksCount} Links
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-row md:flex-col items-center gap-3 border-t md:border-t-0 md:border-l border-zinc-100 pt-4 md:pt-0 pl-0 md:pl-6 w-full md:w-auto justify-between md:justify-center">
                <div className="flex items-center gap-2">
                  {/* PIN */}
                  <form action={setInfluencerPin}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="slot" value={slotForAction} />
                    <input type="hidden" name="return_to" value={returnTo} />
                    <button
                      type="submit"
                      disabled={pinDisabled}
                      className={`p-2 rounded-xl transition-all border ${
                        pinned
                          ? "bg-red-50 text-red-600 border-red-100 hover:bg-red-100"
                          : "bg-zinc-50 text-zinc-700 border-transparent hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-100"
                      } ${pinDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
                      title={
                        pinned
                          ? "Unpin"
                          : pinDisabled
                          ? "Max 2 pins"
                          : `Pin to top (#${slotForAction})`
                      }
                    >
                      {pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                    </button>
                  </form>

                  <button
                    type="button"
                    onClick={() => openEdit(item.id)}
                    className="p-2 bg-zinc-50 hover:bg-emerald-50 text-zinc-600 hover:text-emerald-600 rounded-xl transition-all border border-transparent hover:border-emerald-100"
                    title="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  <form action={deleteInfluencer}>
                    <input type="hidden" name="id" value={item.id} />
                    <button
                      type="submit"
                      className="p-2 bg-zinc-50 hover:bg-red-50 text-zinc-600 hover:text-red-500 rounded-xl transition-all border border-transparent hover:border-red-100"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </form>
                </div>

                <div className="flex flex-col md:items-end gap-1">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      item.is_published
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : "bg-zinc-50 text-zinc-500 border-zinc-100"
                    }`}
                  >
                    {item.is_published ? "Published" : "Draft"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {orderedInfluencers.length === 0 ? (
          <div className="text-center py-16 bg-white/50 rounded-3xl border border-dashed border-zinc-200">
            <p className="text-zinc-500 font-medium">No influencers yet.</p>
          </div>
        ) : null}
      </div>

      {siteCopyOpen && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto p-3 sm:p-4 bg-zinc-900/40 backdrop-blur-md">
          <div className="my-4 sm:my-0 bg-white rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="p-4 sm:p-6 border-b border-zinc-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg sm:text-xl font-bold text-zinc-900">Edit website info</h2>

              <button
                type="button"
                onClick={() => setSiteCopyOpen(false)}
                className="p-2 hover:bg-zinc-100 rounded-full text-zinc-500 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form action={upsertSiteCopy} className="p-4 sm:p-6 md:p-8 space-y-6">
              <input type="hidden" name="return_to" value={returnTo} />

              <div>
                <label className="block text-sm font-bold text-zinc-800 mb-2">Headline line 1</label>
                <input
                  name="headline_line1"
                  type="text"
                  value={siteHeadline1}
                  onChange={(e) => setSiteHeadline1(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm"
                  placeholder="Help directly."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-800 mb-2">Headline line 2</label>
                <input
                  name="headline_line2"
                  type="text"
                  value={siteHeadline2}
                  onChange={(e) => setSiteHeadline2(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm"
                  placeholder="Transparently."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-800 mb-2">Subheading</label>
                <textarea
                  name="subheading"
                  value={siteSubheading}
                  onChange={(e) => setSiteSubheading(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all h-32 resize-none shadow-sm"
                  placeholder="Team Humanity is a curated space..."
                  required
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setSiteCopyOpen(false)}
                  className="sm:w-auto w-full rounded-2xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sm:w-auto w-full rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
                >
                  Save website info
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto p-3 sm:p-4 bg-zinc-900/40 backdrop-blur-md">
          <div className="my-4 sm:my-0 bg-white rounded-2xl sm:rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Header */}
            <div className="p-4 sm:p-4 sm:p-6 border-b border-zinc-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h2 className="text-lg sm:text-xl font-bold text-zinc-900">
                {editing ? "Edit Influencer" : "Create New Influencer"}
              </h2>

              <button
                type="button"
                onClick={closeModal}
                className="p-2 hover:bg-zinc-100 rounded-full text-zinc-500 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form action={upsertInfluencer} className="p-4 sm:p-6 md:p-8 space-y-6">
              <input type="hidden" name="id" value={editing?.id ?? ""} />
              <input type="hidden" name="donation_links" value={donationLinksJson} />
              <input type="hidden" name="image_paths" value={imagePathsJson} />
              <input type="hidden" name="video_url" value={videoUrl} />

              {/* Story Title */}
              <div>
                <label className="block text-sm font-bold text-zinc-800 mb-2">Story Title</label>
                <input
                  name="name"
                  type="text"
                  value={storyTitle}
                  onChange={(e) => setStoryTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-sm"
                  placeholder="e.g. Building a Well in Ghana"
                  required
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-bold text-zinc-800 mb-2">Bio / Story</label>
                <textarea
                  name="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all h-32 resize-none shadow-sm"
                  placeholder="Tell the story..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-zinc-800 mb-2">Instagram Profile URL</label>
                <input
                  type="url"
                  value={instagramProfileUrl}
                  onChange={(e) => setInstagramProfileUrl(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm transition-all"
                  placeholder="https://instagram.com/username"
                />
              </div>

              {/* Video Upload */}
              <div>
                <label className="block text-sm font-bold text-zinc-800 mb-3">Video</label>

                <AdminImageUploader
                  onUploaded={onVideoUploaded}
                  inputRef={videoInputRef}
                  hideUI
                  autoUpload
                  accept="video/mp4,video/webm,video/quicktime"
                  onUploadStateChange={setVideoUploadState}
                />

                {!videoUrl ? (
                  <button
                    type="button"
                    onClick={openVideoPicker}
                    disabled={videoUploadState.busy}
                    className="w-full h-32 border-2 border-dashed border-zinc-300 rounded-2xl flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50 transition-all group"
                  >
                    <div className="p-3 bg-zinc-100 rounded-full group-hover:bg-white transition-colors">
                      <Video className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold">Click to Upload Video</span>
                    <span className="text-xs text-zinc-500">MP4 / WEBM / MOV</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    {hasLegacyExternalVideo ? (
                      <a
                        href={videoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                      >
                        Legacy external video link detected. Open current link.
                      </a>
                    ) : (
                      <div className="relative w-full rounded-2xl overflow-hidden border border-zinc-200 bg-black">
                        <video src={videoPreview} controls className="w-full h-56 object-contain bg-black" />
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={openVideoPicker}
                        disabled={videoUploadState.busy}
                        className="text-sm font-bold text-emerald-600 hover:text-emerald-700"
                      >
                        Change video
                      </button>
                      <button
                        type="button"
                        onClick={removeVideo}
                        disabled={videoUploadState.busy}
                        className="text-sm font-bold text-red-500 hover:text-red-600"
                      >
                        Remove video
                      </button>
                    </div>
                  </div>
                )}

                <UploadProgress state={videoUploadState} label="video" />
              </div>

              {/* Donation Links */}
              <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-200">
                <label className="block text-sm font-bold text-zinc-800 mb-3">Donation Links</label>

                <div className="space-y-3">
                  {donationLinks.map((item, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 gap-2 sm:grid-cols-[220px_1fr_auto] sm:items-center"
                    >
                      {/* Label */}
                      <div className="flex gap-2">
                        <select
                          value={item.labelPreset}
                          onChange={(e) =>
                            updateDonationLabelPreset(idx, e.target.value as DonationLabelPreset)
                          }
                          className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          {DONATION_LABELS.map((l) => (
                            <option key={l} value={l}>
                              {l}
                            </option>
                          ))}
                        </select>

                        {item.labelPreset === "Other" ? (
                          <input
                            type="text"
                            value={item.customLabel}
                            onChange={(e) => updateDonationCustomLabel(idx, e.target.value)}
                            className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="Custom label"
                          />
                        ) : null}
                      </div>

                      {/* URL */}
                      <div className="relative">
                        <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                          type="text"
                          value={item.url}
                          onChange={(e) => updateDonationUrl(idx, e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-zinc-300 text-zinc-900 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                          placeholder="https://..."
                        />
                      </div>

                      {/* Remove */}
                      {donationLinks.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => removeDonationLink(idx)}
                          className="p-2.5 bg-white border border-zinc-200 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          title="Remove link"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="hidden sm:block" />
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addDonationLink}
                    className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 mt-2 px-1"
                  >
                    <Plus className="w-4 h-4" /> Add another link
                  </button>
                </div>
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-bold text-zinc-800 mb-3">Images</label>

                {/* uploader hidden but functional */}
                <AdminImageUploader
                  onUploaded={onImageUploaded}
                  inputRef={imageInputRef}
                  hideUI
                  autoUpload
                  onUploadStateChange={setImageUploadState}
                />

                {!firstImage ? (
                  <button
                    type="button"
                    onClick={openImagePicker}
                    disabled={imageUploadState.busy}
                    className="w-full h-32 border-2 border-dashed border-zinc-300 rounded-2xl flex flex-col items-center justify-center gap-2 text-zinc-500 hover:text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50 transition-all group"
                  >
                    <div className="p-3 bg-zinc-100 rounded-full group-hover:bg-white transition-colors">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold">Click to Upload Image</span>
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="relative w-full h-48 rounded-2xl overflow-hidden group border border-zinc-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={firstImage} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button
                          type="button"
                          onClick={removeFirstImage}
                          className="bg-white text-red-500 px-4 py-2 rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" /> Delete Image
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={openImagePicker}
                      disabled={imageUploadState.busy}
                      className="text-sm font-bold text-emerald-600 hover:text-emerald-700"
                    >
                      Change image
                    </button>
                  </div>
                )}

                <UploadProgress state={imageUploadState} label="image" />
              </div>

              {/* confirmed_label */}
              <div>
                <label className="block text-sm font-bold text-zinc-800 mb-2">confirmed_label</label>
                <input
                  name="confirmed_label"
                  value={confirmedLabel}
                  onChange={(e) => setConfirmedLabel(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm transition-all"
                  placeholder="Confirmed by Team Humanity"
                />
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-10 pt-4 border-t border-zinc-100">
                <input type="checkbox" name="is_published" checked={isPublished} readOnly className="hidden" />
                <input type="checkbox" name="is_confirmed" checked={isConfirmed} readOnly className="hidden" />

                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setIsPublished((v) => !v)}
                  role="switch"
                  aria-checked={isPublished}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setIsPublished((v) => !v);
                  }}
                >
                  <div className={`w-12 h-6 rounded-full relative transition-colors ${isPublished ? "bg-emerald-500" : "bg-zinc-200"}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-all ${isPublished ? "left-7" : "left-1"}`} />
                  </div>
                  <span className="text-sm font-bold text-zinc-700 select-none">Published</span>
                </div>

                <div
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => setIsConfirmed((v) => !v)}
                  role="switch"
                  aria-checked={isConfirmed}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setIsConfirmed((v) => !v);
                  }}
                >
                  <div className={`w-12 h-6 rounded-full relative transition-colors ${isConfirmed ? "bg-blue-500" : "bg-zinc-200"}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-all ${isConfirmed ? "left-7" : "left-1"}`} />
                  </div>
                  <span className="text-sm font-bold text-zinc-700 select-none">Confirmed</span>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2.5 rounded-xl font-bold text-zinc-600 hover:bg-white hover:border hover:border-zinc-200 hover:shadow-sm transition-all"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95"
                >
                  {editing ? "Save Changes" : "Create Influencer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}





