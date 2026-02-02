/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
let supabaseHost = null;

try {
  supabaseHost = supabaseUrl ? new URL(supabaseUrl).hostname : null;
} catch {
  supabaseHost = null;
}

const nextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

module.exports = nextConfig;
