/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: false,
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
