import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Photos and JSON store live on the local filesystem (Node runtime).
  output: "standalone",
  serverExternalPackages: [],
};

export default nextConfig;
