// app/api/revalidate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Security / Abuse protection
 */
const MAX_REQUESTS_PER_WINDOW = 20; // per IP
const WINDOW_MS = 60_000; // 1 minute

/**
 * Only allow revalidating specific paths.
 * Add more if needed later.
 */
const ALLOWED_PATHS = new Set<string>(["/"]);

/**
 * In-memory rate limiter bucket (best-effort).
 * Note: On serverless, this is not globally consistent across instances.
 */
type Bucket = { count: number; resetAt: number; lastSeenAt: number };
const buckets = new Map<string, Bucket>();

function nowMs() {
  return Date.now();
}

function getClientIp(req: NextRequest) {
  // Common headers (Vercel/CF/Proxies)
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();

  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();

  const xrip = req.headers.get("x-real-ip");
  if (xrip) return xrip.trim();

  return "unknown";
}

function rateLimitKey(req: NextRequest) {
  const ip = getClientIp(req);
  return ip || "unknown";
}

function cleanupBuckets() {
  // prevent memory growth
  const t = nowMs();
  for (const [k, b] of buckets.entries()) {
    if (t > b.resetAt + WINDOW_MS) buckets.delete(k);
  }
}

function checkRateLimit(key: string) {
  cleanupBuckets();

  const t = nowMs();
  const b = buckets.get(key);

  if (!b || t > b.resetAt) {
    const nb: Bucket = { count: 1, resetAt: t + WINDOW_MS, lastSeenAt: t };
    buckets.set(key, nb);
    return {
      ok: true as const,
      remaining: MAX_REQUESTS_PER_WINDOW - 1,
      resetAt: nb.resetAt,
      limit: MAX_REQUESTS_PER_WINDOW,
    };
  }

  b.lastSeenAt = t;

  if (b.count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      ok: false as const,
      remaining: 0,
      resetAt: b.resetAt,
      limit: MAX_REQUESTS_PER_WINDOW,
    };
  }

  b.count += 1;
  buckets.set(key, b);

  return {
    ok: true as const,
    remaining: MAX_REQUESTS_PER_WINDOW - b.count,
    resetAt: b.resetAt,
    limit: MAX_REQUESTS_PER_WINDOW,
  };
}

function timingSafeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function normalizePaths(input: unknown): string[] {
  const raw: string[] = Array.isArray(input)
    ? input.map((x) => String(x ?? "")).filter(Boolean)
    : [String(input ?? "")].filter(Boolean);

  // cap number of paths
  const capped = raw.slice(0, 10);

  const cleaned = capped
    .map((p) => p.trim())
    .filter((p) => p.startsWith("/"))
    .filter((p) => !p.includes(".."))
    .filter((p) => !p.includes("://"))
    .filter((p) => p.length <= 200);

  return cleaned;
}

function filterAllowedPaths(paths: string[]) {
  return paths.filter((p) => ALLOWED_PATHS.has(p));
}

function json(
  body: any,
  init: { status?: number; headers?: Record<string, string> } = {}
) {
  return NextResponse.json(body, {
    status: init.status ?? 200,
    headers: init.headers,
  });
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomBytes(8).toString("hex");
  const ip = getClientIp(req);
  const key = rateLimitKey(req);

  // Rate limit
  const rl = checkRateLimit(key);
  const commonHeaders = {
    "x-request-id": requestId,
    "x-ratelimit-limit": String(rl.limit),
    "x-ratelimit-remaining": String(rl.remaining),
    "x-ratelimit-reset": new Date(rl.resetAt).toISOString(),
    "cache-control": "no-store",
  };

  if (!rl.ok) {
    const retryAfterSec = Math.max(1, Math.ceil((rl.resetAt - nowMs()) / 1000));
    console.warn("⛔ revalidate rate-limited", { requestId, ip, resetAt: rl.resetAt });

    return json(
      {
        ok: false,
        error: "Rate limited",
        requestId,
        resetAt: new Date(rl.resetAt).toISOString(),
      },
      {
        status: 429,
        headers: {
          ...commonHeaders,
          "retry-after": String(retryAfterSec),
        },
      }
    );
  }

  const secret = process.env.REVALIDATION_SECRET || "";
  if (!secret) {
    console.error("⛔ Missing REVALIDATION_SECRET", { requestId });
    return json(
      { ok: false, error: "Missing REVALIDATION_SECRET on server", requestId },
      { status: 500, headers: commonHeaders }
    );
  }

  // Read body
  const body = await req.json().catch(() => ({} as any));

  // Accept secret from body or header
  const provided =
    String(body?.secret || "").trim() ||
    String(req.headers.get("x-revalidate-secret") || "").trim();

  // Basic hardening: reject empty/too long secrets (avoid weird payloads)
  if (!provided || provided.length > 200) {
    console.warn("⛔ revalidate missing/invalid provided secret", { requestId, ip });
    return json(
      { ok: false, error: "Invalid secret", requestId },
      { status: 401, headers: commonHeaders }
    );
  }

  if (!timingSafeEqual(provided, secret)) {
    console.warn("⛔ revalidate wrong secret", { requestId, ip });
    return json(
      { ok: false, error: "Invalid secret", requestId },
      { status: 401, headers: commonHeaders }
    );
  }

  // Normalize + allowlist paths
  const requested = normalizePaths(body?.paths ?? body?.path ?? "/");
  const allowed = filterAllowedPaths(requested);

  if (!allowed.length) {
    return json(
      {
        ok: false,
        error: "No allowed paths to revalidate",
        requestId,
        requested,
        allowed: Array.from(ALLOWED_PATHS),
      },
      { status: 400, headers: commonHeaders }
    );
  }

  for (const p of allowed) revalidatePath(p);

  console.log("✅ revalidated", { requestId, ip, paths: allowed });

  return json(
    {
      ok: true,
      requestId,
      revalidated: allowed,
      ip,
      remaining: rl.remaining,
      resetAt: new Date(rl.resetAt).toISOString(),
      now: new Date().toISOString(),
    },
    { status: 200, headers: commonHeaders }
  );
}

export async function GET(req: NextRequest) {
  // Explicitly disallow GET
  return json(
    { ok: false, error: "Use POST" },
    { status: 405, headers: { "cache-control": "no-store" } }
  );
}
