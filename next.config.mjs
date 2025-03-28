/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
    unoptimized: process.env.NODE_ENV === 'development',
  },
  // Ensure static files in public directory are served correctly
  async rewrites() {
    return [
      {
        source: '/All Tables & Figures/:path*',
        destination: '/All Tables & Figures/:path*',
      },
    ];
  },
};

export default nextConfig;
