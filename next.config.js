/** @type {import('next').NextConfig} */

const nextConfig = {
  swcMinify: true,
  reactStrictMode: true,
  poweredByHeader: false,
  webpack: (config) => {
    config.resolve.fallback = { fs: false };
    return config;
  },
  experimental: {
    turbo: {
      resolveAlias: {
        'pdfjs-dist': 'pdfjs-dist/legacy/build/pdf.js'
      }
    },
  },
  // Set the base path to match your deployment environment
  basePath: process.env.NODE_ENV === 'production' ? '/music-sheet-analysis' : '',
  // Allow images and files to be served from the uploads directory
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '',
        pathname: '/api/uploads/**',
      },
    ],
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
}

export default nextConfig; 