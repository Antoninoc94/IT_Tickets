import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      // Default is 1 MB — raise to accommodate MAX_UPLOAD_SIZE_MB (default 25 MB).
      bodySizeLimit: "30mb",
    },
  },
};

export default nextConfig;
