/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: false,
  distDir: 'out',
  images: {
    unoptimized: true
  },
  assetPrefix: '',
  basePath: '',
  experimental: {
    esmExternals: false
  },
  reactStrictMode: false,
  swcMinify: true
}

module.exports = nextConfig
