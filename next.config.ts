import type { NextConfig } from "next";

const isMobileBuild = process.env.NEXT_MOBILE_BUILD === 'true';

const nextConfig: NextConfig = {
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
  ...(isMobileBuild && {
    output: 'export',
    trailingSlash: true,
    images: { unoptimized: true },
    exportPathMap: undefined,
    webpack: (config: any) => {
      const path = require('path');
      const { IgnorePlugin } = require('webpack');
      
      config.module.rules.push({
        test: /app[/\\]api[/\\].*route\.(ts|js)$/,
        use: 'null-loader',
      });
      
      config.plugins.push(
        new IgnorePlugin({
          resourceRegExp: /^.*$/,
          contextRegExp: /app[/\\]api/,
        })
      );
      
      return config;
    },
  }),
  /* config options here */
};

export default nextConfig;
