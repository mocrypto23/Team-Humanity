import { supabaseAuthServer } from "@/lib/supabaseAuthServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { redirect } from "next/navigation";
import {
  adminSignOut,
  deleteContactMessage,
  markContactMessageRead,
  markContactMessageUnread,
  archiveContactMessage,
  unarchiveContactMessage,
} from "../actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

function parseAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

async function requireAdmin() {
  const sb = await supabaseAuthServer();
  const { data, error } = await sb.auth.getUser();
  const email = data?.user?.email?.toLowerCase() || "";

  if (error || !email) redirect("/admin");

  const admins = parseAdminEmails();
  if (!admins.includes(email)) redirect("/admin?err=not_allowed");

  return { email };
}

function clampPage(n: number) {
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(n, 10_000);
}

function buildHref(params: { page?: number; q?: string; tab?: string }) {
  const sp = new URLSearchParams();
  if (params.tab) sp.set("tab", params.tab);
  if (params.q) sp.set("q", params.q);
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  const qs = sp.toString();
  return qs ? `/admin/messages?${qs}` : "/admin/messages";
}
function clipForEmail(text: string, max = 600) {
  const s = String(text || "").trim();
  if (!s) return "";
  return s.length > max ? s.slice(0, max) + "..." : s;
}

function makeReplyMailto(opts: { name: string; email: string; message: string }) {
  const name = (opts.name || "there").trim();
  const email = (opts.email || "").trim();

  const msg = clipForEmail(opts.message, 800);

  const subject = `Re: Your message to Team Humanity`;
  const body =
    `Hello ${name},\n\n` +
    `Thank you for reaching out to Team Humanity.\n\n` +
    `Regarding your message:\n` +
    `"${msg}"\n\n` +
    `Our reply:\n`;

  const params = new URLSearchParams();
  params.set("subject", subject);
  params.set("body", body);

  return `mailto:${encodeURIComponent(email)}?${params.toString()}`;
}
function makeReplyGmailUrl(opts: { name: string; email: string; message: string }) {
  const name = (opts.name || "there").trim();
  const email = (opts.email || "").trim();
  const msg = clipForEmail(opts.message, 800);

  const subject = `Re: Your message to Team Humanity`;
  const body =
    `Hello ${name},\n\n` +
    `Thank you for reaching out to Team Humanity.\n\n` +
    `Regarding your message:\n` +
    `"${msg}"\n\n` +
    `Our reply:\n`;

  const params = new URLSearchParams();
  params.set("to", email);
  params.set("su", subject);
  params.set("body", body);

  return `https://mail.google.com/mail/?view=cm&fs=1&${params.toString()}`;
}

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string; page?: string; q?: string; tab?: string }>;
}) {
  const sp = await searchParams;
  const err = sp?.err ? decodeURIComponent(sp.err) : "";

  const page = clampPage(Number(sp?.page || "1"));
  const q = (sp?.q || "").trim();
  const tab = (sp?.tab || "all").trim(); // all | unread | read | archived

  const { email } = await requireAdmin();

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Base query
  let query = supabaseAdmin
    .from("contact_messages")
    .select("id,name,email,message,created_at,is_read,is_archived", { count: "exact" })
    .order("created_at", { ascending: false });

  // Tabs
  if (tab === "unread") query = query.eq("is_archived", false).eq("is_read", false);
  else if (tab === "read") query = query.eq("is_archived", false).eq("is_read", true);
  else if (tab === "archived") query = query.eq("is_archived", true);
  else query = query.eq("is_archived", false); // "all" = active only

  // Search (simple: match name or email)
  if (q) {
    const safe = q.replace(/%/g, "\\%").replace(/_/g, "\\_");
    query = query.or(`name.ilike.%${safe}%,email.ilike.%${safe}%`);
  }

  const { data, error, count } = await query.range(from, to);
const [{ count: unreadCount }, { count: archivedCount }] = await Promise.all([
  supabaseAdmin
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("is_archived", false)
    .eq("is_read", false),

  supabaseAdmin
    .from("contact_messages")
    .select("id", { count: "exact", head: true })
    .eq("is_archived", true),
]).then((results) => results.map((r: any) => ({ count: r.count ?? 0 })));

const totalActiveCount =
  tab === "archived" ? archivedCount : (count ?? 0); 

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  const tabs = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
    { key: "read", label: "Read" },
    { key: "archived", label: "Archived" },
  ] as const;

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white text-zinc-900">
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
              Team Humanity — Messages
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Logged in as <span className="font-semibold">{email}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              className="rounded-2xl border border-emerald-200 bg-white/90 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
              href="/admin"
            >
              ← Back to dashboard
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
{/* Counters */}
<div className="mt-6 grid gap-3 sm:grid-cols-3">
  <div className="rounded-3xl border border-emerald-200 bg-white/80 p-4 shadow-sm">
    <p className="text-xs font-semibold text-emerald-800">Active (current filter)</p>
    <p className="mt-1 text-2xl font-semibold">{totalActiveCount}</p>
    <p className="mt-1 text-xs text-zinc-500">Based on current tab + search</p>
  </div>

  <div className="rounded-3xl border border-emerald-200 bg-white/80 p-4 shadow-sm">
    <p className="text-xs font-semibold text-emerald-800">Unread</p>
    <p className="mt-1 text-2xl font-semibold">{unreadCount}</p>
    <p className="mt-1 text-xs text-zinc-500">Not archived</p>
  </div>

  <div className="rounded-3xl border border-emerald-200 bg-white/80 p-4 shadow-sm">
    <p className="text-xs font-semibold text-emerald-800">Archived</p>
    <p className="mt-1 text-2xl font-semibold">{archivedCount}</p>
    <p className="mt-1 text-xs text-zinc-500">Stored messages</p>
  </div>
