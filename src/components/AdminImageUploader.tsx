"use client";

import { useRef, useState } from "react";

export type UploadState = {
  busy: boolean;
  progress: number;
  message: string;
  loadedBytes?: number;
  totalBytes?: number;
};

type Props = {
  onUploaded: (pathOrUrl: string) => void;

 
  inputRef?: React.RefObject<HTMLInputElement | null>;


  autoUpload?: boolean;

  
  hideUI?: boolean;

  accept?: string;

  onUploadStateChange?: (state: UploadState) => void;
};

function formatBytes(value?: number) {
  if (!value || !Number.isFinite(value) || value <= 0) return "0 MB";
  const mb = value / (1024 * 1024);
  if (mb >= 100) return `${Math.round(mb)} MB`;
  if (mb >= 10) return `${mb.toFixed(1)} MB`;
  return `${mb.toFixed(2)} MB`;
}

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
  const [loadedBytes, setLoadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);

  const setUploadState = (next: UploadState) => {
    setBusy(next.busy);
    setProgress(next.progress);
    setMsg(next.message);
    setLoadedBytes(next.loadedBytes ?? 0);
    setTotalBytes(next.totalBytes ?? 0);
    onUploadStateChange?.(next);
  };

  async function upload() {
    const file = ref.current?.files?.[0];
    if (!file) return;

    setUploadState({
      busy: true,
      progress: 0,
      message: "Uploading...",
      loadedBytes: 0,
      totalBytes: file.size,
    });

    try {
      const signRes = await fetch("/admin/upload-sign", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
        }),
      });

      const signText = await signRes.text();
      let signJson: {
        ok?: boolean;
        error?: string;
        signedUrl?: string;
        path?: string;
      } = {};
      try {
        signJson = JSON.parse(signText || "{}") as typeof signJson;
      } catch {
        const snippet = signText.replace(/\s+/g, " ").slice(0, 160);
        throw new Error(
          `Invalid upload-sign response (status ${signRes.status}). Response: ${snippet || "invalid JSON"}`
        );
      }

      if (!signRes.ok || !signJson.ok || !signJson.signedUrl || !signJson.path) {
        throw new Error(signJson.error || `Failed to prepare upload (status ${signRes.status})`);
      }
      const signedUrl = signJson.signedUrl;
      const signedPath = signJson.path;

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", signedUrl);
        xhr.setRequestHeader("Accept", "application/json");

        xhr.upload.onloadstart = () => {
          setUploadState({
            busy: true,
            progress: 0,
            message: "Uploading...",
            loadedBytes: 0,
            totalBytes: file.size,
          });
        };

        xhr.upload.onprogress = (event) => {
          const total = event.lengthComputable && event.total > 0 ? event.total : file.size;
          const loaded = Math.max(0, event.loaded || 0);
          const pct =
            total > 0
              ? Math.max(0, Math.min(100, Math.round((loaded / total) * 100)))
              : 0;

          setUploadState({
            busy: true,
            progress: pct,
            message: "Uploading...",
            loadedBytes: loaded,
            totalBytes: total,
          });
        };

        xhr.upload.onload = () => {
          setUploadState({
            busy: true,
            progress: 100,
            message: "Processing...",
            loadedBytes: file.size,
            totalBytes: file.size,
          });
        };

        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.onabort = () => reject(new Error("Upload canceled"));
        xhr.onload = () => {
          const rawText = String(xhr.responseText || "");
          const snippet = rawText.replace(/\s+/g, " ").slice(0, 160);
          if (xhr.status < 200 || xhr.status >= 300) {
            let errorMessage = "Upload failed";
            try {
              const parsed = JSON.parse(rawText || "{}") as { error?: string; message?: string };
              errorMessage = parsed.error || parsed.message || errorMessage;
            } catch {
              if (snippet) errorMessage = snippet;
            }
            reject(new Error(`Upload failed (status ${xhr.status}): ${errorMessage}`));
            return;
          }

          resolve();
        };

        const payload = new FormData();
        payload.append("cacheControl", "31536000");
        payload.append("", file);
        xhr.send(payload);
      });

      const raw = String(signedPath || "");
      if (!raw) throw new Error("Upload ok but missing path/url");

      const finalUrl = toPublicUrlMaybe(raw);
      onUploaded(finalUrl);

      if (ref.current) ref.current.value = "";
      setUploadState({
        busy: false,
        progress: 100,
        message: "Uploaded",
        loadedBytes: file.size,
        totalBytes: file.size,
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Upload failed";
      setUploadState({ busy: false, progress: 0, message, loadedBytes: 0, totalBytes: file.size });
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
            {msg.toLowerCase().includes("processing")
              ? "Processing..."
              : totalBytes && totalBytes > 0
              ? `Uploading... ${progress}% (${formatBytes(loadedBytes)} / ${formatBytes(totalBytes)})`
              : `Uploading... ${progress}%`}
          </p>
        </div>
      ) : null}

      {msg ? <p className="mt-2 text-xs text-zinc-600">{msg}</p> : null}
    </div>
  );
}
