import Script from "next/script";
import { supabaseAuthServer } from "@/lib/supabaseAuthServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { InfluencerRow } from "@/lib/types";
import {
  adminSignIn,
  adminSignOut,
  upsertInfluencer,
  deleteInfluencer,
} from "./actions";
import AdminInfluencerFormClient from "@/components/AdminInfluencerFormClient";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

function parseAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function clampPage(n: number) {
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(n, 100000);
}

function buildAdminHref(page: number, edit?: string) {
  const p = clampPage(page);
  const qs = new URLSearchParams();
  if (p > 1) qs.set("page", String(p));
  if (edit) qs.set("edit", String(edit));
  const s = qs.toString();
  return s ? `/admin?${s}#form` : `/admin#form`;
}

async function getInfluencersPaged(page: number): Promise<{ rows: InfluencerRow[]; total: number }> {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error, count } = await supabaseAdmin
    .from("influencers")
    .select(
      "id,name,bio,video_url,donation_link,donation_links,image_paths,sort_order,is_published,is_confirmed,confirmed_label,highlight_slot",
      { count: "exact" }
    )
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to);

  if (error) {
    console.error("Admin fetch error:", error);
    return { rows: [], total: 0 };
  }

  return {
    rows: (data ?? []) as InfluencerRow[],
    total: count ?? 0,
  };
}

async function getInfluencerById(id: number): Promise<InfluencerRow | null> {
  if (!Number.isFinite(id) || id <= 0) return null;

  const { data, error } = await supabaseAdmin
    .from("influencers")
    .select(
      "id,name,bio,video_url,donation_link,donation_links,image_paths,sort_order,is_published,is_confirmed,confirmed_label,highlight_slot"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) return null;
  return (data ?? null) as InfluencerRow | null;
}

async function getUnreadMessagesCount(): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("is_archived", false)
    .eq("is_read", false);

  if (error) {
    console.error("Unread messages count error:", error.message);
    return 0;
  }

  return count ?? 0;
}

async function getUnreadJoinRequestsCount(): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from("join_requests")
    .select("id", { count: "exact", head: true })
    .eq("is_archived", false)
    .eq("is_read", false);

  if (error) return 0;
  return count ?? 0;
}

