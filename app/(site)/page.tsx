import InfluencerFeed from "@/components/InfluencerFeed";
import { supabaseServer } from "@/lib/supabaseServer";
import type { InfluencerRow } from "@/lib/types";
import HomeHero from "@/components/HomeHero";
import StatsStrip from "@/components/StatsStrip";
import HashScroll from "@/components/HashScroll";
import PaginationControls from "@/components/PaginationControls";

export const revalidate = false;

const PAGE_SIZE = 9;

function clampPage(n: number) {
  if (!Number.isFinite(n) || n <= 0) return 1;
  return Math.min(n, 10_000);
}

function buildHref(page: number) {
  const p = clampPage(page);
  return p <= 1 ? "/#stories" : `/?page=${p}#stories`;
}


async function getHighlights(): Promise<InfluencerRow[]> {
  const { data, error } = await supabaseServer
    .from("influencers")
    .select(
      "id,name,bio,video_url,donation_link,donation_links,image_paths,sort_order,is_published,is_confirmed,confirmed_label,highlight_slot"
    )
    .eq("is_published", true)
    .in("highlight_slot", [1, 2])
    .order("highlight_slot", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true })
    .limit(2);

  if (error) {
    console.error("Supabase error (highlights):", error);
    return [];
  }
  return (data ?? []) as InfluencerRow[];
}

async function getRestPaged(page: number): Promise<{
  rows: InfluencerRow[];
  total: number;
}> {
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let q = supabaseServer
    .from("influencers")
    .select(
      "id,name,bio,video_url,donation_link,donation_links,image_paths,sort_order,is_published,is_confirmed,confirmed_label,highlight_slot",
      { count: "exact" }
    )
    .eq("is_published", true)
    .or("highlight_slot.is.null,highlight_slot.not.in.(1,2)")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to);

  const { data, error, count } = await q;

  if (error) {
    console.error("Supabase error (rest):", error);
    return { rows: [], total: 0 };
  }

  return {
    rows: (data ?? []) as InfluencerRow[],
    total: count ?? 0,
  };
}

function IconPlay(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M10 8.5v7l6-3.5-6-3.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function IconBadge(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12 2l2.2 4.2L19 7l-3.4 3.3.8 4.7L12 13.7 7.6 15l.8-4.7L5 7l4.8-.8L12 2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9.7 12.2l1.4 1.4 3.3-3.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconHeart(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12 21s-7-4.5-9.2-9C1 8.7 3.4 6 6.4 6c1.7 0 3.1.8 3.9 2 0 0 1.4-2 3.9-2 3 0 5.4 2.7 3.6 6-2.2 4.5-9.2 9-9.2 9Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M7.6 12.2h2.2l.9-2.2 1.7 5 1.2-2.8h2.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = clampPage(Number(sp?.page || "1"));

  const [highlights, restRes] = await Promise.all([getHighlights(), getRestPaged(page)]);

  const rest = restRes.rows;
  const totalRest = restRes.total;

  const totalPages = Math.max(1, Math.ceil(totalRest / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <main className="min-h-screen bg-white text-zinc-900">
          <HashScroll />

      <div className="bg-gradient-to-b from-emerald-50 via-emerald-50/40 to-white">
        <HomeHero />

        <div className="pb-10">
          <div className="mx-auto max-w-6xl px-4">
            <StatsStrip />
          </div>

          <section id="how" className="scroll-mt-24 mx-auto mt-10 max-w-6xl px-4">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-emerald-800">How it works</p>
                <h2 className="mt-1 text-2xl font-semibold">Simple. Verified. Direct.</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Watch the story, check verification, then support via trusted external links.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-soft">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <IconPlay className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">Watch</p>
                    <p className="text-xs font-semibold text-emerald-800">Step 1</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                  See the story directly from the influencer (video / reel).
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-soft">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <IconBadge className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">Verify</p>
                    <p className="text-xs font-semibold text-emerald-800">Step 2</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                  Verified badges highlight confirmed profiles when available.
                </p>
              </div>

              <div className="rounded-3xl border border-emerald-200 bg-white p-5 shadow-soft">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <IconHeart className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">Support</p>
                    <p className="text-xs font-semibold text-emerald-800">Step 3</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                  Donate via trusted links to support families directly.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {highlights.length ? (
        <section className="mx-auto mt-10 max-w-6xl px-4">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-emerald-800">Highlight of the week</p>
              <h2 className="mt-1 text-2xl font-semibold">Urgent support</h2>
              <p className="mt-1 text-sm text-zinc-600">These stories urgently need help right now.</p>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                Priority
              </span>
            </div>
          </div>

          <InfluencerFeed influencers={highlights} variant="highlights" />
        </section>
      ) : null}

      <section id="stories" className="scroll-mt-24 mx-auto mt-10 max-w-6xl px-4">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-emerald-800">Stories</p>
            <h2 className="mt-1 text-2xl font-semibold">Explore and support</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Showing <span className="font-semibold">9</span> stories per page • Page{" "}
              <span className="font-semibold">{page}</span> of{" "}
              <span className="font-semibold">{totalPages}</span>
            </p>
          </div>
        </div>

        <InfluencerFeed influencers={rest} />

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-zinc-500">
            Total stories: <span className="font-semibold">{totalRest}</span>
          </p>

          <PaginationControls page={page} hasPrev={hasPrev} hasNext={hasNext} />

        </div>
      </section>

      <section className="mt-14 bg-emerald-50/40 py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-6">
            <p className="text-xs font-semibold text-emerald-800">Trust & Transparency</p>
            <h2 className="mt-1 text-2xl font-semibold">Clear, direct, and verifiable.</h2>
            <p className="mt-1 text-sm text-zinc-600">
              We keep the experience simple, and donations happen on external pages.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-soft">
              <p className="text-sm font-semibold">Who we are</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                Team Humanity highlights real stories and connects supporters directly through donation links.
                We aim to keep the experience simple and transparent.
              </p>

              <ul className="mt-5 grid gap-3 text-sm text-zinc-700">
                <li className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-emerald-500" />
                  Direct external donation links (no in-app payment processing).
                </li>
                <li className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-emerald-500" />
                  Verified badges when additional confirmation is available.
                </li>
                <li className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-emerald-500" />
                  Mobile-first design for fast browsing and quick access.
                </li>
              </ul>
            </div>

            <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-soft">
              <p className="text-sm font-semibold">FAQ</p>

              <div className="mt-4 space-y-3">
                <details className="group rounded-2xl border border-emerald-100 bg-white p-4">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-900">
                    Do you take a cut?
                  </summary>
                  <p className="mt-2 text-sm text-zinc-600">
                    No. Donations happen on external pages. Always verify details before donating.
                  </p>
                </details>

                <details className="group rounded-2xl border border-emerald-100 bg-white p-4">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-900">
                    What does “Confirmed” mean?
                  </summary>
                  <p className="mt-2 text-sm text-zinc-600">
                    It indicates additional verification by the team when available.
                  </p>
                </details>

                <details className="group rounded-2xl border border-emerald-100 bg-white p-4">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-zinc-900">
                    Where do donations happen?
                  </summary>
                  <p className="mt-2 text-sm text-zinc-600">
                    On trusted external donation links provided per story (e.g., fundraiser pages).
                  </p>
                </details>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
