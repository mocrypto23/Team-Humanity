// src/components/HomeHero.tsx
"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

export default function HomeHero() {
  const reduceMotion = useReducedMotion();
  const floatY = reduceMotion ? 0 : [0, -7, 0];

  return (
    <section className="relative overflow-hidden">
      {/* Background accents */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-200/35 blur-3xl" />
        <div className="absolute top-24 right-[-120px] h-[360px] w-[360px] rounded-full bg-emerald-100/70 blur-3xl" />
        <div className="absolute bottom-[-140px] left-[-120px] h-[360px] w-[360px] rounded-full bg-emerald-100/70 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          {/* Text */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-800"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Transparent • Direct • Human
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: floatY }}
              transition={{
                opacity: { duration: 0.45, delay: 0.05 },
                y: { duration: 3.1, repeat: Infinity, ease: "easeInOut" },
              }}
              className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 md:text-5xl"
              style={{ willChange: "transform" }}
            >
              Help directly.
              <br />
              Transparently.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: reduceMotion ? 0 : [0, -3, 0] }}
              transition={{
                opacity: { duration: 0.45, delay: 0.12 },
                y: { duration: 7.5, repeat: Infinity, ease: "easeInOut" },
              }}
              className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-600 md:text-base"
              style={{ willChange: "transform" }}
            >
              Team Humanity is a curated space that highlights personal stories and trusted links to offer direct support —
              simple, respectful, and transparent.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="mt-6 flex flex-col gap-2 sm:flex-row"
            >
              <a
                href="#stories"
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-soft hover:bg-emerald-700"
              >
                Explore stories
              </a>
              <a
                href="#how"
                className="rounded-2xl border border-emerald-200 bg-white/80 px-5 py-3 text-center text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
              >
                How it works
              </a>
            </motion.div>
          </div>

          {/* Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-soft">
              <div className="relative aspect-[16/10] w-full">
                <Image
                  src="/Hero.webp"
                  alt="Team Humanity banner"
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>

              {/* Overlay card */}
              <div className="absolute inset-x-4 bottom-4">
                <div className="pointer-events-none absolute -inset-x-4 -bottom-4 h-36 bg-gradient-to-t from-black/30 via-black/10 to-transparent" />

                <div className="relative rounded-2xl border border-white/20 bg-white/50 p-4 shadow-lg shadow-black/10 backdrop-blur-md">
                  <p className="text-xs font-semibold text-emerald-900">
                    Tip: Verified badges highlight confirmed profiles when available.
                  </p>
                  <p className="mt-1 text-xs text-zinc-800/80">
                    Tap any story to view video / reel and donation link.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
