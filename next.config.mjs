let remotePatterns = [];
try {
  const supabaseUrl = process.env.SUPABASE_URL || "";
  if (supabaseUrl) {
    const host = new URL(supabaseUrl).hostname;
    remotePatterns = [
      { protocol: "https", hostname: host, pathname: "/storage/v1/object/public/**" },
    ];
  }
} catch {
  remotePatterns = [];
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns,
    qualities: [75, 85],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;