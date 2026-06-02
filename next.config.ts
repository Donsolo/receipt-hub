import type { NextConfig } from "next";

const isMobileBuild = process.env.NEXT_MOBILE_BUILD === 'true';

const nextConfig: NextConfig = {
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
  ...(isMobileBuild && {
    output: 'export',
    trailingSlash: true,
    images: { unoptimized: true },
  }),
  /* config options here */
};

export default nextConfig;
