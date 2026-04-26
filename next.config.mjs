/** @type {import('next').NextConfig} */
const rawBasePath = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim();
const normalizedBasePath = rawBasePath
  ? `/${rawBasePath.replace(/^\/+|\/+$/g, "")}`
  : "";

const nextConfig = {
  output: "export",
  trailingSlash: true,
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  ...(normalizedBasePath
    ? {
        basePath: normalizedBasePath,
        assetPrefix: `${normalizedBasePath}/`,
      }
    : {}),
  images: {
    unoptimized: true,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Prevent corrupted incremental cache on some Windows setups.
      config.cache = false;
    }

    return config;
  },
};

export default nextConfig;
