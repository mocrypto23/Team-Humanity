import type { ReactNode } from "react";
import { supabaseAuthServer } from "@/lib/supabaseAuthServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import AdminShell from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

function parseAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

async function getBadges() {
  const [{ count: unreadMessages }, { count: unreadJoin }] = await Promise.all([
    supabaseAdmin
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .eq("is_archived", false)
      .eq("is_read", false),

    supabaseAdmin
      .from("join_requests")
      .select("id", { count: "exact", head: true })
      .eq("is_archived", false)
      .eq("is_read", false),
  ]);

  return {
    unreadMessages: unreadMessages ?? 0,
    unreadJoin: unreadJoin ?? 0,
  };
}

function formatBadge(n: number) {
  if (!n || n <= 0) return "";
  return n > 99 ? "+99" : String(n);
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const sb = await supabaseAuthServer();
  const { data } = await sb.auth.getUser();
  const email = data?.user?.email?.toLowerCase() || "";

  const admins = parseAdminEmails();
  const isAdmin = !!email && admins.includes(email);

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white text-zinc-900">
        {children}
      </div>
    );
  }

  const badges = await getBadges();

  return (
    <AdminShell
      email={email}
      joinBadge={formatBadge(badges.unreadJoin)}
      messagesBadge={formatBadge(badges.unreadMessages)}
    >
      {children}
    </AdminShell>
  );
}
