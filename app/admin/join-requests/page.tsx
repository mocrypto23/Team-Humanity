// D:\New-Project\team-humanity\app\admin\join-requests\page.tsx
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
import { Shield, Clock, UserPlus } from "lucide-react";

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
    return String(s || "");
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
  else q = q.eq("is_archived", false);

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

  if (!email || !isAdmin) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white text-zinc-900">
        <div className="mx-auto max-w-md px-4 py-12">
          <div className="overflow-hidden rounded-3xl border border-emerald-200 bg-white/90 shadow-sm">
            <div className="border-b border-emerald-100 px-6 py-5">
              <p className="text-xs font-semibold text-emerald-800">Team Humanity</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                {!email ? "Admin" : "Not allowed"}
              </h1>
              <p className="mt-1 text-sm text-zinc-600">
                {!email ? "Please sign in from /admin." : `Signed in as ${email}, but not in admin allowlist.`}
              </p>
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

  const [counts, rows] = await Promise.all([getCounts(), getRequests(tab)]);
  const returnTo = tabHref(tab as any);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">Join Requests</h1>
        <p className="text-zinc-600 mt-1">Manage incoming user registration requests.</p>
      </div>

      {/* Toast */}
      {ok ? (
        <>
          <div
            id="ok-toast"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900"
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

      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
          {err}
        </div>
      ) : null}

      {/* Tabs */}
      <div className="flex p-1 bg-white/50 backdrop-blur rounded-2xl w-fit border border-emerald-100">
        <a
          href={tabHref("unread")}
          className={[
            "px-6 py-2 rounded-xl text-sm font-medium transition-all",
            tab === "unread"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-zinc-600 hover:bg-emerald-50 hover:text-emerald-800",
          ].join(" ")}
        >
          Unread
          {counts.unread ? (
            <span className="ml-2 inline-flex min-w-[22px] items-center justify-center rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white shadow">
              {counts.unread}
            </span>
          ) : null}
        </a>

        <a
          href={tabHref("all")}
          className={[
            "px-6 py-2 rounded-xl text-sm font-medium transition-all",
            tab === "all"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-zinc-600 hover:bg-emerald-50 hover:text-emerald-800",
          ].join(" ")}
        >
          All <span className="ml-2 text-xs opacity-80">({counts.all})</span>
        </a>

        <a
          href={tabHref("archived")}
          className={[
            "px-6 py-2 rounded-xl text-sm font-medium transition-all",
            tab === "archived"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-zinc-600 hover:bg-emerald-50 hover:text-emerald-800",
          ].join(" ")}
        >
          Archived <span className="ml-2 text-xs opacity-80">({counts.archived})</span>
        </a>
      </div>

      {/* List */}
      <div className="space-y-4">
        {rows.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 bg-white/50 rounded-3xl border border-dashed border-zinc-200">
            <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No requests found in this category.</p>
          </div>
        ) : null}

        {rows.map((r) => {
          const isRead = !!r.is_read;
          const isArchived = !!r.is_archived;

          return (
            <div
              key={String(r.id)}
              className="bg-white/80 rounded-3xl p-5 shadow-sm border border-emerald-100 flex flex-col gap-4 transition-all hover:shadow-md"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-zinc-900 text-lg truncate">{r.title}</h3>

                    {!isArchived ? (
                      isRead ? (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-semibold text-zinc-700">
                          Read
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-900">
                          Unread
                        </span>
                      )
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                        Archived
                      </span>
                    )}

                    <span className="text-xs text-zinc-500">• {fmtDate(r.created_at)}</span>
                  </div>

                  <p className="text-sm text-zinc-600 mt-1">
                    <a className="font-semibold text-emerald-800 hover:underline" href={`mailto:${r.email}`}>
                      {r.email}
                    </a>
                    {"  "}•{" "}
                    <span className="font-semibold text-zinc-800">{r.phone}</span>
                  </p>

                  <p className="text-sm text-zinc-600 mt-1 break-words">
                    <a className="font-semibold text-emerald-800 hover:underline" href={r.instagram_url} target="_blank" rel="noreferrer">
                      {r.instagram_url}
                    </a>
                  </p>

                  <div className="mt-4 rounded-3xl border border-emerald-100 bg-white p-4">
                    <p className="text-xs font-semibold text-zinc-600">Story</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 break-words [overflow-wrap:anywhere]">
                      {r.story}
                    </p>

                    {r.extra_info ? (
                      <>
                        <div className="my-4 h-px bg-emerald-100" />
                        <p className="text-xs font-semibold text-zinc-600">Additional info</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-800 break-words [overflow-wrap:anywhere]">
                          {r.extra_info}
                        </p>
                      </>
                    ) : null}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
                  {!isArchived ? (
                    isRead ? (
                      <form action={markJoinRequestUnread}>
                        <input type="hidden" name="id" value={String(r.id)} />
                        <input type="hidden" name="return_to" value={returnTo} />
                        <button className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-zinc-50">
                          Mark unread
                        </button>
                      </form>
                    ) : (
                      <form action={markJoinRequestRead}>
                        <input type="hidden" name="id" value={String(r.id)} />
                        <input type="hidden" name="return_to" value={returnTo} />
                        <button className="rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700">
                          Mark read
                        </button>
                      </form>
                    )
                  ) : null}

                  {!isArchived ? (
                    <form action={archiveJoinRequest}>
                      <input type="hidden" name="id" value={String(r.id)} />
                      <input type="hidden" name="return_to" value={returnTo} />
                      <button className="rounded-2xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50">
                        Archive
                      </button>
                    </form>
                  ) : (
                    <form action={unarchiveJoinRequest}>
                      <input type="hidden" name="id" value={String(r.id)} />
                      <input type="hidden" name="return_to" value={returnTo} />
                      <button className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50">
                        Unarchive
                      </button>
                    </form>
                  )}

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
                    <button className="rounded-2xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">
                      Delete
                    </button>
                  </form>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-medium text-emerald-800">
                <span className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg">
                  <Shield className="w-3 h-3" /> Join Request
                </span>
                <span className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg">
                  <Clock className="w-3 h-3" /> {fmtDate(r.created_at)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
