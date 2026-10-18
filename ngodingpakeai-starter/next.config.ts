import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  poweredByHeader: false,
  // Emits .next/standalone with a minimal server and only the traced runtime
  // files. The Dockerfile ships that folder; npm start keeps working as before.
  // Vercel has its own server output pipeline, so skip standalone there.
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;
