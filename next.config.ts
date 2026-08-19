import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'boardverse-server.onrender.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'cf.geekdo-images.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://boardverse-server.onrender.com/api/:path*',
      },
      {
        source: '/health/:path*',
        destination: 'https://boardverse-server.onrender.com/health/:path*',
      },
    ];
  },
};

export default nextConfig;
