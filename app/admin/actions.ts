"use server";

import { revalidatePath } from "next/cache";
import { supabaseAuthServer } from "@/lib/supabaseAuthServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { redirect } from "next/navigation";

function parseAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

async function requireAdminEmail() {
  const sb = await supabaseAuthServer();
  const { data, error } = await sb.auth.getUser();
  const email = data?.user?.email?.toLowerCase() || "";

if (error || !email) redirect("/admin?err=auth_required");

  const admins = parseAdminEmails();
  if (!admins.includes(email)) redirect("/admin?err=not_allowed");

  return email;
}

function safeJsonArray(input: string): string[] {
  try {
    const v = JSON.parse(input);
    if (Array.isArray(v)) return v.filter(Boolean).map(String);
    return [];
  } catch {
    return [];
  }
}

function inferDonateLabel(url: string) {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();

    if (host.includes("gofundme.com")) return "GoFundMe";
    if (host.includes("chuffed.org")) return "Chuffed";
    if (host.includes("paypal.com") || host.includes("paypal.me")) return "PayPal";

    return "Donate";
  } catch {
    return "Donate";
  }
}

function safeDonationLinks(input: string): { label: string; url: string }[] {
  try {
    const v = JSON.parse(input);
    if (!Array.isArray(v)) return [];

    return v
      .map((x) => {
        const url = String(x?.url || "").trim();

        const rawLabel = String(x?.label || x?.platform || x?.name || "").trim();

        const inferred = url ? inferDonateLabel(url) : "Donate";

        const finalLabel =
          !rawLabel || rawLabel.toLowerCase() === "donate"
            ? inferred
            : rawLabel;

        return { url, label: finalLabel };
      })
      .filter((x) => x.url);
  } catch {
    return [];
  }
}



function clampInt(n: number, min = 1, max = 100000) {
  if (!Number.isFinite(n)) return min;
  if (n < min) return min;
  if (n > max) return max;
  return Math.floor(n);
}

async function getNextSortOrder(): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("influencers")
    .select("sort_order")
    .order("sort_order", { ascending: true })
    .limit(1);

  if (error) return 10;

  const min = Number(data?.[0]?.sort_order ?? 0);
  if (!Number.isFinite(min)) return 10;

  return min - 10;
}

async function getExistingSortOrder(id: number): Promise<number | null> {
  const { data, error } = await supabaseAdmin
    .from("influencers")
    .select("sort_order")
    .eq("id", id)
    .maybeSingle();

  if (error) return null;
  const v = data?.sort_order;
  const n = v == null ? null : Number(v);
  return Number.isFinite(n as any) ? (n as number) : null;
}


async function normalizeInfluencerSortOrders() {
  const { data, error } = await supabaseAdmin
    .from("influencers")
    .select("id,sort_order");

  if (error) return;

  const rows =
    (data ?? []).map((x: any) => ({
      id: Number(x.id),
      sort_order: x.sort_order == null ? null : Number(x.sort_order),
    })) ?? [];

  rows.sort((a, b) => {
    const as = Number.isFinite(a.sort_order as any) ? (a.sort_order as number) : 1e15;
    const bs = Number.isFinite(b.sort_order as any) ? (b.sort_order as number) : 1e15;
    if (as !== bs) return as - bs;
    return a.id - b.id;
  });

  const seen = new Set<number>();
  let hasIssue = false;
  for (const r of rows) {
    if (!Number.isFinite(r.sort_order as any)) {
      hasIssue = true;
      break;
    }
    if (seen.has(r.sort_order as number)) {
      hasIssue = true;
      break;
    }
    seen.add(r.sort_order as number);
  }
  if (!hasIssue) return;

  for (let i = 0; i < rows.length; i++) {
    const desired = (i + 1) * 10;
    if (rows[i].sort_order !== desired) {
      await supabaseAdmin.from("influencers").update({ sort_order: desired }).eq("id", rows[i].id);
    }
  }
}


