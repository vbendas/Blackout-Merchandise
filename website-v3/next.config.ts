import type { NextConfig } from "next";

// Catalog deep-link query keys: any of these on "/" implies the Catalog
// (a shared product/filter link would otherwise land on the roster and
// open nothing). Kept in sync with the routes app/catalog/page.tsx
// replaces.
const CATALOG_QUERY_KEYS = ["product", "type", "fit", "colour", "q"];

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        has: [{ type: "query", key: "view", value: "gallery" }],
        destination: "/gallery",
        permanent: true,
      },
      {
        source: "/",
        has: [{ type: "query", key: "view", value: "grid" }],
        destination: "/catalog",
        permanent: true,
      },
      ...CATALOG_QUERY_KEYS.map((key) => ({
        source: "/",
        has: [{ type: "query" as const, key }],
        destination: "/catalog",
        permanent: true,
      })),
    ];
  },
};

export default nextConfig;
