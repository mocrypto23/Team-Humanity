"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-600 text-sm font-bold text-white shadow-soft">
            TH
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Team Humanity</p>
            <p className="text-[11px] text-zinc-500">Direct support, transparent.</p>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          {/* Stories */}
          {isHome ? (
            <a
              href="#stories"
              className="rounded-xl px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
            >
              Stories
            </a>
          ) : (
            <Link
              href="/#stories"
              scroll={false}
              className="rounded-xl px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
            >
              Stories
            </Link>
          )}

          {/* How it works */}
          {isHome ? (
            <a
              href="#how"
              className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 sm:inline-flex"
            >
              How it works
            </a>
          ) : (
            <Link
              href="/#how"
              scroll={false}
              className="hidden rounded-xl px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 sm:inline-flex"
            >
              How it works
            </Link>
          )}

          <Link
            href="/contact"
            className="whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
          >
            Contact Us
          </Link>

          <Link
            href="/join"
            className="rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-emerald-700"
          >
            Request to join
          </Link>
        </nav>
      </div>
    </header>
  );
}
