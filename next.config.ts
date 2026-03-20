import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // typedRoutes: true, // re-enable after dynamic hrefs are typed
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
