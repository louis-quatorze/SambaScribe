/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      resolveAlias: {
        'pdfjs-dist': 'pdfjs-dist/legacy/build/pdf.js'
      }
    }
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
  }
}

export default nextConfig; 