export async function moveInfluencerSort(formData: FormData) {
  await requireAdminEmail();

  const idRaw = String(formData.get("id") || "").trim();
  const dir = String(formData.get("dir") || "").trim(); // up/down
  const returnTo = String(formData.get("return_to") || "").trim() || "/admin";

  const id = idRaw ? Number(idRaw) : NaN;
  if (!Number.isFinite(id) || id <= 0)
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}err=bad_id`);

  if (dir !== "up" && dir !== "down") {
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}err=bad_dir`);
  }

  await normalizeInfluencerSortOrders();

  const { data, error } = await supabaseAdmin
    .from("influencers")
    .select("id,sort_order")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  if (error)
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}err=${encodeURIComponent(error.message)}`);

  const rows =
    (data ?? []).map((x: any) => ({
      id: Number(x.id),
      sort_order: Number(x.sort_order),
    })) ?? [];

  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) redirect(returnTo);

  const targetIdx = dir === "up" ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= rows.length) redirect(returnTo);

  const a = rows[idx];
  const b = rows[targetIdx];

  const aOrder = a.sort_order;
  const bOrder = b.sort_order;

  const { error: e1 } = await supabaseAdmin.from("influencers").update({ sort_order: bOrder }).eq("id", a.id);
  if (e1)
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}err=${encodeURIComponent(e1.message)}`);

  const { error: e2 } = await supabaseAdmin.from("influencers").update({ sort_order: aOrder }).eq("id", b.id);
  if (e2)
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}err=${encodeURIComponent(e2.message)}`);

  revalidatePath("/admin");
  revalidatePath("/");

  redirect(returnTo);
}

/**
 * ✅ PIN action: يخزن في highlight_slot (1 أو 2 أو null)
 * formData:
 * - id
 * - slot: "1" | "2" | "" (unpin)
 * - return_to
 */
export async function setInfluencerPin(formData: FormData) {
  await requireAdminEmail();

  const returnTo = String(formData.get("return_to") || "").trim() || "/admin";
  const idRaw = String(formData.get("id") || "").trim();
  const slotRaw = String(formData.get("slot") || "").trim(); // "1" | "2" | ""

  const id = idRaw ? Number(idRaw) : NaN;
  if (!Number.isFinite(id) || id <= 0)
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}err=bad_id`);

  const slotNum = slotRaw ? Number(slotRaw) : null;
  const slot = slotNum === 1 || slotNum === 2 ? slotNum : null;

  if (slot != null) {
    const { error: eClear } = await supabaseAdmin
      .from("influencers")
      .update({ highlight_slot: null })
      .eq("highlight_slot", slot)
      .neq("id", id);

    if (eClear)
      redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}err=${encodeURIComponent(eClear.message)}`);
  }

  // set/unset
  const { error } = await supabaseAdmin
    .from("influencers")
    .update({ highlight_slot: slot })
    .eq("id", id);

  if (error)
    redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}err=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin");
  revalidatePath("/");

  redirect(returnTo);
}

export async function adminSignIn(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "").trim();

  const sb = await supabaseAuthServer();
  const { error } = await sb.auth.signInWithPassword({ email, password });

  if (error) {
    const msg =
      error.message?.toLowerCase().includes("invalid") ||
      error.message?.toLowerCase().includes("credentials")
        ? "Invalid email or password"
        : error.message || "Sign in failed";

    redirect(`/admin?err=${encodeURIComponent(msg)}`);
  }

  redirect("/admin");
}

export async function adminSignOut() {
  const sb = await supabaseAuthServer();
  await sb.auth.signOut();
redirect("/admin?err=signed_out");
}

export async function upsertInfluencer(formData: FormData) {
  await requireAdminEmail();

  const idRaw = String(formData.get("id") || "").trim();
  const idNum = idRaw ? Number(idRaw) : NaN;
  const hasValidId = Number.isFinite(idNum) && idNum > 0;

  const name = String(formData.get("name") || "").trim();
  if (!name) redirect("/admin?err=missing_name");

  const bio = String(formData.get("bio") || "").trim() || null;
  const video_url = String(formData.get("video_url") || "").trim() || null;

  const donation_links_text = String(formData.get("donation_links") || "").trim();
  const donation_links = donation_links_text ? safeDonationLinks(donation_links_text) : [];

  const donation_link = donation_links[0]?.url
    ? donation_links[0].url
    : String(formData.get("donation_link") || "").trim() || null;

  const sort_order_raw = String(formData.get("sort_order") || "").trim();
  const sort_order_parsed = sort_order_raw ? Number(sort_order_raw) : null;
  const sort_order_candidate =
    sort_order_parsed != null && Number.isFinite(sort_order_parsed) ? sort_order_parsed : null;

  const is_published = formData.get("is_published") === "on";
  const is_confirmed = formData.get("is_confirmed") === "on";
  const confirmed_label = String(formData.get("confirmed_label") || "").trim() || null;

  const image_paths_text = String(formData.get("image_paths") || "").trim();
  const image_paths = image_paths_text ? safeJsonArray(image_paths_text) : [];

 
  const hasHighlightSlotField = formData.has("highlight_slot");
  let highlight_slot: number | null = null;

  if (hasHighlightSlotField) {
    const raw = String(formData.get("highlight_slot") ?? "").trim();
    const n = raw ? Number(raw) : null;
    highlight_slot = n === 1 || n === 2 ? n : null;
  }

  let sort_order: number | null = sort_order_candidate;

  if (hasValidId) {
    if (sort_order == null) {
      const existing = await getExistingSortOrder(idNum);
      sort_order = existing ?? (await getNextSortOrder());
    }
  } else {
    if (sort_order == null) sort_order = await getNextSortOrder();
  }

  const payload: any = {
    name,
    bio,
    video_url,
    donation_link,
    donation_links,
    sort_order,
    is_published,
    is_confirmed,
    confirmed_label,
    image_paths,
  };

  if (!hasValidId) {
    payload.highlight_slot = highlight_slot; // insert
  } else if (hasHighlightSlotField) {
    payload.highlight_slot = highlight_slot; // update only if explicitly sent
  }

  // ===== UPDATE =====
  if (hasValidId) {
    const { error } = await supabaseAdmin.from("influencers").update(payload).eq("id", idNum);

    if (error) {
      redirect(`/admin?err=${encodeURIComponent(error.message)}&edit=${idNum}#form`);
    }

    revalidatePath("/");
    revalidatePath("/admin");