function formatBadge(n: number) {
  if (!n || n <= 0) return "";
  return n > 99 ? "+99" : String(n);
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; edit?: string; ok?: string; page?: string }>;
}) {
  const sp = await searchParams;

  const sb = await supabaseAuthServer();
  const { data } = await sb.auth.getUser();
  const email = data?.user?.email?.toLowerCase() || "";

  const admins = parseAdminEmails();
  const isAdmin = !!email && admins.includes(email);

  const err = sp?.err ? decodeURIComponent(sp.err) : "";
  const ok = sp?.ok ? String(sp.ok) : "";

  const page = clampPage(Number(sp?.page || "1"));

  const editIdRaw = sp?.edit ? String(sp.edit) : "";
  const editIdNum = editIdRaw ? Number(editIdRaw) : NaN;

  if (!email) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white text-zinc-900">
        <div className="mx-auto max-w-md px-4 py-12">
          <div className="overflow-hidden rounded-3xl border border-emerald-200 bg-white/90 shadow-sm">
            <div className="border-b border-emerald-100 px-6 py-5">
              <p className="text-xs font-semibold text-emerald-800">Team Humanity</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">Admin Login</h1>
              <p className="mt-1 text-sm text-zinc-600">Sign in with your admin account.</p>
            </div>

            <div className="p-6">
              {err ? (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {err}
                </div>
              ) : null}

              <form action={adminSignIn} className="space-y-3">
                <label className="block">
                  <span className="text-xs font-semibold text-zinc-700">Email</span>
                  <input
                    name="email"
                    type="email"
                    className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                    required
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold text-zinc-700">Password</span>
                  <input
                    name="password"
                    type="password"
                    className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                    required
                  />
                </label>

                <button
                  type="submit"
                  className="mt-2 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Sign in
                </button>
              </form>

              <p className="mt-4 text-xs text-zinc-500">
                Your email must be listed in{" "}
                <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono">ADMIN_EMAILS</code>.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white text-zinc-900">
        <div className="mx-auto max-w-md px-4 py-12">
          <div className="overflow-hidden rounded-3xl border border-emerald-200 bg-white/90 shadow-sm">
            <div className="border-b border-emerald-100 px-6 py-5">
              <h1 className="text-2xl font-semibold tracking-tight">Not allowed</h1>
              <p className="mt-2 text-sm text-zinc-600">
                Signed in as <span className="font-semibold">{email}</span>, but not in admin allowlist.
              </p>
            </div>
            <div className="p-6">
              <form action={adminSignOut}>
                <button className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-50">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const [{ rows: influencers, total }, unreadCount, joinUnread, editingFromDb] = await Promise.all([
    getInfluencersPaged(page),
    getUnreadMessagesCount(),
    getUnreadJoinRequestsCount(),
    Number.isFinite(editIdNum) ? getInfluencerById(editIdNum) : Promise.resolve(null),
  ]);

  const joinBadge = formatBadge(joinUnread);
  const unreadBadge = formatBadge(unreadCount);

  const editing: InfluencerRow | null =
    (editIdRaw ? influencers.find((x) => String(x.id) === editIdRaw) ?? null : null) ||
    (editingFromDb ?? null);

  const published = influencers.filter((x) => !!x.is_published).length;
  const confirmed = influencers.filter((x) => !!x.is_confirmed).length;

  const totalPages = Math.max(1, Math.ceil((total || 0) / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white text-zinc-900">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-200/30 blur-2xl" />
        <div className="absolute top-40 right-0 h-72 w-72 rounded-full bg-emerald-100/60 blur-2xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-emerald-100/55 blur-2xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 md:py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-3 py-1 text-xs font-semibold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Admin Console
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              Team Humanity — Dashboard
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Logged in as <span className="font-semibold">{email}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              className="rounded-2xl border border-emerald-200 bg-white/90 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
              href={page > 1 ? `/admin?page=${page}` : "/admin"}
            >
              + New influencer
            </a>

            <a
              className="relative rounded-2xl border border-emerald-200 bg-white/90 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
              href="/admin/join-requests?tab=unread"
            >
              Join requests
              {joinBadge ? (
                <span className="absolute -right-2 -top-2 inline-flex min-w-[22px] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-bold text-white shadow">
                  {joinBadge}
                </span>
              ) : null}
            </a>

            <a
              className="relative rounded-2xl border border-emerald-200 bg-white/90 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
              href="/admin/messages?tab=unread"
            >
              Messages
              {unreadBadge ? (
                <span className="absolute -right-2 -top-2 inline-flex min-w-[22px] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-bold text-white shadow">
                  {unreadBadge}
                </span>
              ) : null}
            </a>

            <a
              className="rounded-2xl border border-zinc-200 bg-white/90 px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50"
              href="/"
              target="_blank"
              rel="noreferrer"
            >
              Open site
            </a>

            <form action={adminSignOut}>
              <button className="rounded-2xl border border-zinc-200 bg-white/90 px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50">
                Sign out
              </button>
            </form>
          </div>
        </div>

        {ok === "saved" ? (
          <>
            <div
              id="saved-toast"
              className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900"
            >
              Saved ✅
            </div>

            <Script id="hide-saved-toast" strategy="afterInteractive">{`
              setTimeout(() => {
                const el = document.getElementById('saved-toast');
                if (el) el.style.display = 'none';
                try {
                  const u = new URL(window.location.href);
                  u.searchParams.delete('ok');
                  window.history.replaceState({}, '', u.toString());
                } catch {}
              }, 5000);
            `}</Script>
          </>
        ) : null}

        {err ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
            {err}
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-emerald-200 bg-white/80 p-4 shadow-sm">
            <p className="text-xs font-semibold text-emerald-800">Total</p>
            <p className="mt-1 text-2xl font-semibold">{total}</p>
            <p className="mt-1 text-xs text-zinc-500">All influencers in database</p>
          </div>
          <div className="rounded-3xl border border-emerald-200 bg-white/80 p-4 shadow-sm">
            <p className="text-xs font-semibold text-emerald-800">Published</p>
            <p className="mt-1 text-2xl font-semibold">{published}</p>
            <p className="mt-1 text-xs text-zinc-500">On this page</p>
          </div>
          <div className="rounded-3xl border border-emerald-200 bg-white/80 p-4 shadow-sm">
            <p className="text-xs font-semibold text-emerald-800">Confirmed</p>
            <p className="mt-1 text-2xl font-semibold">{confirmed}</p>
            <p className="mt-1 text-xs text-zinc-500">On this page</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-12">
          <section className="lg:col-span-5 overflow-hidden rounded-3xl border border-emerald-200 bg-white/80 shadow-sm">
            <div className="flex items-center justify-between border-b border-emerald-100 px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Influencers</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Page <span className="font-semibold">{page}</span> of{" "}
                  <span className="font-semibold">{totalPages}</span> • {PAGE_SIZE} per page
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={page > 2 ? `/admin?page=${page - 1}` : "/admin"}
                  className={[
                    "rounded-2xl border px-3 py-2 text-xs font-semibold",
                    hasPrev ? "border-zinc-200 bg-white hover:bg-zinc-50" : "pointer-events-none border-zinc-100 bg-zinc-50 text-zinc-400",
                  ].join(" ")}
                >
                  Prev
                </a>
                <a
                  href={`/admin?page=${page + 1}`}
                  className={[
                    "rounded-2xl border px-3 py-2 text-xs font-semibold",
                    hasNext ? "border-zinc-200 bg-white hover:bg-zinc-50" : "pointer-events-none border-zinc-100 bg-zinc-50 text-zinc-400",
                  ].join(" ")}
                >
                  Next
                </a>
              </div>
            </div>

            <div className="divide-y divide-emerald-100">
              {influencers.map((i) => {
                const active = editing && String(editing.id) === String(i.id);

                return (
                  <div
                    key={String(i.id)}
                    className={`px-4 py-3 transition ${active ? "bg-emerald-50/80" : "hover:bg-white"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold">{i.name}</p>

                          {!!i.is_published ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
                              Published
                            </span>
                          ) : (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
                              Draft
                            </span>
                          )}

                          {!!i.is_confirmed ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
                              Confirmed
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-1 truncate text-xs text-zinc-500">
                          id: {String(i.id)} • sort: {i.sort_order ?? "-"}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <a
                          className={[
                            "rounded-2xl border px-3 py-2 text-xs font-semibold transition",
                            active
                              ? "border-emerald-300 bg-white text-emerald-900"
                              : "border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50",
                          ].join(" ")}
                          href={buildAdminHref(page, String(i.id))}
                        >
                          Edit
                        </a>

                        <form action={deleteInfluencer}>
                          <input type="hidden" name="id" value={String(i.id)} />
                          <button
                            className="rounded-2xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                            type="submit"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section
            id="form"
            className="lg:col-span-7 overflow-hidden rounded-3xl border border-emerald-200 bg-white/80 shadow-sm lg:sticky lg:top-6"
          >
            <div className="border-b border-emerald-100 px-4 py-3">
              <p className="text-sm font-semibold">
                {editing ? `Editing: ${editing.name}` : "Create new influencer"}
              </p>
            </div>

            <div className="p-4">
              <form action={upsertInfluencer}>
                <AdminInfluencerFormClient editing={editing} />
              </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
