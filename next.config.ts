import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ts-morph is server-only; keep it out of the client bundle.
  serverExternalPackages: ["ts-morph"],
};

export default nextConfig;