redirect(`/admin?ok=saved#top`);
  }

  // ===== INSERT =====
  const { data, error } = await supabaseAdmin.from("influencers").insert(payload).select("id").single();

  if (error) redirect(`/admin?err=${encodeURIComponent(error.message)}#form`);

  const newId = data?.id;
  revalidatePath("/");
  revalidatePath("/admin");

  redirect("/admin?ok=saved#top");

}

export async function deleteInfluencer(formData: FormData) {
  await requireAdminEmail();

  const idRaw = String(formData.get("id") || "").trim();
  const id = idRaw ? Number(idRaw) : NaN;
  if (!Number.isFinite(id) || id <= 0) redirect("/admin?err=bad_id");

  const { error } = await supabaseAdmin.from("influencers").delete().eq("id", id);
  if (error) redirect(`/admin?err=${encodeURIComponent(error.message)}`);

  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/admin");
}

/**
 * NOTE:
 * Any email you add to ADMIN_EMAILS must ALSO exist as a user in Supabase Authentication
 */
export async function deleteContactMessage(formData: FormData) {
  await requireAdminEmail();

  const idRaw = String(formData.get("id") || "").trim();
  const id = idRaw ? Number(idRaw) : NaN;
  if (!Number.isFinite(id) || id <= 0) redirect("/admin/messages?err=bad_id");

  const { error } = await supabaseAdmin.from("contact_messages").delete().eq("id", id);
  if (error) redirect(`/admin/messages?err=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin/messages");
  redirect("/admin/messages");
}

export async function markContactMessageRead(formData: FormData) {
  await requireAdminEmail();

  const idRaw = String(formData.get("id") || "").trim();
  const id = idRaw ? Number(idRaw) : NaN;
  if (!Number.isFinite(id) || id <= 0) redirect("/admin/messages?err=bad_id");

  const { error } = await supabaseAdmin
    .from("contact_messages")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", id);

  if (error) redirect(`/admin/messages?err=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin/messages");
  redirect("/admin/messages");
}

export async function markContactMessageUnread(formData: FormData) {
  await requireAdminEmail();

  const idRaw = String(formData.get("id") || "").trim();
  const id = idRaw ? Number(idRaw) : NaN;
  if (!Number.isFinite(id) || id <= 0) redirect("/admin/messages?err=bad_id");

  const { error } = await supabaseAdmin
    .from("contact_messages")
    .update({ is_read: false, read_at: null })
    .eq("id", id);

  if (error) redirect(`/admin/messages?err=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin/messages");
  redirect("/admin/messages");
}

export async function archiveContactMessage(formData: FormData) {
  await requireAdminEmail();

  const idRaw = String(formData.get("id") || "").trim();
  const id = idRaw ? Number(idRaw) : NaN;
  if (!Number.isFinite(id) || id <= 0) redirect("/admin/messages?err=bad_id");

  const { error } = await supabaseAdmin
    .from("contact_messages")
    .update({ is_archived: true, archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) redirect(`/admin/messages?err=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin/messages");
  redirect("/admin/messages");
}

export async function unarchiveContactMessage(formData: FormData) {
  await requireAdminEmail();

  const idRaw = String(formData.get("id") || "").trim();
  const id = idRaw ? Number(idRaw) : NaN;
  if (!Number.isFinite(id) || id <= 0) redirect("/admin/messages?err=bad_id");

  const { error } = await supabaseAdmin
    .from("contact_messages")
    .update({ is_archived: false, archived_at: null })
    .eq("id", id);

  if (error) redirect(`/admin/messages?err=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin/messages");
  redirect("/admin/messages");
}
