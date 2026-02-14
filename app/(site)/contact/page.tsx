"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Status =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; text: string }
  | { type: "error"; text: string };

export default function ContactPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const [status, setStatus] = useState<Status>({ type: "idle" });

  const canSubmit = useMemo(() => {
    return name.trim().length >= 2 && email.trim().length >= 5 && message.trim().length >= 5;
  }, [name, email, message]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || status.type === "loading") return;

    setStatus({ type: "loading" });

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
        }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (!res.ok || !data?.ok) {
        setStatus({ type: "error", text: data?.error || "Something went wrong. Please try again." });
        return;
      }

      setStatus({
        type: "success",
        text: data?.message || "Your message has been sent. We will contact you within 72 business hours.",
      });

      // Show message for 7 seconds then redirect back to /contact
      setTimeout(() => {
        setName("");
        setEmail("");
        setMessage("");
        setStatus({ type: "idle" });
        router.replace("/contact");
      }, 7000);
    } catch {
      setStatus({ type: "error", text: "Network error. Please try again." });
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-semibold">Contact</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600">
        Send us a message and we will get back to you within 72 business hours.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {status.type === "success" && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {status.text}
          </div>
        )}

        {status.type === "error" && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {status.text}
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-zinc-900">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400"
            placeholder="Your name"
            autoComplete="name"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-900">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-900">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-2 min-h-[140px] w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400"
            placeholder="Write your message..."
          />
        </div>

        <button
          type="submit"
          disabled={!canSubmit || status.type === "loading"}
          className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {status.type === "loading" ? "Sending..." : "Send message"}
        </button>
      </form>

      <section className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
        <p className="text-sm font-semibold text-zinc-900">Direct Contact</p>
        <p className="mt-1 text-sm text-zinc-600">For urgent matters, use the details below.</p>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Email</dt>
            <dd className="mt-1 text-sm text-zinc-900">
              <a className="hover:underline" href="mailto:test@gmail.com">
                test@gmail.com
              </a>
            </dd>
          </div>

          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Phone</dt>
            <dd className="mt-1 text-sm text-zinc-900">
              <a className="hover:underline" href="tel:+44000000">
                +44000000
              </a>
            </dd>
          </div>

          <div className="sm:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Office Address</dt>
            <dd className="mt-1 text-sm leading-relaxed text-zinc-900">
              Saqla Building, Al-Shuhada Street, Gaza, Palestine, 4th Floor, Apartment 10.
            </dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
