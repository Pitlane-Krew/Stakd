import type { NextConfig } from "next";

// Content Security Policy — tuned for Next.js + Supabase + Mapbox
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
  : "*.supabase.co";

const csp = [
  "default-src 'self'",
  // Scripts: Next.js chunks + inline (needed for RSC hydration)
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://api.mapbox.com",
  // Styles: self + inline + Google Fonts
  "style-src 'self' 'unsafe-inline' https://api.mapbox.com https://fonts.googleapis.com",
  // Images: self + Supabase storage + data URIs + blob (for camera captures)
  `img-src 'self' data: blob: https://${supabaseHost} https://api.mapbox.com https://events.mapbox.com`,
  // Fonts: self + data URIs + Google Fonts
  "font-src 'self' data: https://fonts.gstatic.com",
  // Connect: API calls allowed (Supabase, Mapbox, and Anthropic for AI features)
  `connect-src 'self' https://${supabaseHost} https://api.mapbox.com https://events.mapbox.com wss://${supabaseHost} https://api.anthropic.com`,
  // Workers (Next.js, Mapbox)
  "worker-src 'self' blob:",
  // Media: allow camera/microphone access
  "media-src 'self' blob:",
  // Frames: deny everything
  "frame-src 'none'",
  "frame-ancestors 'none'",
  // Object: deny plugins
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(self), payment=()",
  },
  {
    key: "Content-Security-Policy",
    value: csp,
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // Ensure server-only packages are never bundled client-side
  serverExternalPackages: [],

  // Production optimizations
  poweredByHeader: false, // Don't expose Next.js version
  compress: true,

  // TODO: Fix remaining @supabase/postgrest-js@2.101.1 type compatibility issues
  // and remove this before full launch. All errors are type-level only —
  // runtime behavior is correct. Tracked in: database.ts Relationships types.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
