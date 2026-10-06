import type { NextConfig } from "next";

const backendApiUrl = (
  process.env.API_PROXY_TARGET ?? "http://localhost:3000/api"
).replace(/\/+$/, "");
const backendRootUrl = backendApiUrl.replace(/\/api\/?$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api-proxy/:path*",
        destination: `${backendApiUrl}/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${backendRootUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
