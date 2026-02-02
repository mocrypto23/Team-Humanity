"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitJoinRequest } from "./actions";

const TITLE_MIN = 30;
const TITLE_MAX = 120;

const STORY_MIN = 300;
const STORY_MAX = 12000;

function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function isValidInstagramUrl(s: string) {
  try {
    const u = new URL(s.trim());
    const host = u.hostname.toLowerCase();
    if (!(host.includes("instagram.com") || host.includes("instagr.am"))) return false;

    const parts = u.pathname.split("/").filter(Boolean);
    if (!parts.length) return false;

    const first = parts[0].toLowerCase();
    if (first === "p" || first === "reel" || first === "reels" || first === "tv") return false;

    return true;
  } catch {
    return false;
  }
}

export default function JoinRequestForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [done, setDone] = useState(false);
  const [serverErr, setServerErr] = useState("");
const [countdown, setCountdown] = useState(5);

  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [story, setStory] = useState("");
  const [extraInfo, setExtraInfo] = useState("");

  const [tTitle, setTTitle] = useState(false);
  const [tEmail, setTEmail] = useState(false);
  const [tPhone, setTPhone] = useState(false);
  const [tIg, setTIg] = useState(false);
  const [tStory, setTStory] = useState(false);

  const topRef = useRef<HTMLDivElement | null>(null);

  const titleErr = useMemo(() => {
    const v = title.trim();
    if (!v) return "Title is required.";
    if (v.length < TITLE_MIN) return `Title must be at least ${TITLE_MIN} characters.`;
    if (v.length > TITLE_MAX) return `Title must be at most ${TITLE_MAX} characters.`;
    return "";
  }, [title]);

  const emailErr = useMemo(() => {
    const v = email.trim();
    if (!v) return "Email is required.";
    if (!isValidEmail(v)) return "Please enter a valid email address.";
    return "";
  }, [email]);

  const phoneErr = useMemo(() => {
    const v = phone.trim();
    if (!v) return "Phone is required.";
    if (v.length < 6) return "Phone number seems too short.";
    if (v.length > 40) return "Phone number is too long.";
    return "";
  }, [phone]);

  const igErr = useMemo(() => {
    const v = instagramUrl.trim();
    if (!v) return "Instagram URL is required.";
    if (!isValidInstagramUrl(v)) return "Please provide a valid Instagram profile URL.";
    return "";
  }, [instagramUrl]);

  const storyErr = useMemo(() => {
    const v = story.trim();
    if (!v) return "Story is required.";
    if (v.length < STORY_MIN) return `Story is too short. Minimum is ${STORY_MIN} characters.`;
    if (v.length > STORY_MAX) return `Story is too long. Maximum is ${STORY_MAX} characters.`;
    return "";
  }, [story]);

  const canSubmit = useMemo(() => {
    return !pending && !titleErr && !emailErr && !phoneErr && !igErr && !storyErr;
  }, [pending, titleErr, emailErr, phoneErr, igErr, storyErr]);

  function scrollToTop() {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    if (serverErr) scrollToTop();
  }, [serverErr]);

 useEffect(() => {
  if (!done) return;

  setCountdown(5);

  const tick = setInterval(() => {
    setCountdown((c) => (c > 1 ? c - 1 : 1));
  }, 1000);

  const t = setTimeout(() => {
    clearInterval(tick);

    setDone(false);
    setServerErr("");
    setTitle("");
    setEmail("");
    setPhone("");
    setInstagramUrl("");
    setStory("");
    setExtraInfo("");
    setTTitle(false);
    setTEmail(false);
    setTPhone(false);
    setTIg(false);
    setTStory(false);

    router.replace("/join");
    scrollToTop();
  }, 5000);

  return () => {
    clearTimeout(t);
    clearInterval(tick);
  };
}, [done, router]);

  if (done) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
        <p className="text-sm font-semibold text-emerald-900">We received your request ✅</p>
        <p className="mt-2 text-sm text-emerald-900/80">
          We will contact you as soon as possible with an acceptance or rejection update.
        </p>
        <p className="mt-3 text-xs font-semibold text-emerald-900/80">
  Redirecting in {countdown}s...
