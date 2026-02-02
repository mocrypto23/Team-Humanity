import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { supabaseAuthServer } from "@/lib/supabaseAuthServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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


    const maxBytes = 6 * 1024 * 1024; 
    if (file.size > maxBytes) {
      return NextResponse.json(
        { ok: false, error: "File too large (max 6MB)" },
        { status: 400 }
      );
    }

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (file.type && !allowed.includes(file.type)) {
      return NextResponse.json(
        { ok: false, error: "Unsupported file type" },
        { status: 400 }
      );
    }

    const bucket = "influencers";
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const safeName = `${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}.${ext}`;
    const path = `uploads/${safeName}`;

    const arrayBuffer = await file.arrayBuffer();

    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, Buffer.from(arrayBuffer), {
        contentType: file.type || "image/jpeg",
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
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
