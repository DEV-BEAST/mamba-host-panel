/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@gamePanel/ui', '@gamePanel/types'],
  experimental: {
    typedRoutes: true,
  },
};

module.exports = nextConfig;
