import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The SDK + playwright-core are server-only; keep them external so Next
  // doesn't try to bundle their native/optional deps into route handlers.
  serverExternalPackages: ["@hyperbrowser/sdk", "playwright-core"],
};

export default nextConfig;
