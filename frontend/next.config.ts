import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_ACTIONS === 'true';

const nextConfig: NextConfig = {
  output: isGithubPages ? 'export' : undefined,
  basePath: isGithubPages ? '/Biriyani-app' : undefined,
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: '/admin/order',
        destination: '/admin/orders',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
