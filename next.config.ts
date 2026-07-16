import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Ignore TypeScript errors during production build
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignore ESLint warnings/errors during production build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
