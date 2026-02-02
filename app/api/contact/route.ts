import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Basic abuse protection (per IP)
const MAX_REQUESTS_PER_10_MIN = 10;
const WINDOW_MS = 10 * 60_000;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function getClientIp(req: NextRequest) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  const xrip = req.headers.get("x-real-ip");
  if (xrip) return xrip.trim();
  return "unknown";
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const b = buckets.get(key);

  if (!b || now > b.resetAt) {
    const nb: Bucket = { count: 1, resetAt: now + WINDOW_MS };
    buckets.set(key, nb);
    return { ok: true, remaining: MAX_REQUESTS_PER_10_MIN - 1, resetAt: nb.resetAt };
  }

  if (b.count >= MAX_REQUESTS_PER_10_MIN) {
    return { ok: false, remaining: 0, resetAt: b.resetAt };
  }

  b.count += 1;
  buckets.set(key, b);
  return { ok: true, remaining: MAX_REQUESTS_PER_10_MIN - b.count, resetAt: b.resetAt };
}

function normalizeText(v: unknown, max: number) {
  const s = String(v ?? "").trim();
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(ip);

  if (!rl.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "Rate limited. Please try again later.",
        resetAt: new Date(rl.resetAt).toISOString(),
      },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => ({} as any));

  const name = normalizeText(body?.name, 120);
  const email = normalizeText(body?.email, 180).toLowerCase();
  const message = normalizeText(body?.message, 4000);

  if (!name || !email || !message) {
    return NextResponse.json(
      { ok: false, error: "Missing required fields." },
      { status: 400 }
    );
  }

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { ok: false, error: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  // Store message (requires table: contact_messages)
  const { error } = await supabaseAdmin.from("contact_messages").insert({
    name,
    email,
    message,
    ip,
    user_agent: req.headers.get("user-agent") || null,
  });

  if (error) {
    console.error("contact insert failed", { ip, error: error.message });
    return NextResponse.json(
      { ok: false, error: "Failed to send message. Please try again." },
      { status: 500 }
    );
  }

  console.log("✅ contact message saved", { ip, emailHash: crypto.createHash("sha256").update(email).digest("hex").slice(0, 12) });

  return NextResponse.json({
    ok: true,
    message: "Your message has been sent. We will contact you within 72 business hours.",
    remaining: rl.remaining,
    resetAt: new Date(rl.resetAt).toISOString(),
  });
}
