import type { NextConfig } from "next";

const isMobileBuild = process.env.NEXT_MOBILE_BUILD === 'true';

const nextConfig: NextConfig = {
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
  ...(isMobileBuild && {
    output: 'export',
    trailingSlash: true,
    images: { unoptimized: true },
    webpack: (config) => {
      const path = require('path');
      config.resolve.alias['next/headers'] = path.resolve(__dirname, 'mock-headers.js');
      return config;
    },
  }),
  /* config options here */
};

export default nextConfig;
