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

function safeId(formData: FormData) {
  const idRaw = String(formData.get("id") || "").trim();
  const id = idRaw ? Number(idRaw) : NaN;
  if (!Number.isFinite(id) || id <= 0) redirect("/admin/join-requests?err=bad_id");
  return id;
}

function safeReturnTo(formData: FormData) {
  const raw = String(formData.get("return_to") || "").trim();
  // allow only same area
  if (raw && raw.startsWith("/admin/join-requests")) return raw;
  return "/admin/join-requests?tab=unread";
}

function withOk(url: string) {
  const u = new URL(url, "http://local");
  u.searchParams.set("ok", "1");
  return u.pathname + (u.search ? u.search : "");
}

function withErr(url: string, message: string) {
  const u = new URL(url, "http://local");
  u.searchParams.set("err", message);
  return u.pathname + (u.search ? u.search : "");
}

export async function markJoinRequestRead(formData: FormData) {
  await requireAdminEmail();
  const id = safeId(formData);
  const returnTo = safeReturnTo(formData);

  const { error } = await supabaseAdmin
    .from("join_requests")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", id);

  if (error) redirect(withErr(returnTo, encodeURIComponent(error.message)));

  revalidatePath("/admin/join-requests");
  redirect(withOk(returnTo));
}

export async function markJoinRequestUnread(formData: FormData) {
  await requireAdminEmail();
  const id = safeId(formData);
  const returnTo = safeReturnTo(formData);

  const { error } = await supabaseAdmin
    .from("join_requests")
    .update({ is_read: false, read_at: null })
    .eq("id", id);

  if (error) redirect(withErr(returnTo, encodeURIComponent(error.message)));

  revalidatePath("/admin/join-requests");
  redirect(withOk(returnTo));
}

export async function archiveJoinRequest(formData: FormData) {
  await requireAdminEmail();
  const id = safeId(formData);
  const returnTo = safeReturnTo(formData);

  const { error } = await supabaseAdmin
    .from("join_requests")
    .update({ is_archived: true, archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) redirect(withErr(returnTo, encodeURIComponent(error.message)));

  revalidatePath("/admin/join-requests");
  redirect(withOk(returnTo));
}

export async function unarchiveJoinRequest(formData: FormData) {
  await requireAdminEmail();
  const id = safeId(formData);
  const returnTo = safeReturnTo(formData);

  const { error } = await supabaseAdmin
    .from("join_requests")
    .update({ is_archived: false, archived_at: null })
    .eq("id", id);

  if (error) redirect(withErr(returnTo, encodeURIComponent(error.message)));

  revalidatePath("/admin/join-requests");
  redirect(withOk(returnTo));
}

export async function deleteJoinRequest(formData: FormData) {
  await requireAdminEmail();
  const id = safeId(formData);
  const returnTo = safeReturnTo(formData);

  const { error } = await supabaseAdmin.from("join_requests").delete().eq("id", id);
  if (error) redirect(withErr(returnTo, encodeURIComponent(error.message)));

  revalidatePath("/admin/join-requests");
  redirect(withOk(returnTo));
}
