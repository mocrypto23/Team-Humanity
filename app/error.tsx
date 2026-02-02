// app/error.tsx
"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Optional: send to logging service later
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white text-zinc-900">
      <div className="mx-auto max-w-6xl px-4 py-16">
        <div className="mx-auto max-w-xl overflow-hidden rounded-3xl border border-emerald-200 bg-white/80 p-8 shadow-soft">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-800">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Something went wrong
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight">
            We couldn’t load this page.
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            Please try again. If the issue persists, come back later.
          </p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <button
              onClick={reset}
              className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-soft hover:bg-emerald-700"
              type="button"
            >
              Try again
            </button>

            <a
              href="/"
              className="rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-center text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
            >
              Go to home
            </a>
          </div>

          {error?.digest ? (
            <p className="mt-6 text-xs text-zinc-500">
              Error reference: <span className="font-mono">{error.digest}</span>
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
