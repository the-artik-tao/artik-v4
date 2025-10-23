/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@artik/agent", "@artik/data", "@artik/shared"],
  experimental: {
    esmExternals: true,
  },
};

module.exports = nextConfig;
