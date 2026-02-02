export type DonationLinkItem = {
  label: string;
  url: string;
};

export type InfluencerRow = {
  id: number;
  name: string;
  bio: string | null;
  video_url: string | null;

  // legacy single link (may still exist in DB)
  donation_link: string | null;

  // new: multiple links
  donation_links: DonationLinkItem[] | null;

  image_paths: string[] | null;

  sort_order: number | null;
  is_published: boolean | null;

  // verified badge
  is_confirmed: boolean | null;
  confirmed_label: string | null;

    highlight_slot: number | null; 
};
export type JoinRequestRow = {
  id: number;
  created_at: string;

  title: string;
  email: string;
  phone: string;
  instagram_url: string;
  story: string;
  extra_info: string | null;

  is_read: boolean;
  read_at: string | null;

  is_archived: boolean;
  archived_at: string | null;
};
