/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Vercel için normal Next.js config
  
  // Disable static optimization for pages that use client-side only features
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  
  // Webpack config for @mysten packages
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;

