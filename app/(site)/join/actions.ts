"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { headers } from "next/headers";

const MAX_REQUESTS_PER_10_MIN = 5;
const WINDOW_MS = 10 * 60_000;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

async function getClientIpFromHeaders() {
  const h = await headers();

  const cf = h.get("cf-connecting-ip");
  if (cf) return cf.split(",")[0].trim();

  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();

  const xrip = h.get("x-real-ip");
  if (xrip) return xrip.trim();

  return "unknown";
}

async function getUserAgentFromHeaders() {
  const h = await headers();
  return h.get("user-agent") || "";
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

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function isValidInstagramUrl(s: string) {
  try {
    const u = new URL(s.trim());
    const host = u.hostname.toLowerCase();
    if (!(host.includes("instagram.com") || host.includes("instagr.am"))) return false;

    const parts = u.pathname.split("/").filter(Boolean);
    if (!parts.length) return false;

    const first = parts[0].toLowerCase();
    if (first === "p" || first === "reel" || first === "reels" || first === "tv") return false;

    return true;
  } catch {
    return false;
  }
}

const TITLE_MIN = 30;
const TITLE_MAX = 120;
const STORY_MIN = 300;
const STORY_MAX = 12000;

export async function submitJoinRequest(
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const ip = await getClientIpFromHeaders();
  const ua = await getUserAgentFromHeaders();

  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    return {
      ok: false,
      error: `Too many requests. Try again after ${new Date(rl.resetAt).toLocaleString()}.`,
    };
  }

  const title = String(formData.get("title") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const phone = String(formData.get("phone") || "").trim();
  const instagram_url = String(formData.get("instagram_url") || "").trim();
  const story = String(formData.get("story") || "").trim();
  const extra_info = String(formData.get("extra_info") || "").trim() || null;

  if (!title || !email || !phone || !instagram_url || !story) {
    return { ok: false, error: "Please fill in all required fields." };
  }

  if (!isValidEmail(email)) return { ok: false, error: "Invalid email address." };
  if (!isValidInstagramUrl(instagram_url)) {
    return { ok: false, error: "Please provide a valid Instagram profile URL." };
  }

  if (title.length < TITLE_MIN) return { ok: false, error: `Title is too short (min ${TITLE_MIN}).` };
  if (title.length > TITLE_MAX) return { ok: false, error: `Title is too long (max ${TITLE_MAX}).` };

  if (story.length < STORY_MIN) return { ok: false, error: `Story is too short (min ${STORY_MIN}).` };
  if (story.length > STORY_MAX) return { ok: false, error: `Story is too long (max ${STORY_MAX}).` };

  const { error } = await supabaseAdmin.from("join_requests").insert({
    title,
    email,
    phone,
    instagram_url,
    story,
    extra_info,
    ip,
    user_agent: ua || null,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
