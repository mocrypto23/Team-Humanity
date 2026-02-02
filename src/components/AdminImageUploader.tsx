"use client";

import { useRef, useState } from "react";

type Props = {
  onUploaded: (pathOrUrl: string) => void;

 
  inputRef?: React.RefObject<HTMLInputElement | null>;


  autoUpload?: boolean;

  
  hideUI?: boolean;
};

function toPublicUrlMaybe(pathOrUrl: string) {
  const p = String(pathOrUrl || "").trim();
  if (!p) return "";

  if (p.startsWith("http://") || p.startsWith("https://") || p.startsWith("data:")) return p;

  if (p.startsWith("/")) return p;

  const base = String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const bucket = String(process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "").trim();

  if (!base || !bucket) return `/${p}`;

  const safePath = p.split("/").map(encodeURIComponent).join("/");
  return `${base.replace(/\/+$/, "")}/storage/v1/object/public/${encodeURIComponent(
    bucket
  )}/${safePath}`;
}

export default function AdminImageUploader({
  onUploaded,
  inputRef,
  autoUpload = true,
  hideUI = false,
}: Props) {
  const internalRef = useRef<HTMLInputElement | null>(null);
  const ref = inputRef ?? internalRef;

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  async function upload() {
    const file = ref.current?.files?.[0];
    if (!file) return;

    setBusy(true);
    setMsg("");

    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/admin/upload", { method: "POST", body: fd });
      const json = await res.json();

      if (!json?.ok) throw new Error(json?.error || "Upload failed");

      const raw = String(json.publicUrl || json.public_url || json.url || json.path || "");
      if (!raw) throw new Error("Upload ok but missing path/url");

      const finalUrl = toPublicUrlMaybe(raw);
      onUploaded(finalUrl);

      if (ref.current) ref.current.value = "";
      setMsg("Uploaded");
    } catch (e: any) {
      setMsg(e?.message || "Upload failed");
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(""), 1200);
    }
  }

  const onPickFile = async () => {
    if (!autoUpload) return;
    setTimeout(() => {
      upload();
    }, 0);
  };

  if (hideUI) {
    return (
      <div className="sr-only">
        <input
          ref={ref}
          type="file"
          accept="image/*"
          onChange={onPickFile}
        />
        {msg ? <p className="mt-2 text-xs text-zinc-600">{msg}</p> : null}
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl border bg-white p-3">
      <p className="text-xs font-semibold text-zinc-700">Upload image</p>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          ref={ref}
          type="file"
          accept="image/*"
          onChange={onPickFile}
          className="w-full rounded-xl border bg-white px-3 py-2 text-sm"
        />

        <button
          type="button"
          onClick={upload}
          disabled={busy}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? "Uploading..." : "Upload"}
        </button>
      </div>

      {msg ? <p className="mt-2 text-xs text-zinc-600">{msg}</p> : null}
    </div>
  );
}
