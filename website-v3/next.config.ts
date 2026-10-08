import type { NextConfig } from "next";

// Catalog deep-link query keys: any of these on "/" implies the Catalog
// (a shared product/filter link would otherwise land on the roster and
// open nothing). Kept in sync with the routes app/catalog/page.tsx
// replaces.
const CATALOG_QUERY_KEYS = ["product", "type", "fit", "colour", "q"];

// WP3: dev-only routes. `page.dev.tsx` is only a route when this extension
// is registered, so a production build has no /dev/* route at all (the
// pages in app/dev/** are not compiled). It is the FULL default set plus
// the dev extension. SPECIMEN=1 opts a production build in (the page then
// also checks the flag at request time). Docs:
// node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/pageExtensions.md
const DEV_ROUTES = process.env.NODE_ENV !== "production" || process.env.SPECIMEN === "1";

const nextConfig: NextConfig = {
  pageExtensions: ["tsx", "ts", "jsx", "js", ...(DEV_ROUTES ? ["dev.tsx"] : [])],
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
