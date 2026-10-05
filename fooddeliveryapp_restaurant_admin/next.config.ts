import type { NextConfig } from "next";

const backendApiUrl = (
  process.env.API_PROXY_TARGET ?? "http://localhost:3000/api"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api-proxy/:path*",
        destination: `${backendApiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
