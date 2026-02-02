// D:\New-Project\team-humanity\components\admin\AdminShell.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserPlus, MessageSquare, Star, Menu, X, LogOut } from "lucide-react";
import { adminSignOut } from "@/app/admin/actions";

type NavItem = {
  href: string;
  label: string;
  Icon: any;
  badge?: string;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname.startsWith(href);
}

export default function AdminShell({
  children,
  email,
  joinBadge,
  messagesBadge,
}: {
  children: React.ReactNode;
  email: string;
  joinBadge: string;
  messagesBadge: string;
}) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const navItems: NavItem[] = useMemo(
    () => [
      { href: "/admin", label: "Influencers", Icon: Star },
      {
        href: "/admin/join-requests?tab=unread",
        label: "Join Requests",
        Icon: UserPlus,
        badge: joinBadge,
      },
      {
        href: "/admin/messages?tab=unread",
        label: "Messages",
        Icon: MessageSquare,
        badge: messagesBadge,
      },
    ],
    [joinBadge, messagesBadge]
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white text-zinc-900 font-sans flex flex-col">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-28 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-200/30 blur-2xl" />
        <div className="absolute top-40 right-0 h-72 w-72 rounded-full bg-emerald-100/60 blur-2xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-emerald-100/55 blur-2xl" />
      </div>

      <header className="px-6 lg:px-10 h-20 flex items-center justify-between sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-emerald-100 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-200">
              E
            </div>
            <span className="font-bold text-xl text-emerald-900 hidden md:block">
              Emerald
            </span>
          </div>

          <nav className="hidden lg:flex items-center gap-1 ml-6 bg-zinc-100/50 p-1.5 rounded-2xl border border-zinc-200/50">
            {navItems.map((item, idx) => {
              const active =
                idx === 0
                  ? pathname === "/admin"
                  : isActivePath(pathname, item.href.split("?")[0]);

              return (
                <Link
                  key={item.href + idx}
                  href={item.href}
                  className={[
                    "relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200",
                    active
                      ? "bg-white text-emerald-700 shadow-sm ring-1 ring-black/5"
                      : "text-zinc-500 hover:text-emerald-600 hover:bg-white/50",
                  ].join(" ")}
                >
                  <item.Icon className="w-4 h-4" />
                  <span>{item.label}</span>

                  {item.badge ? (
                    <span className="ml-1 inline-flex min-w-[22px] items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] font-bold text-white shadow">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsMobileOpen(true)}
            className="lg:hidden p-2 rounded-xl text-zinc-600 hover:bg-emerald-50"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="hidden md:flex items-center gap-2">
            <div className="w-9 h-9 rounded-full border border-emerald-200 bg-emerald-50 flex items-center justify-center text-emerald-800 text-xs font-bold">
              {email?.slice(0, 2).toUpperCase()}
            </div>

            <div className="text-right hidden xl:block">
              <p className="text-xs font-bold text-zinc-900">Admin</p>
              <p className="text-[10px] text-zinc-500 truncate max-w-[220px]">
                {email}
              </p>
            </div>
          </div>

          <div className="h-8 w-px bg-zinc-200 hidden md:block" />

          <form action={adminSignOut}>
            <button className="p-2 rounded-xl text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </form>
        </div>
      </header>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-lg flex flex-col p-6 lg:hidden">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-emerald-800">Menu</h1>
            <button
              onClick={() => setIsMobileOpen(false)}
              className="p-2 rounded-full bg-emerald-50 text-emerald-800"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="space-y-3">
            {navItems.map((item, idx) => {
              const active =
                idx === 0
                  ? pathname === "/admin"
                  : isActivePath(pathname, item.href.split("?")[0]);

              return (
                <Link
                  key={item.href + idx}
                  href={item.href}
                  className={[
                    "flex items-center justify-between gap-4 px-6 py-4 rounded-2xl transition-all text-lg font-medium",
                    active
                      ? "bg-emerald-600 text-white shadow-lg"
                      : "text-zinc-600 bg-zinc-50 border border-zinc-100",
                  ].join(" ")}
                >
                  <span className="flex items-center gap-4">
                    <item.Icon className="w-6 h-6" />
                    <span>{item.label}</span>
                  </span>

                  {item.badge ? (
                    <span className="inline-flex min-w-[26px] items-center justify-center rounded-full bg-red-600 px-2 py-0.5 text-[12px] font-bold text-white shadow">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-6">
            <form action={adminSignOut}>
              <button className="w-full rounded-2xl bg-zinc-900 text-white py-3 font-bold">
                Sign out
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
    </div>
  );
}
