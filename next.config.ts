// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_ASSET_V: String(Date.now()),
  },
};

export default nextConfig;