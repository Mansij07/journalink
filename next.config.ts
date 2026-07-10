import type { NextConfig } from "next";

const nextConfig = {
  reactStrictMode: false,
  // Emit a self-contained server bundle (.next/standalone) for small Docker images.
  output: "standalone",
}

export default nextConfig
