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
    // Next.js checks rewrites in three phases (see
    // https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites):
    //
    //   1. `beforeFiles`  — checked BEFORE route handlers under `app/api/...`
    //   2. `afterFiles`   — checked AFTER route handlers
    //   3. `fallback`     — checked AFTER pages/files but BEFORE 404
    //
    // When `rewrites()` returns an array, those entries default to the
    // `beforeFiles` phase. That means a `beforeFiles` rewrite with source
    // `/api/:path*` would shadow every local Route Handler under `/api/...`
    // (including our new CafeInventory handlers at
    // `src/app/api/cafes/[cafeId]/inventory/...`).
    //
    // To let local route handlers take precedence while still proxying any
    // unmapped `/api/...` path to the upstream .NET backend, we use the
    // object form with two phases:
    //
    //   - `beforeFiles`: ONLY the small set of paths that must NEVER
    //     reach the upstream. Today this is the Cloudinary upload route
    //     (the secret `CLOUDINARY_URL` must not leave the Node runtime).
    //
    //   - `fallback`: the catch-all proxy to the .NET backend. By running
    //     this in the fallback phase, route handlers under `app/api/...`
    //     get a chance to handle the request first; only when no local
    //     handler matches does the request get proxied upstream.
    return {
      beforeFiles: [
        {
          // Local Cloudinary upload route — secret-bound, never proxied.
          source: '/api/upload/:path*',
          destination: '/api/upload/:path*',
        },
        {
          // Local health probes (if any) — never depend on upstream.
          source: '/health/:path*',
          destination: '/health/:path*',
        },
      ],
      fallback: [
        {
          // Anything else under /api/... (auth, profile, board-games,
          // and CafeInventory endpoints without a local handler) is
          // proxied to the upstream .NET backend.
          source: '/api/:path*',
          destination: 'https://boardverse-server.onrender.com/api/:path*',
        },
      ],
    };
  },
};

export default nextConfig;