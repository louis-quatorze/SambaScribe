/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      resolveAlias: {
        'pdfjs-dist': 'pdfjs-dist/legacy/build/pdf.js'
      }
    }
  }
}

export default nextConfig; 