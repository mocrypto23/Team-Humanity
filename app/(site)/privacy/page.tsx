export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white text-zinc-900">
      <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="sticky top-24 rounded-3xl border border-emerald-200 bg-white/80 p-6 shadow-soft">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Privacy
              </div>

              <h1 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
                Privacy Policy
              </h1>

              <p className="mt-3 text-sm text-zinc-600">
                We aim to collect minimal information. This page explains what we collect and how we use it.
              </p>

              <div className="mt-5 rounded-2xl border border-emerald-100 bg-white p-4 text-xs text-zinc-600">
                If you have questions, use the Contact page.
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="grid gap-4">
              <section className="rounded-3xl border border-emerald-200 bg-white/80 p-6 shadow-soft">
                <h2 className="text-lg font-semibold">Public visitors</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  The public website only displays content that is explicitly published by the site administrators.
                  We do not require public visitors to create accounts.
                </p>
              </section>

              <section className="rounded-3xl border border-emerald-200 bg-white/80 p-6 shadow-soft">
                <h2 className="text-lg font-semibold">Admin access</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  Authentication exists for administrators only, to manage published content.
                  Admin access is restricted to an allowlist of approved emails.
                </p>
              </section>

              <section className="rounded-3xl border border-emerald-200 bg-white/80 p-6 shadow-soft">
                <h2 className="text-lg font-semibold">Contact messages</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  If you contact us, we collect the information you submit (such as name, email, and your message)
                  for the sole purpose of responding to you. We do not sell your information.
                </p>
              </section>

              <section className="rounded-3xl border border-emerald-200 bg-white/80 p-6 shadow-soft">
                <h2 className="text-lg font-semibold">Third-party links</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  Our pages may contain links to third-party services (donation platforms, social networks, video platforms).
                  Their privacy practices are governed by their own policies.
                </p>
              </section>

              <section className="rounded-3xl border border-emerald-200 bg-white/80 p-6 shadow-soft">
                <h2 className="text-lg font-semibold">Changes</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  We may update this policy as the platform evolves. Updates will be reflected on this page.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
