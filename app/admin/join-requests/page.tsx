import Link from "next/link";
import Script from "next/script";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseAuthServer } from "@/lib/supabaseAuthServer";
import {
  markJoinRequestRead,
  markJoinRequestUnread,
  archiveJoinRequest,
  unarchiveJoinRequest,
  deleteJoinRequest,
} from "./actions";

export const dynamic = "force-dynamic";

type JoinRequestRow = {
  id: number;
  title: string;
  email: string;
  phone: string;
  instagram_url: string;
  story: string;
  extra_info: string | null;
  is_read: boolean;
  read_at: string | null;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
};

function parseAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

async function requireAdmin() {
  const sb = await supabaseAuthServer();
  const { data } = await sb.auth.getUser();
  const email = data?.user?.email?.toLowerCase() || "";
  if (!email) return { email: "", isAdmin: false };

  const admins = parseAdminEmails();
  return { email, isAdmin: admins.includes(email) };
}

function fmtDate(s?: string | null) {
  if (!s) return "";
  try {
    const d = new Date(s);
    return d.toLocaleString();
  } catch {
    return s;
  }
}

async function getCounts() {
  const [{ count: unread }, { count: all }, { count: archived }] = await Promise.all([
    supabaseAdmin
      .from("join_requests")
      .select("id", { count: "exact", head: true })
      .eq("is_archived", false)
      .eq("is_read", false),
    supabaseAdmin
      .from("join_requests")
      .select("id", { count: "exact", head: true })
      .eq("is_archived", false),
    supabaseAdmin
      .from("join_requests")
      .select("id", { count: "exact", head: true })
      .eq("is_archived", true),
  ]);

  return {
    unread: unread ?? 0,
    all: all ?? 0,
    archived: archived ?? 0,
  };
}

async function getRequests(tab: string): Promise<JoinRequestRow[]> {
  let q = supabaseAdmin
    .from("join_requests")
    .select(
      "id,title,email,phone,instagram_url,story,extra_info,is_read,read_at,is_archived,archived_at,created_at"
    )
    .order("created_at", { ascending: false });

  if (tab === "unread") q = q.eq("is_archived", false).eq("is_read", false);
  else if (tab === "archived") q = q.eq("is_archived", true);
  else q = q.eq("is_archived", false); // all = active only

  const { data, error } = await q;
  if (error) return [];
  return (data ?? []) as JoinRequestRow[];
}

function clipForEmail(text: string, max = 700) {
  const s = String(text || "").trim();
  if (!s) return "";
  return s.length > max ? s.slice(0, max) + "..." : s;
}

function makeReplyMailto(opts: {
  email: string;
  title: string;
  story: string;
  instagram: string;
  phone: string;
}) {
  const email = (opts.email || "").trim();
  const subject = `Re: Team Humanity — Join request`;
  const snippet = clipForEmail(opts.story, 900);

  const body =
    `Hello,\n\n` +
    `Thank you for submitting your join request to Team Humanity.\n\n` +
    `Request title:\n` +
    `${opts.title}\n\n` +
    `Instagram:\n` +
    `${opts.instagram}\n\n` +
    `Phone:\n` +
    `${opts.phone}\n\n` +
    `Your story (excerpt):\n` +
    `"${snippet}"\n\n` +
    `Our reply:\n`;

  const params = new URLSearchParams();
  params.set("subject", subject);
  params.set("body", body);

  return `mailto:${encodeURIComponent(email)}?${params.toString()}`;
}

function makeReplyGmailUrl(opts: {
  email: string;
  title: string;
  story: string;
  instagram: string;
  phone: string;
}) {
  const email = (opts.email || "").trim();
  const subject = `Re: Team Humanity — Join request`;
  const snippet = clipForEmail(opts.story, 900);

  const body =
    `Hello,\n\n` +
    `Thank you for submitting your join request to Team Humanity.\n\n` +
    `Request title:\n` +
    `${opts.title}\n\n` +
    `Instagram:\n` +
    `${opts.instagram}\n\n` +
    `Phone:\n` +
    `${opts.phone}\n\n` +
    `Your story (excerpt):\n` +
    `"${snippet}"\n\n` +
    `Our reply:\n`;

  const params = new URLSearchParams();
  params.set("to", email);
  params.set("su", subject);
  params.set("body", body);

  return `https://mail.google.com/mail/?view=cm&fs=1&${params.toString()}`;
}

function tabHref(tab: "unread" | "all" | "archived") {
  return `/admin/join-requests?tab=${tab}`;
}

