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
  swcMinify: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
      '@shared': require('path').resolve(__dirname, 'src/shared'),
      '@extension': require('path').resolve(__dirname, 'src/extension'),
      '@app': require('path').resolve(__dirname, 'src/app'),
    };
    return config;
  },
}

module.exports = nextConfig
