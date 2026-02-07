"use client";

import { useRef, useState } from "react";

export type UploadState = {
  busy: boolean;
  progress: number;
  message: string;
};

type Props = {
  onUploaded: (pathOrUrl: string) => void;

 
  inputRef?: React.RefObject<HTMLInputElement | null>;


  autoUpload?: boolean;

  
  hideUI?: boolean;

  accept?: string;

  onUploadStateChange?: (state: UploadState) => void;
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
  accept = "image/*",
  onUploadStateChange,
}: Props) {
  const internalRef = useRef<HTMLInputElement | null>(null);
  const ref = inputRef ?? internalRef;

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [progress, setProgress] = useState(0);

  const setUploadState = (next: UploadState) => {
    setBusy(next.busy);
    setProgress(next.progress);
    setMsg(next.message);
    onUploadStateChange?.(next);
  };

  async function upload() {
    const file = ref.current?.files?.[0];
    if (!file) return;

    setUploadState({ busy: true, progress: 0, message: "Uploading..." });

    try {
      const fd = new FormData();
      fd.append("file", file);

      const json = await new Promise<{
        ok?: boolean;
        error?: string;
        publicUrl?: string;
        public_url?: string;
        url?: string;
        path?: string;
      }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/admin/upload");

        xhr.upload.onloadstart = () => {
          setUploadState({ busy: true, progress: 0, message: "Uploading..." });
        };

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const pct = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
          setUploadState({ busy: true, progress: pct, message: "Uploading..." });
        };

        xhr.upload.onload = () => {
          setUploadState({ busy: true, progress: 100, message: "Processing..." });
        };

        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.onabort = () => reject(new Error("Upload canceled"));
        xhr.onload = () => {
          let parsed: {
            ok?: boolean;
            error?: string;
            publicUrl?: string;
            public_url?: string;
            url?: string;
            path?: string;
          } = {};

          try {
            parsed = JSON.parse(xhr.responseText || "{}") as typeof parsed;
          } catch {
            reject(new Error("Invalid upload response"));
            return;
          }

          if (xhr.status < 200 || xhr.status >= 300) {
            reject(new Error(parsed.error || "Upload failed"));
            return;
          }

          resolve(parsed);
        };

        xhr.send(fd);
      });

      if (!json?.ok) throw new Error(json?.error || "Upload failed");

      const raw = String(json.publicUrl || json.public_url || json.url || json.path || "");
      if (!raw) throw new Error("Upload ok but missing path/url");

      const finalUrl = toPublicUrlMaybe(raw);
      onUploaded(finalUrl);

      if (ref.current) ref.current.value = "";
      setUploadState({ busy: false, progress: 100, message: "Uploaded" });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Upload failed";
      setUploadState({ busy: false, progress: 0, message });
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
          accept={accept}
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
          accept={accept}
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

      {busy ? (
        <div className="mt-3 space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full bg-emerald-600 transition-[width] duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs font-semibold text-emerald-700">
            {msg.toLowerCase().includes("processing") ? "Processing..." : `Uploading... ${progress}%`}
          </p>
        </div>
      ) : null}

      {msg ? <p className="mt-2 text-xs text-zinc-600">{msg}</p> : null}
    </div>
  );
}
