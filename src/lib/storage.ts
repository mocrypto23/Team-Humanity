export function publicStorageUrl(bucket: string, path: string) {
  // NEXT_PUBLIC_SUPABASE_URL looks like: https://xxxx.supabase.co
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // Public bucket URL format:
  // https://xxxx.supabase.co/storage/v1/object/public/<bucket>/<path>
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}
