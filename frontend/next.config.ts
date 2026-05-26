import type { NextConfig } from "next";

const isGithubPages = process.env.NEXT_PUBLIC_IS_GITHUB_PAGES === 'true' || process.env.GITHUB_ACTIONS === 'true';

const nextConfig: NextConfig = {
  output: isGithubPages ? 'export' : undefined,
  basePath: isGithubPages ? '/Biriyani-app' : undefined,
  assetPrefix: isGithubPages ? '/Biriyani-app/' : undefined,
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
