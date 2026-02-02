export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white text-zinc-900">
      <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="sticky top-24 rounded-3xl border border-emerald-200 bg-white/80 p-6 shadow-soft">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Legal
              </div>

              <h1 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
                Terms &amp; Conditions
              </h1>

              <p className="mt-3 text-sm text-zinc-600">
                By using this website, you agree to the terms below. If you do not agree, please do not use the site.
              </p>

              <div className="mt-5 rounded-2xl border border-emerald-100 bg-white p-4 text-xs text-zinc-600">
                This page is informational and may be updated as the platform evolves.
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="grid gap-4">
              <section className="rounded-3xl border border-emerald-200 bg-white/80 p-6 shadow-soft">
                <h2 className="text-lg font-semibold">No payment processing</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  Team Humanity does not process payments and does not store payment information.
                  Donation actions happen on third-party websites via external links.
                </p>
              </section>

              <section className="rounded-3xl border border-emerald-200 bg-white/80 p-6 shadow-soft">
                <h2 className="text-lg font-semibold">External links &amp; verification</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  We provide external links for convenience. You are responsible for verifying the destination,
                  legitimacy, and details before donating or taking any action. We are not responsible for third-party services,
                  content, or transactions.
                </p>
              </section>

              <section className="rounded-3xl border border-emerald-200 bg-white/80 p-6 shadow-soft">
                <h2 className="text-lg font-semibold">Content availability</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  Public pages display only published content. We may update, remove, or change content at any time.
                </p>
              </section>

              <section className="rounded-3xl border border-emerald-200 bg-white/80 p-6 shadow-soft">
                <h2 className="text-lg font-semibold">Limitation of liability</h2>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  The website is provided “as is” without warranties. To the maximum extent permitted by law,
                  Team Humanity is not liable for indirect or consequential damages arising from use of this site
                  or third-party links.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
