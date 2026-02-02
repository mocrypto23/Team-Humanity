// D:\New-Project\team-humanity\app\admin\messages\page.tsx
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
import { Mail, MailOpen, Trash2, Archive, ArchiveRestore, Search } from "lucide-react";

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

  await requireAdmin();

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabaseAdmin
    .from("contact_messages")
    .select("id,name,email,message,created_at,is_read,is_archived", { count: "exact" })
    .order("created_at", { ascending: false });

  if (tab === "unread") query = query.eq("is_archived", false).eq("is_read", false);
  else if (tab === "read") query = query.eq("is_archived", false).eq("is_read", true);
  else if (tab === "archived") query = query.eq("is_archived", true);
  else query = query.eq("is_archived", false);

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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-900">Messages</h1>
        <p className="text-zinc-600 mt-1">Check your inbox and communications.</p>
      </div>

      {/* Counters */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-3xl border border-emerald-200 bg-white/80 p-4 shadow-sm">
          <p className="text-xs font-semibold text-emerald-800">Active (current filter)</p>
          <p className="mt-1 text-2xl font-semibold">
            {tab === "archived" ? archivedCount : total}
          </p>
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
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800">
          {err}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Failed to load messages: {error.message}
        </div>
      ) : null}

      {/* Tabs + Search */}
      <div className="grid gap-3 lg:grid-cols-12">
        <div className="lg:col-span-8 flex flex-wrap gap-2">
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <a
                key={t.key}
                href={buildHref({ tab: t.key, q, page: 1 })}
                className={
                  active
                    ? "rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
                    : "rounded-2xl border border-emerald-200 bg-white/80 px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
                }
              >
                {t.label}
              </a>
            );
          })}
        </div>

        <div className="lg:col-span-4">
          <form action="/admin/messages" method="GET" className="flex gap-2">
            <input type="hidden" name="tab" value={tab} />
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Search name/email..."
                className="w-full pl-10 rounded-2xl border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-sm outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button className="rounded-2xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white">
              Search
            </button>
          </form>
        </div>
      </div>

      {/* List */}
      <div className="bg-white/80 rounded-3xl p-4 shadow-sm border border-emerald-200">
        {(!data || data.length === 0) && !error ? (
          <div className="rounded-3xl border border-emerald-100 bg-white/70 p-4 text-sm text-zinc-600">
            No messages found.
          </div>
        ) : null}

        <div className="space-y-2">
          {data?.map((m) => {
            const isRead = !!m.is_read;
            const isArchived = !!m.is_archived;

            return (
              <div
                key={String(m.id)}
                className={[
                  "group flex items-start gap-4 p-4 rounded-2xl transition-all border",
                  isRead
                    ? "bg-white border-transparent hover:border-emerald-100"
                    : "bg-emerald-50/40 border-emerald-100 hover:bg-emerald-50",
                ].join(" ")}
              >
                <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 text-xs font-bold flex-shrink-0">
                  {(m.name || "U").slice(0, 1).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center gap-3">
                    <p className={isRead ? "text-sm font-medium text-zinc-900 truncate" : "text-sm font-bold text-zinc-900 truncate"}>
                      {m.name}
                    </p>
                    <span className="text-xs text-zinc-500 flex-shrink-0">
                      {new Date(m.created_at).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-500 mt-0.5 truncate">{m.email}</p>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                    {m.message}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
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
                  </div>
                </div>

                {/* Hover actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!isArchived ? (
                    isRead ? (
                      <form action={markContactMessageUnread}>
                        <input type="hidden" name="id" value={String(m.id)} />
                        <button className="p-2 hover:bg-emerald-100 text-emerald-700 rounded-lg" title="Mark unread">
                          <Mail className="w-4 h-4" />
                        </button>
                      </form>
                    ) : (
                      <form action={markContactMessageRead}>
                        <input type="hidden" name="id" value={String(m.id)} />
                        <button className="p-2 hover:bg-emerald-100 text-emerald-700 rounded-lg" title="Mark read">
                          <MailOpen className="w-4 h-4" />
                        </button>
                      </form>
                    )
                  ) : null}

                  {!isArchived ? (
                    <form action={archiveContactMessage}>
                      <input type="hidden" name="id" value={String(m.id)} />
                      <button className="p-2 hover:bg-amber-100 text-amber-700 rounded-lg" title="Archive">
                        <Archive className="w-4 h-4" />
                      </button>
                    </form>
                  ) : (
                    <form action={unarchiveContactMessage}>
                      <input type="hidden" name="id" value={String(m.id)} />
                      <button className="p-2 hover:bg-emerald-100 text-emerald-700 rounded-lg" title="Unarchive">
                        <ArchiveRestore className="w-4 h-4" />
                      </button>
                    </form>
                  )}

                  <form action={deleteContactMessage}>
                    <input type="hidden" name="id" value={String(m.id)} />
                    <button className="p-2 hover:bg-red-100 text-red-600 rounded-lg" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {!error ? (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-500">
              Showing page <span className="font-semibold">{page}</span> of{" "}
              <span className="font-semibold">{totalPages}</span> • {total} total
            </p>

            <div className="flex items-center gap-2">
              <a
                href={buildHref({ tab, q, page: hasPrev ? page - 1 : 1 })}
                className={[
                  "rounded-2xl border px-4 py-2 text-sm font-semibold",
                  hasPrev
                    ? "border-zinc-200 bg-white hover:bg-zinc-50"
                    : "border-zinc-100 bg-zinc-50 text-zinc-400 pointer-events-none",
                ].join(" ")}
              >
                Prev
              </a>

              <a
                href={buildHref({ tab, q, page: hasNext ? page + 1 : page })}
                className={[
                  "rounded-2xl border px-4 py-2 text-sm font-semibold",
                  hasNext
                    ? "border-zinc-200 bg-white hover:bg-zinc-50"
                    : "border-zinc-100 bg-zinc-50 text-zinc-400 pointer-events-none",
                ].join(" ")}
              >
                Next
              </a>
            </div>
          </div>
        ) : null}
      </div>

      {/* keep existing signout form available */}
      <form action={adminSignOut} className="hidden" />
    </div>
  );
}
