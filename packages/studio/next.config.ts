import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: { unoptimized: true },
  transpilePackages: ['@openplaybooks/converge-core'],
  serverExternalPackages: ['yaml'],
};

export default nextConfig;
