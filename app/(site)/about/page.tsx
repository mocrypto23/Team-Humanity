export default function AboutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white text-zinc-900">
      <section className="relative overflow-hidden">
        {/* soft blobs */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-200/35 blur-3xl" />
          <div className="absolute top-24 right-[-120px] h-[360px] w-[360px] rounded-full bg-emerald-100/70 blur-3xl" />
          <div className="absolute bottom-[-140px] left-[-120px] h-[360px] w-[360px] rounded-full bg-emerald-100/70 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                About
              </div>

              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                Team Humanity
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-600 md:text-base">
                A lightweight platform that highlights real stories and helps supporters reach
                trusted donation channels through external links. We do not collect donations
                directly and we do not process payments on this website.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-emerald-200 bg-white/80 p-5 shadow-soft">
                  <p className="text-xs font-semibold text-emerald-800">Direct</p>
                  <p className="mt-2 text-sm text-zinc-600">
                    Donations happen on third-party platforms via external links.
                  </p>
                </div>
                <div className="rounded-3xl border border-emerald-200 bg-white/80 p-5 shadow-soft">
                  <p className="text-xs font-semibold text-emerald-800">Transparent</p>
                  <p className="mt-2 text-sm text-zinc-600">
                    Clear badges and labeling when a profile is confirmed.
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-emerald-200 bg-white/80 p-6 shadow-soft">
                <p className="text-sm font-semibold">What we do</p>

                <ul className="mt-4 grid gap-3 text-sm text-zinc-600">
                  <li className="flex gap-3">
                    <span className="mt-1 h-2 w-2 flex-none rounded-full bg-emerald-500" />
                    Show published stories and related media shared by story owners or trusted sources.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1 h-2 w-2 flex-none rounded-full bg-emerald-500" />
                    Provide external donation links so supporters can donate directly.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1 h-2 w-2 flex-none rounded-full bg-emerald-500" />
                    Keep the public website fast, minimal, and focused on clarity.
                  </li>
                </ul>

                <div className="mt-6 rounded-2xl border border-emerald-100 bg-white p-4">
                  <p className="text-xs font-semibold text-emerald-800">Important note</p>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                    Donations are handled by third parties (official fundraising pages, verified profiles, or trusted platforms).
                    Always verify the destination and details before donating. Team Humanity is not responsible for third-party
                    content, payment processing, or outcomes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* divider */}
          <div className="mx-auto mt-10 max-w-6xl px-0">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-200 to-transparent" />
          </div>

          {/* mini FAQ */}
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-emerald-200 bg-white/80 p-6 shadow-soft">
              <p className="text-sm font-semibold">Why external links?</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                We keep the platform simple: you watch the story here, and support happens on the destination platform.
              </p>
            </div>
            <div className="rounded-3xl border border-emerald-200 bg-white/80 p-6 shadow-soft">
              <p className="text-sm font-semibold">What does “Confirmed” mean?</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                It indicates an additional verification step by the Team Humanity team when available.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
