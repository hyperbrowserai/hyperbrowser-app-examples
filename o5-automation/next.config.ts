import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the server-only SDK external so Next does not bundle optional deps.
  serverExternalPackages: ["@hyperbrowser/sdk"],
};

export default nextConfig;