</p>

      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();

        setTTitle(true);
        setTEmail(true);
        setTPhone(true);
        setTIg(true);
        setTStory(true);

        setServerErr("");

        if (!canSubmit) {
          scrollToTop();
          return;
        }

        const fd = new FormData();
        fd.set("title", title);
        fd.set("email", email);
        fd.set("phone", phone);
        fd.set("instagram_url", instagramUrl);
        fd.set("story", story);
        fd.set("extra_info", extraInfo);

        startTransition(async () => {
          const res = await submitJoinRequest(fd);
          if (!res.ok) {
            setServerErr(res.error || "Something went wrong.");
            return;
          }
          setDone(true);
          scrollToTop();
        });
      }}
    >
      <div ref={topRef} />

      {serverErr ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {serverErr}
        </div>
      ) : null}

      <label className="block">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-semibold text-zinc-700">Title</span>
          <span className="text-[11px] text-zinc-500">
            min {TITLE_MIN} max {TITLE_MAX} Characters
          </span>
        </div>

        <input
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => setTTitle(true)}
          className={[
            "mt-1 w-full rounded-2xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2",
            tTitle && titleErr
              ? "border-red-300 focus:border-red-300 focus:ring-red-100"
              : "border-zinc-200 focus:border-emerald-300 focus:ring-emerald-100",
          ].join(" ")}
          required
          maxLength={TITLE_MAX}
        />

        {tTitle && titleErr ? (
          <p className="mt-1 text-xs font-medium text-red-700">{titleErr}</p>
        ) : null}
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-zinc-700">Email</span>
        <input
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTEmail(true)}
          className={[
            "mt-1 w-full rounded-2xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2",
            tEmail && emailErr
              ? "border-red-300 focus:border-red-300 focus:ring-red-100"
              : "border-zinc-200 focus:border-emerald-300 focus:ring-emerald-100",
          ].join(" ")}
          required
        />
        {tEmail && emailErr ? (
          <p className="mt-1 text-xs font-medium text-red-700">{emailErr}</p>
        ) : null}
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-zinc-700">Phone</span>
        <input
          name="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          onBlur={() => setTPhone(true)}
          className={[
            "mt-1 w-full rounded-2xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2",
            tPhone && phoneErr
              ? "border-red-300 focus:border-red-300 focus:ring-red-100"
              : "border-zinc-200 focus:border-emerald-300 focus:ring-emerald-100",
          ].join(" ")}
          required
          maxLength={40}
          placeholder="+970..."
        />
        {tPhone && phoneErr ? (
          <p className="mt-1 text-xs font-medium text-red-700">{phoneErr}</p>
        ) : null}
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-zinc-700">Instagram URL</span>
        <input
          name="instagram_url"
          value={instagramUrl}
          onChange={(e) => setInstagramUrl(e.target.value)}
          onBlur={() => setTIg(true)}
          className={[
            "mt-1 w-full rounded-2xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2",
            tIg && igErr
              ? "border-red-300 focus:border-red-300 focus:ring-red-100"
              : "border-zinc-200 focus:border-emerald-300 focus:ring-emerald-100",
          ].join(" ")}
          required
          placeholder="https://instagram.com/your.username"
        />
        {tIg && igErr ? (
          <p className="mt-1 text-xs font-medium text-red-700">{igErr}</p>
        ) : null}
      </label>

      <label className="block">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs font-semibold text-zinc-700">Your story</span>
          <span className="text-[11px] text-zinc-500">
            min {STORY_MIN} max {STORY_MAX} Characters
          </span>
        </div>

        <textarea
          name="story"
          rows={8}
          value={story}
          onChange={(e) => {
            setStory(e.target.value);
            if (!tStory) setTStory(true);
          }}
          onBlur={() => setTStory(true)}
          className={[
            "mt-1 w-full rounded-2xl border bg-white px-3 py-2 text-sm outline-none focus:ring-2",
            tStory && storyErr
              ? "border-red-300 focus:border-red-300 focus:ring-red-100"
              : "border-zinc-200 focus:border-emerald-300 focus:ring-emerald-100",
          ].join(" ")}
          required
        />

        {tStory && storyErr ? (
          <p className="mt-1 text-xs font-medium text-red-700">{storyErr}</p>
        ) : null}
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-zinc-700">
          Additional info <span className="text-zinc-400">(optional)</span>
        </span>
        <textarea
          name="extra_info"
          rows={3}
          value={extraInfo}
          onChange={(e) => setExtraInfo(e.target.value)}
          className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
        />
      </label>

      <button
        type="submit"
        disabled={!canSubmit || pending}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Submitting..." : "Submit request"}
      </button>
    </form>
  );
}
