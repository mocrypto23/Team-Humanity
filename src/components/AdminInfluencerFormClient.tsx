"use client";

import { useEffect, useMemo, useState } from "react";
import type { DonationLinkItem, InfluencerRow } from "@/lib/types";
import AdminImageUploader from "@/components/AdminImageUploader";

function normalizeLinks(input: any): DonationLinkItem[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((x) => ({
      label: String(x?.label || "").trim(),
      url: String(x?.url || "").trim(),
    }))
    .filter((x) => x.url);
}

export default function AdminInfluencerFormClient({
  editing,
}: {
  editing: InfluencerRow | null;
}) {
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("");
  const [bio, setBio] = useState("");
  const [videoUrl, setVideoUrl] = useState("");


  const [highlightSlot, setHighlightSlot] = useState("");

  const [links, setLinks] = useState<DonationLinkItem[]>([
    { label: "Donate", url: "" },
  ]);

  const [isPublished, setIsPublished] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmedLabel, setConfirmedLabel] = useState("");

  const [imagePaths, setImagePaths] = useState<string[]>([]);

  useEffect(() => {
    setName(editing?.name ?? "");
    setSortOrder(editing?.sort_order != null ? String(editing.sort_order) : "");
    setBio(editing?.bio ?? "");
    setVideoUrl(editing?.video_url ?? "");


    setHighlightSlot(
      editing?.highlight_slot != null ? String(editing.highlight_slot) : ""
    );


    const fromNew = normalizeLinks(editing?.donation_links);
    const fromLegacy = editing?.donation_link
      ? [{ label: "Donate", url: String(editing.donation_link) }]
      : [];

    const nextLinks = fromNew.length
      ? fromNew
      : fromLegacy.length
      ? fromLegacy
      : [{ label: "Donate", url: "" }];

    setLinks(nextLinks);

    setIsPublished(!!editing?.is_published);
    setIsConfirmed(!!editing?.is_confirmed);
    setConfirmedLabel(editing?.confirmed_label ?? "");

    setImagePaths((editing?.image_paths ?? []).filter(Boolean) as string[]);
  }, [editing?.id]);

  const imagePathsJson = useMemo(() => JSON.stringify(imagePaths), [imagePaths]);
  const donationLinksJson = useMemo(() => JSON.stringify(links), [links]);

  return (
    <>
      <input type="hidden" name="id" value={editing?.id ?? ""} />

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold text-zinc-700">Story Title</span>
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            required
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-zinc-700">Sort order</span>
          <input
            name="sort_order"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            placeholder="0, 10, 20..."
          />
        </label>

        {/* ✅ NEW: Highlight slot */}
        <label className="block">
          <span className="text-xs font-semibold text-zinc-700">Highlight slot</span>
          <select
            name="highlight_slot"
            value={highlightSlot}
            onChange={(e) => setHighlightSlot(e.target.value)}
            className="mt-1 w-full rounded-xl border bg-white px-3 py-2 text-sm"
          >
            <option value="">None</option>
            <option value="1">Highlight #1</option>
            <option value="2">Highlight #2</option>
          </select>
          <p className="mt-1 text-[11px] text-zinc-500">
            Choose 1 or 2 to pin this person to the top of the page as a highlight.
          </p>
        </label>

        <label className="block md:col-span-2">
          <span className="text-xs font-semibold text-zinc-700">Bio</span>
          <textarea
            name="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            rows={3}
          />
        </label>

        <label className="block md:col-span-2">
          <span className="text-xs font-semibold text-zinc-700">
            Video URL (YouTube or Instagram Reel)
          </span>
          <input
            name="video_url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
            placeholder="https://youtube.com/watch?v=... OR https://instagram.com/reel/..."
          />
        </label>

        {/* donation_links */}
        <div className="block md:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-zinc-700">
              Donation links (multiple)
            </span>

            <button
              type="button"
              onClick={() =>
                setLinks((prev) => [...prev, { label: "Donate", url: "" }])
              }
              className="rounded-xl border bg-white px-3 py-1.5 text-xs font-semibold hover:bg-zinc-50"
            >
              + Add link
            </button>
          </div>

          <input type="hidden" name="donation_links" value={donationLinksJson} />

          <div className="mt-2 space-y-2 rounded-2xl border bg-white p-3">
            {links.map((l, idx) => (
              <div
                key={idx}
                className="grid gap-2 rounded-2xl border border-emerald-100 bg-white p-3 md:grid-cols-12"
              >
                <label className="md:col-span-4">
                  <span className="text-[11px] font-semibold text-zinc-600">
                    Label
                  </span>
                  <input
                    value={l.label}
                    onChange={(e) =>
                      setLinks((prev) =>
                        prev.map((x, i) =>
                          i === idx ? { ...x, label: e.target.value } : x
                        )
                      )
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                    placeholder="Donate / PayPal / Chuffed..."
                  />
                </label>

                <label className="md:col-span-7">
                  <span className="text-[11px] font-semibold text-zinc-600">URL</span>
                  <input
                    value={l.url}
                    onChange={(e) =>
                      setLinks((prev) =>
                        prev.map((x, i) =>
                          i === idx ? { ...x, url: e.target.value } : x
                        )
                      )
                    }
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
                    placeholder="https://..."
                  />
                </label>

                <div className="md:col-span-1 flex items-end justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setLinks((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

         
          </div>
        </div>

        {/* image_paths */}
        <div className="block md:col-span-2">
          <span className="text-xs font-semibold text-zinc-700">Images</span>
          <input type="hidden" name="image_paths" value={imagePathsJson} />

          <div className="mt-2 rounded-2xl border bg-white p-3">
            {imagePaths.length ? (
              <div className="space-y-2">
                {imagePaths.map((p) => (
                  <div
                    key={p}
                    className="flex items-center justify-between gap-2 rounded-xl border bg-zinc-50 px-3 py-2"
                  >
                    <code className="truncate text-xs">{p}</code>
                    <button
                      type="button"
                      onClick={() =>
                        setImagePaths((prev) => prev.filter((x) => x !== p))
                      }
                      className="rounded-lg border bg-white px-2 py-1 text-xs font-semibold hover:bg-zinc-100"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-zinc-600">No images yet.</p>
            )}

            <AdminImageUploader
              onUploaded={(path) => setImagePaths((prev) => [...prev, path])}
            />
          </div>
        </div>

        {/* flags */}
        <div className="flex flex-wrap items-center gap-4 md:col-span-2">
          <label className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm">
            <input
              type="checkbox"
              name="is_published"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
            />
            Published
          </label>

          <label className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm">
            <input
              type="checkbox"
              name="is_confirmed"
              checked={isConfirmed}
              onChange={(e) => setIsConfirmed(e.target.checked)}
            />
            Confirmed badge
          </label>

          <label className="flex-1 min-w-[240px]">
            <span className="text-xs font-semibold text-zinc-700">
              confirmed_label
            </span>
            <input
              name="confirmed_label"
              value={confirmedLabel}
              onChange={(e) => setConfirmedLabel(e.target.value)}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="Confirmed by Team Humanity"
            />
          </label>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="submit"
          className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Save
        </button>
      </div>
    </>
  );
}
