import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ts-morph is server-only; keep it out of the client bundle.
  serverExternalPackages: ["ts-morph"],
  // The demo fixtures are read from disk at runtime by /api/analyze; trace
  // them into the serverless function or the demo path 500s in production.
  outputFileTracingIncludes: {
    "/api/analyze": ["./fixtures/**/*"],
  },
};

export default nextConfig;
