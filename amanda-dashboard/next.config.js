/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: { remotePatterns: [{ protocol: 'https', hostname: '**' }] },
  experimental: { optimizePackageImports: ['lucide-react', 'recharts'] },
};
module.exports = nextConfig;
