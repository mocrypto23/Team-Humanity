import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseAuthServer } from "@/lib/supabaseAuthServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const IMAGE_MAX_BYTES = 6 * 1024 * 1024;
const VIDEO_MAX_BYTES = 80 * 1024 * 1024;

function classifyUpload(file: File): null | {
  folder: "uploads" | "videos";
  maxBytes: number;
  fallbackType: string;
} {
  const type = String(file.type || "").toLowerCase();
  const ext = (file.name.split(".").pop() || "").toLowerCase();

  const imageByExt = !type && ["jpg", "jpeg", "png", "webp"].includes(ext);
  if (IMAGE_TYPES.has(type) || imageByExt) {
    return {
      folder: "uploads",
      maxBytes: IMAGE_MAX_BYTES,
      fallbackType: "image/jpeg",
    };
  }

  const videoByExt = !type && ["mp4", "webm", "mov", "m4v"].includes(ext);
  if (VIDEO_TYPES.has(type) || videoByExt) {
    return {
      folder: "videos",
      maxBytes: VIDEO_MAX_BYTES,
      fallbackType: "video/mp4",
    };
  }

  return null;
}

function parseAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

async function requireAdminOrThrow() {
  const sb = await supabaseAuthServer();
  const { data, error } = await sb.auth.getUser();
  const email = data?.user?.email?.toLowerCase() || "";

  if (error || !email) {
    return { ok: false as const, status: 401, message: "Unauthorized" };
  }

  const admins = parseAdminEmails();
  if (!admins.includes(email)) {
    return { ok: false as const, status: 403, message: "Forbidden" };
  }

  return { ok: true as const, email };
}

export async function POST(req: Request) {

  const gate = await requireAdminOrThrow();
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: gate.message },
      { status: gate.status }
    );
  }

  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "Missing file" },
        { status: 400 }
      );
    }

    const upload = classifyUpload(file);
    if (!upload) {
      return NextResponse.json(
        { ok: false, error: "Unsupported file type" },
        { status: 400 }
      );
    }

    if (file.size > upload.maxBytes) {
      const maxMb = Math.floor(upload.maxBytes / (1024 * 1024));
      return NextResponse.json(
        { ok: false, error: `File too large (max ${maxMb}MB)` },
        { status: 400 }
      );
    }

    const bucket = "influencers";
    const ext = (file.name.split(".").pop() || "").toLowerCase() || (upload.folder === "videos" ? "mp4" : "jpg");
    const safeName = `${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}.${ext}`;
    const path = `${upload.folder}/${safeName}`;

    const arrayBuffer = await file.arrayBuffer();

    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, Buffer.from(arrayBuffer), {
        contentType: file.type || upload.fallbackType,
        upsert: false,
        cacheControl: "31536000",
      });

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, path });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
