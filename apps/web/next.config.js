/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@artik/agent", "@artik/data", "@artik/shared"],
  experimental: {
    esmExternals: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude Playwright from webpack bundling - it needs to run in Node
      config.externals = [...(config.externals || []), 'playwright', 'playwright-core'];
    }
    return config;
  },
};

module.exports = nextConfig;