</div>

        {err ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
            {err}
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            Failed to load messages: {error.message}
          </div>
        ) : null}

        {/* Filters row */}
        <div className="mt-6 grid gap-3 lg:grid-cols-12">
          {/* Tabs */}
          <div className="lg:col-span-8 flex flex-wrap gap-2">
            {tabs.map((t) => {
              const active = tab === t.key;
              return (
                <a
                  key={t.key}
                  href={buildHref({ tab: t.key, q, page: 1 })}
                  className={
                    active
                      ? "rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                      : "rounded-2xl border border-emerald-200 bg-white/80 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
                  }
                >
                  {t.label}
                </a>
              );
            })}
          </div>

          {/* Search */}
          <div className="lg:col-span-4">
            <form action="/admin/messages" method="GET" className="flex gap-2">
              <input type="hidden" name="tab" value={tab} />
              <input
                name="q"
                defaultValue={q}
                placeholder="Search name/email..."
                className="w-full rounded-2xl border border-zinc-200 bg-white/90 px-3 py-2 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
              />
              <button className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
                Search
              </button>
            </form>
          </div>
        </div>

        {/* List */}
        <div className="mt-6 space-y-3">
          {(!data || data.length === 0) && !error ? (
            <div className="rounded-3xl border border-emerald-200 bg-white/80 p-4 shadow-sm text-sm text-zinc-600">
              No messages found.
            </div>
          ) : null}

          {data?.map((m) => {
            const isRead = !!m.is_read;
            const isArchived = !!m.is_archived;

            return (
              <div
                key={String(m.id)}
                className="rounded-3xl border border-emerald-200 bg-white/85 p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-zinc-900">{m.name}</p>

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
                    </div>

                    <p className="mt-1 text-xs text-zinc-500">
                      {m.email} • {new Date(m.created_at).toLocaleString()}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {!isArchived ? (
                      isRead ? (
                        <form action={markContactMessageUnread}>
                          <input type="hidden" name="id" value={String(m.id)} />
                          <button
                            type="submit"
                            className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-zinc-50"
                          >
                            Mark unread
                          </button>
                        </form>
                      ) : (
                        <form action={markContactMessageRead}>
                          <input type="hidden" name="id" value={String(m.id)} />
                          <button
                            type="submit"
                            className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
                          >
                            Mark read
                          </button>
                        </form>
                      )
                    ) : null}

                    {!isArchived ? (
                      <form action={archiveContactMessage}>
                        <input type="hidden" name="id" value={String(m.id)} />
                        <button
                          type="submit"
                          className="rounded-2xl border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50"
                        >
                          Archive
                        </button>
                      </form>
                    ) : (
                      <form action={unarchiveContactMessage}>
                        <input type="hidden" name="id" value={String(m.id)} />
                        <button
                          type="submit"
                          className="rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50"
                        >
                          Unarchive
                        </button>
                      </form>
                    )}
<a
  href={makeReplyGmailUrl({ name: m.name, email: m.email, message: m.message })}
  target="_blank"
  rel="noreferrer"
  className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-zinc-50"
>
  Reply (Gmail)
</a>

<a
  href={makeReplyMailto({ name: m.name, email: m.email, message: m.message })}
  className="rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-zinc-50"
>
  Reply (Default)
</a>


                    <form action={deleteContactMessage}>
                      <input type="hidden" name="id" value={String(m.id)} />
                      <button
                        type="submit"
                        className="rounded-2xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                  {m.message}
                </p>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {!error ? (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-500">
              Showing page <span className="font-semibold">{page}</span> of{" "}
              <span className="font-semibold">{totalPages}</span> • {total} total
            </p>

            <div className="flex items-center gap-2">
              <a
                href={buildHref({ tab, q, page: hasPrev ? page - 1 : 1 })}
                className={`rounded-2xl border px-4 py-2 text-sm font-semibold ${
                  hasPrev
                    ? "border-zinc-200 bg-white hover:bg-zinc-50"
                    : "border-zinc-100 bg-zinc-50 text-zinc-400 pointer-events-none"
                }`}
              >
                Prev
              </a>

              <a
                href={buildHref({ tab, q, page: hasNext ? page + 1 : page })}
                className={`rounded-2xl border px-4 py-2 text-sm font-semibold ${
                  hasNext
                    ? "border-zinc-200 bg-white hover:bg-zinc-50"
                    : "border-zinc-100 bg-zinc-50 text-zinc-400 pointer-events-none"
                }`}
              >
                Next
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
