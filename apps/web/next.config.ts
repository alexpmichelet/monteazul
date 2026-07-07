import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Transpile workspace packages so pure modules imported as source (e.g. the
  // backend's `convex/lib/horario`, used for the real-time opening badge) are
  // compiled for the client bundle.
  transpilePackages: ["@packages/backend", "@packages/shared"],
  // Commerce photos are served from Convex file storage; allow next/image to
  // load them (the host is the active deployment's *.convex.cloud domain).
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.convex.cloud",
        pathname: "/api/storage/**",
      },
    ],
  },
};

export default nextConfig;
