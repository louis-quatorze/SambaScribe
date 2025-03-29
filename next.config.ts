import type { NextConfig } from "next";
import type { Configuration as WebpackConfig } from "webpack";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  webpack: (config: WebpackConfig, { isServer }: { isServer: boolean }) => {
    // Server-side configuration
    if (isServer) {
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...config.resolve?.fallback,
          canvas: false,
          fs: false,
          path: false,
          zlib: false,
          stream: false,
          util: false,
          crypto: false,
        },
      };
    }

    return config;
  },
} satisfies NextConfig;

export default nextConfig;
