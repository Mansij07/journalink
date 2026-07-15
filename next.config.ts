import type { NextConfig } from "next";

// Supabase Storage URLs are external, so next/image needs the host allow-listed.
// Derived from the same env var used everywhere else rather than hardcoded, so
// this stays correct across different Supabase projects/environments.
const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // Emit a self-contained server bundle (.next/standalone) for small Docker images.
  output: "standalone",
  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
}

export default nextConfig
