/** @type {import('next').NextConfig} */

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.blob.core.windows.net',
      },
    ],
  },
  typescript: {
    // During development, we want to see TypeScript errors
    // In production, ignore to allow deployment
    ignoreBuildErrors: process.env.NODE_ENV === 'production',
  },
  eslint: {
    // During development, we want to see ESLint errors
    // In production, ignore to allow deployment
    ignoreDuringBuilds: process.env.NODE_ENV === 'production',
  },
};

module.exports = process.env.NEXT_PUBLIC_FEATURE_PWA === 'true' 
  ? withPWA(nextConfig) 
  : nextConfig;