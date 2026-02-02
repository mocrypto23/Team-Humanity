"use client";

import { useRef, useState } from "react";

export default function AdminImageUploader({
  onUploaded,
}: {
  onUploaded: (path: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");

  async function upload() {
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    setBusy(true);
    setMsg("");

    try {
      const fd = new FormData();
      fd.append("file", file);

      // مهم: أنت حاطط الراوت عند /admin/upload
      const res = await fetch("/admin/upload", { method: "POST", body: fd });
      const json = await res.json();

      if (!json?.ok) throw new Error(json?.error || "Upload failed");

      onUploaded(String(json.path));
      if (inputRef.current) inputRef.current.value = "";
      setMsg("Uploaded");
    } catch (e: any) {
      setMsg(e?.message || "Upload failed");
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(""), 1200);
    }
  }

  return (
    <div className="mt-3 rounded-2xl border bg-white p-3">
      <p className="text-xs font-semibold text-zinc-700">Upload image</p>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
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
