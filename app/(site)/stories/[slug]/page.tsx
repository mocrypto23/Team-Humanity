import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import type { InfluencerRow } from "@/lib/types";
import StoryPageClient from "@/components/StoryPageClient";

export const revalidate = false;

function slugifyName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function getIdBySlug(slug: string): Promise<number | null> {
  const { data, error } = await supabaseServer
    .from("influencers")
    .select("id,name")
    .eq("is_published", true)
    .limit(500);

  if (error || !data) return null;

  const found = data.find((x: any) => slugifyName(String(x?.name || "")) === slug);
  return found ? Number(found.id) : null;
}

async function getInfluencerById(id: number): Promise<InfluencerRow | null> {
  const { data, error } = await supabaseServer
    .from("influencers")
    .select(
      "id,name,bio,video_url,donation_link,donation_links,image_paths,is_confirmed,confirmed_label,highlight_slot"
    )
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();

  if (error) return null;
  return (data ?? null) as InfluencerRow | null;
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const clean = decodeURIComponent(slug || "").toLowerCase().trim();
  if (!clean) return notFound();

  const id = await getIdBySlug(clean);
  if (!id) return notFound();

  const influencer = await getInfluencerById(id);
  if (!influencer) return notFound();

  return <StoryPageClient influencer={influencer} />;
}
