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
  async headers() {
    // Stop Chromium/Edge same-site prefetching from reusing a credential-less
    // response for the guarded editor routes (a prefetched 307 lands on /login).
    return [
      {
        source: "/new",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "Vary", value: "Cookie" },
        ],
      },
      {
        source: "/edit/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "Vary", value: "Cookie" },
        ],
      },
    ];
  },
};

export default nextConfig;