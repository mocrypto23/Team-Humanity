// app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white text-zinc-900">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-emerald-200 bg-white/80 p-8 shadow-soft">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            404 — Not Found
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight">
            This page doesn’t exist.
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            The link may be broken, or the page may have been moved.
          </p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link
              href="/"
              className="rounded-2xl bg-emerald-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-soft hover:bg-emerald-700"
            >
              Go back home
            </Link>

            <a
  href="/#stories"
  className="rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-center text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
>
  Explore stories
</a>

          </div>

          <div className="mt-8 rounded-2xl border border-emerald-100 bg-white p-4 text-xs text-zinc-600">
            Tip: If you typed the address manually, double-check the spelling.
          </div>
        </div>
      </div>
    </main>
  );
}
