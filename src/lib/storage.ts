export function publicStorageUrl(bucket: string, pathOrUrl: string) {
  const v = String(pathOrUrl || "").trim();
  if (!v) return "";

  if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("data:")) {
    return v;
  }

  if (v.includes("/storage/v1/object/public/")) {
    return v.startsWith("/") ? v : `/${v}`;
  }

  const base = String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/+$/, "");
  if (!base) return v;

  const clean = v.startsWith("/") ? v.slice(1) : v;

  return `${base}/storage/v1/object/public/${encodeURIComponent(bucket)}/${clean
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}
