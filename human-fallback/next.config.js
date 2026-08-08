/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@hyperbrowser/sdk', 'puppeteer-core']
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle server-only modules for client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        'node:assert': false,
        'node:child_process': false,
        'node:fs/promises': false,
        'node:path': false,
        'node:url': false,
        'node:util': false,
        'node:stream': false,
        'node:buffer': false,
        'node:crypto': false,
        'node:os': false,
        'node:events': false,
        'node:querystring': false,
        'node:http': false,
        'node:https': false,
        'node:zlib': false,
        'child_process': false,
        'assert': false,
        'path': false,
        'url': false,
        'util': false,
        'stream': false,
        'buffer': false,
        'crypto': false,
        'os': false,
        'events': false,
        'querystring': false,
        'http': false,
        'https': false,
        'zlib': false,
      };

      // Exclude server-only packages from client bundle
      config.externals = config.externals || [];
      config.externals.push(
        '@hyperbrowser/sdk',
        'puppeteer-core'
      );
    }
    return config;
  },
};

module.exports = nextConfig;
