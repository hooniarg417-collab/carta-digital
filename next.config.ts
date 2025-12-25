import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Firebase Storage (común)
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "storage.googleapis.com" },

      // Si en algún momento servís imágenes desde tu propio dominio:
      // { protocol: "https", hostname: "tu-dominio.com" },
    ],
  },
};

export default nextConfig;
