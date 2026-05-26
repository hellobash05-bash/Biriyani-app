import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    // Note: Next.js 16/15 uses the eslint object with ignoreDuringBuilds
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
