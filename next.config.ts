import type { NextConfig } from "next";

// Derived at build/start time rather than hardcoded, so this keeps working
// if the connected Supabase project ever changes without anyone remembering
// to update a CSP string by hand.
const supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin
  : "";
const supabaseWsOrigin = supabaseOrigin.replace(/^http/, "ws");

// 'unsafe-inline' on script-src/style-src is a deliberate, pragmatic choice
// rather than an oversight: Next.js's App Router injects its own inline
// hydration/RSC-payload <script> tags and next/font injects inline
// @font-face <style> tags, neither of which carry a nonce here. The
// alternative (a nonce-based CSP wired through middleware) is real Next.js
// functionality but adds meaningfully more moving parts for an MVP whose
// actual threat model this still substantially improves — the settings
// below still block the two things that matter most for a SaaS handling
// billing (clickjacking via frame-ancestors, and a compromised/malicious
// third-party script or iframe origin via default-src/script-src/frame-src
// being scoped to 'self').
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://tile.openstreetmap.org",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin} ${supabaseWsOrigin}`.trim(),
  "frame-src https://checkout.stripe.com https://billing.stripe.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com",
  "object-src 'none'",
]
  .filter(Boolean)
  .join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
