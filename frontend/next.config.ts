import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // simple-peer uses Node.js built-ins that don't exist in the browser bundle
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        dgram: false,
        child_process: false,
        http2: false,
      };
    }
    return config;
  },
};

export default nextConfig;
