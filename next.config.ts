import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    optimizePackageImports: ['lucide-react', 'jspdf', 'jspdf-autotable'],
  },
};

export default nextConfig;
