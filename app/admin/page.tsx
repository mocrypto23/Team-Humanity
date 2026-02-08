// D:\New-Project\team-humanity\app\admin\page.tsx
import { supabaseAuthServer } from "@/lib/supabaseAuthServer";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { InfluencerRow } from "@/lib/types";
import AdminInfluencersClient from "@/components/admin/AdminInfluencersClient";
import { adminSignIn } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const DEFAULT_SITE_COPY = {
  headlineLine1: "Help directly.",
  headlineLine2: "Transparently.",
  subheading:
    "Team Humanity is a curated space that highlights personal stories and trusted links to offer direct support - simple, respectful, and transparent.",
};

type SiteCopy = typeof DEFAULT_SITE_COPY;
type SiteCopyRow = {
  key: string | null;
  value: string | null;
};

function parseAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

async function getInfluencers(): Promise<InfluencerRow[]> {
  const { data, error } = await supabaseAdmin
    .from("influencers")
    .select(
      "id,name,bio,video_url,donation_link,donation_links,image_paths,sort_order,is_published,is_confirmed,confirmed_label,highlight_slot"
    )
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true })
    .range(0, PAGE_SIZE - 1);

  if (error) return [];
  return (data ?? []) as InfluencerRow[];
}

async function getSiteCopy(): Promise<SiteCopy> {
  try {
    const { data, error } = await supabaseAdmin
      .from("site_copy")
      .select("key,value")
      .in("key", ["home_headline_line1", "home_headline_line2", "home_subheading"]);

    if (error) {
      console.error("Supabase error (site_copy):", error);
      return DEFAULT_SITE_COPY;
    }

    const map = new Map<string, string>();
    (data ?? []).forEach((row: SiteCopyRow) => {
      const key = String(row?.key || "").trim();
      const value = String(row?.value || "").trim();
      if (key) map.set(key, value);
    });

    return {
      headlineLine1: map.get("home_headline_line1") || DEFAULT_SITE_COPY.headlineLine1,
      headlineLine2: map.get("home_headline_line2") || DEFAULT_SITE_COPY.headlineLine2,
      subheading: map.get("home_subheading") || DEFAULT_SITE_COPY.subheading,
    };
  } catch (e) {
    console.error("Supabase error (site_copy):", e);
    return DEFAULT_SITE_COPY;
  }
}

function LoginView({ err }: { err: string }) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white px-4 py-10">
      <div className="mx-auto max-w-md rounded-3xl border border-emerald-200/70 bg-white/80 p-6 shadow-sm backdrop-blur">
        <h1 className="text-2xl font-extrabold text-zinc-900">Admin Login</h1>
        <p className="mt-1 text-sm text-zinc-600">Sign in to manage influencers.</p>

        {err ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            Error: {err}
          </div>
        ) : null}

        <form action={adminSignIn} className="mt-5 space-y-3">
          <div>
            <label className="block text-sm font-bold text-zinc-800 mb-1">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-zinc-800 mb-1">Password</label>
            <input
              name="password"
              type="password"
              required
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="********"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700"
          >
            Sign In
          </button>
        </form>
      </div>
    </main>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const sp = await Promise.resolve(searchParams);
  const errParam = sp?.err;

  const err =
    typeof errParam === "string"
      ? errParam
      : Array.isArray(errParam)
      ? String(errParam[0] || "")
      : "";

  const sb = await supabaseAuthServer();
  const { data } = await sb.auth.getUser();
  const email = data?.user?.email?.toLowerCase() || "";

  if (!email) {
    return <LoginView err={err} />;
  }

 const admins = parseAdminEmails();

if (admins.length === 0) {
  return <LoginView err={"server_misconfigured_admin_emails"} />;
}

if (!admins.includes(email)) {
  return <LoginView err={"not_allowed"} />;
}


  const [influencers, siteCopy] = await Promise.all([getInfluencers(), getSiteCopy()]);
  return <AdminInfluencersClient influencers={influencers} siteCopy={siteCopy} />;
}


