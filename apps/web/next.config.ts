import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Transpile workspace packages so pure modules imported as source (e.g. the
  // backend's `convex/lib/horario`, used for the real-time opening badge) are
  // compiled for the client bundle.
  transpilePackages: ["@packages/backend", "@packages/shared"],
};

export default nextConfig;