export default async function JoinRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; err?: string; ok?: string }>;
}) {
  const sp = await searchParams;

  const tab =
    sp?.tab === "archived" ? "archived" : sp?.tab === "all" ? "all" : "unread";

  const err = sp?.err ? decodeURIComponent(sp.err) : "";
  const ok = sp?.ok ? String(sp.ok) : "";

  const { email, isAdmin } = await requireAdmin();

  if (!email) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white text-zinc-900">
        <div className="mx-auto max-w-md px-4 py-12">
          <div className="overflow-hidden rounded-3xl border border-emerald-200 bg-white/90 shadow-sm">
            <div className="border-b border-emerald-100 px-6 py-5">
              <p className="text-xs font-semibold text-emerald-800">Team Humanity</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">Admin</h1>
              <p className="mt-1 text-sm text-zinc-600">Please sign in from /admin.</p>
            </div>
            <div className="p-6">
              <a
                href="/admin"
                className="block w-full rounded-2xl bg-emerald-600 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Go to Admin Login
              </a>
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
              <a
                href="/admin"
                className="block w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-center text-sm font-semibold hover:bg-zinc-50"
              >
                Back to /admin
              </a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const [counts, rows] = await Promise.all([getCounts(), getRequests(tab)]);

  // important: keep returning to the same tab after actions
  const returnTo = tabHref(tab as any);

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white text-zinc-900">
      {/* background blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-200/30 blur-2xl" />
        <div className="absolute top-40 right-0 h-72 w-72 rounded-full bg-emerald-100/60 blur-2xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-emerald-100/55 blur-2xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 md:py-10">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-3 py-1 text-xs font-semibold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Admin Console
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight md:text-3xl">
              Join Requests
            </h1>

            <p className="mt-1 text-sm text-zinc-600">
              Logged in as <span className="font-semibold">{email}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              className="rounded-2xl border border-emerald-200 bg-white/90 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
              href="/admin"
            >
              ← Back to Dashboard
            </Link>

            <a
              className="rounded-2xl border border-zinc-200 bg-white/90 px-4 py-2.5 text-sm font-semibold hover:bg-zinc-50"
              href="/"
              target="_blank"
              rel="noreferrer"
            >
              Open site
            </a>
          </div>
        </div>

        {/* Toast */}
        {ok ? (
          <>
            <div
              id="ok-toast"
              className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900"
            >
              Done ✅
            </div>

            <Script id="hide-ok-toast" strategy="afterInteractive">{`
              setTimeout(() => {
                const el = document.getElementById('ok-toast');
                if (el) el.style.display = 'none';
                try {
                  const u = new URL(window.location.href);
                  u.searchParams.delete('ok');
                  window.history.replaceState({}, '', u.toString());
                } catch {}
              }, 2500);
            `}</Script>
          </>
        ) : null}

        {/* Error */}
        {err ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
            {err}
          </div>
        ) : null}

        {/* Tabs */}
        <div className="mt-6 flex flex-wrap gap-2">
          <a
            href={tabHref("unread")}
            className={[
              "rounded-2xl border px-4 py-2 text-sm font-semibold transition",
              tab === "unread"
                ? "border-emerald-300 bg-white text-emerald-900"
                : "border-emerald-200 bg-white/80 text-emerald-800 hover:bg-emerald-50",
            ].join(" ")}
          >
            Unread{" "}
            {counts.unread ? (
              <span className="ml-2 rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">
                {counts.unread}
              </span>
            ) : null}
          </a>

          <a
            href={tabHref("all")}
            className={[
              "rounded-2xl border px-4 py-2 text-sm font-semibold transition",
              tab === "all"
                ? "border-emerald-300 bg-white text-emerald-900"
                : "border-emerald-200 bg-white/80 text-emerald-800 hover:bg-emerald-50",
            ].join(" ")}
          >
            All <span className="ml-2 text-xs text-zinc-500">({counts.all})</span>
          </a>

          <a
            href={tabHref("archived")}
            className={[
              "rounded-2xl border px-4 py-2 text-sm font-semibold transition",
              tab === "archived"
                ? "border-emerald-300 bg-white text-emerald-900"
                : "border-emerald-200 bg-white/80 text-emerald-800 hover:bg-emerald-50",
            ].join(" ")}
          >
            Archived{" "}
            <span className="ml-2 text-xs text-zinc-500">({counts.archived})</span>
          </a>
        </div>

        {/* List */}
        <section className="mt-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-900">
              {tab === "unread"
                ? "Unread requests"
                : tab === "archived"
                ? "Archived requests"
                : "All requests"}
            </p>
            <p className="text-xs text-zinc-500">{rows.length} items</p>
          </div>

          <div className="mt-3 space-y-4">
            {rows.length === 0 ? (
              <div className="rounded-3xl border border-emerald-200 bg-white/80 p-4 text-sm text-zinc-600 shadow-sm">
                No requests found for this tab.
              </div>
            ) : null}

            {rows.map((r) => {
              const isRead = !!r.is_read;
              const isArchived = !!r.is_archived;

              return (
                <div
                  key={String(r.id)}
                  className="rounded-3xl border border-emerald-200 bg-white/85 p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    {/* content */}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="min-w-0 truncate text-sm font-semibold text-zinc-900">
                          {r.title}
                        </p>

                        {!isArchived ? (
                          isRead ? (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
                              Read
                            </span>
                          ) : (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800">
                              Unread
                            </span>
                          )
                        ) : (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                            Archived
                          </span>
                        )}

                        <span className="text-xs text-zinc-500">
                          • {fmtDate(r.created_at)}
                        </span>
                      </div>

                      {/* meta */}
                      <div className="mt-2 grid gap-2 text-sm text-zinc-700 md:grid-cols-2">
                        <p className="min-w-0">
                          <span className="text-xs font-semibold text-zinc-600">
                            Email:
                          </span>{" "}
                          <a
                            className="font-semibold text-emerald-800 hover:underline"
                            href={`mailto:${r.email}`}
                          >
                            {r.email}
                          </a>
                        </p>

                        <p className="min-w-0">
                          <span className="text-xs font-semibold text-zinc-600">
                            Phone:
                          </span>{" "}
                          <span className="font-semibold">{r.phone}</span>
                        </p>

                        <p className="md:col-span-2 min-w-0">
                          <span className="text-xs font-semibold text-zinc-600">
                            Instagram:
                          </span>{" "}
                          <a
                            className="font-semibold text-emerald-800 hover:underline break-words [overflow-wrap:anywhere]"
                            href={r.instagram_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {r.instagram_url}
                          </a>
                        </p>
                      </div>

                      {/* story */}
                      <div className="mt-4 rounded-3xl border border-emerald-100 bg-white p-4">
                        <p className="text-xs font-semibold text-zinc-600">
                          Story
                        </p>

                        {/* IMPORTANT: handles long unbroken text */}
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 break-words [overflow-wrap:anywhere]">
                          {r.story}
                        </p>

                        {r.extra_info ? (
                          <>
                            <div className="my-4 h-px bg-emerald-100" />
                            <p className="text-xs font-semibold text-zinc-600">
                              Additional info
                            </p>
                            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800 break-words [overflow-wrap:anywhere]">
                              {r.extra_info}
                            </p>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {/* actions */}
                    <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                      {!isArchived ? (
                        isRead ? (
                          <form action={markJoinRequestUnread}>
                            <input type="hidden" name="id" value={String(r.id)} />
                            <input type="hidden" name="return_to" value={returnTo} />
                            <button
                              className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-zinc-50"
                              type="submit"
                            >
                              Mark unread
                            </button>
                          </form>
                        ) : (
                          <form action={markJoinRequestRead}>
                            <input type="hidden" name="id" value={String(r.id)} />
                            <input type="hidden" name="return_to" value={returnTo} />
                            <button
                              className="rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                              type="submit"
                            >
                              Mark read
                            </button>
                          </form>
                        )
                      ) : null}

                      {!isArchived ? (
                        <form action={archiveJoinRequest}>
                          <input type="hidden" name="id" value={String(r.id)} />
                          <input type="hidden" name="return_to" value={returnTo} />
                          <button
                            className="rounded-2xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50"
                            type="submit"
                          >
                            Archive
                          </button>
                        </form>
                      ) : (
                        <form action={unarchiveJoinRequest}>
                          <input type="hidden" name="id" value={String(r.id)} />
                          <input type="hidden" name="return_to" value={returnTo} />
                          <button
                            className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
                            type="submit"
                          >
                            Unarchive
                          </button>
                        </form>
                      )}

                      {/* Reply buttons (like messages) */}
                      <a
                        href={makeReplyGmailUrl({
                          email: r.email,
                          title: r.title,
                          story: r.story,
                          instagram: r.instagram_url,
                          phone: r.phone,
                        })}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-zinc-50"
                      >
                        Reply (Gmail)
                      </a>

                      <a
                        href={makeReplyMailto({
                          email: r.email,
                          title: r.title,
                          story: r.story,
                          instagram: r.instagram_url,
                          phone: r.phone,
                        })}
                        className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-zinc-50"
                      >
                        Reply (Default)
                      </a>

                      <form action={deleteJoinRequest}>
                        <input type="hidden" name="id" value={String(r.id)} />
                        <input type="hidden" name="return_to" value={returnTo} />
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
      </div>
    </main>
  );
}
