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

  if (error || !email) redirect("/admin");

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

function safeDonationLinks(input: string): { label: string; url: string }[] {
  try {
    const v = JSON.parse(input);
    if (!Array.isArray(v)) return [];

    return v
      .map((x) => ({
        label: String(x?.label || "").trim(),
        url: String(x?.url || "").trim(),
      }))
      .filter((x) => x.url);
  } catch {
    return [];
  }
}

export async function adminSignIn(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "").trim();

  const sb = await supabaseAuthServer();
  const { error } = await sb.auth.signInWithPassword({ email, password });

  if (error) redirect(`/admin?err=${encodeURIComponent(error.message)}`);

  redirect("/admin");
}

export async function adminSignOut() {
  const sb = await supabaseAuthServer();
  await sb.auth.signOut();
  redirect("/admin");
}

export async function upsertInfluencer(formData: FormData) {
  await requireAdminEmail();

  // highlight_slot: allow only 1/2 or null
  const highlight_slot_raw = String(formData.get("highlight_slot") ?? "").trim();
  const highlight_slot_num = highlight_slot_raw ? Number(highlight_slot_raw) : null;
  const highlight_slot =
    highlight_slot_num === 1 || highlight_slot_num === 2 ? highlight_slot_num : null;

  const idRaw = String(formData.get("id") || "").trim();
  const idNum = idRaw ? Number(idRaw) : NaN;
  const hasValidId = Number.isFinite(idNum) && idNum > 0;

  const name = String(formData.get("name") || "").trim();
  if (!name) redirect("/admin?err=missing_name");

  const bio = String(formData.get("bio") || "").trim() || null;
  const video_url = String(formData.get("video_url") || "").trim() || null;

  // donation_links (new)
  const donation_links_text = String(formData.get("donation_links") || "").trim();
  const donation_links = donation_links_text
    ? safeDonationLinks(donation_links_text)
    : [];

  // legacy single link (keep for compatibility)
  const donation_link = donation_links[0]?.url
    ? donation_links[0].url
    : String(formData.get("donation_link") || "").trim() || null;

  const sort_order_raw = String(formData.get("sort_order") || "").trim();
  const sort_order = sort_order_raw ? Number(sort_order_raw) : null;

  const is_published = formData.get("is_published") === "on";
  const is_confirmed = formData.get("is_confirmed") === "on";
  const confirmed_label =
    String(formData.get("confirmed_label") || "").trim() || null;

  const image_paths_text = String(formData.get("image_paths") || "").trim();
  const image_paths = image_paths_text ? safeJsonArray(image_paths_text) : [];

  const payload: any = {
    name,
    bio,
    video_url,
    donation_link,
    donation_links,
    sort_order,
    highlight_slot,
    is_published,
    is_confirmed,
    confirmed_label,
    image_paths,
  };

  // ===== UPDATE =====
  if (hasValidId) {
    const { error } = await supabaseAdmin
      .from("influencers")
      .update(payload)
      .eq("id", idNum);

    if (error) {
      redirect(`/admin?err=${encodeURIComponent(error.message)}&edit=${idNum}#form`);
    }

    revalidatePath("/");
redirect(`/admin?ok=saved&edit=${idNum}#top`);
  }

  // ===== INSERT =====
  const { data, error } = await supabaseAdmin
    .from("influencers")
    .insert(payload)
    .select("id")
    .single();

  if (error) redirect(`/admin?err=${encodeURIComponent(error.message)}#form`);

  const newId = data?.id;
  revalidatePath("/");

if (newId) redirect(`/admin?ok=saved&edit=${newId}#top`);
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
  redirect("/admin");
}

/**
 * NOTE:
 * Any email you add to ADMIN_EMAILS must ALSO exist as a user in Supabase Authentication,
 * otherwise you won't be able to sign in as admin.
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
