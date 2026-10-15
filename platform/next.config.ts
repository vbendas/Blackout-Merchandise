import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only badge: bottom-left sits on the Studio account footer.
  devIndicators: { position: 'bottom-right' },
  // public/ is served as static files by the CDN, so no function should carry
  // it. The packshots (273 MB) and gallery stills (40 MB) were traced into
  // every server function through a readFile of public/, which broke the
  // function size limit; packshots are now read through lib/services/packshots.ts
  // (PACKSHOT_BASE_URL). Server code that reads these folders anyway would drag
  // them back in, so they are excluded for every route (this also applies to
  // Turbopack builds, checked on 16.3.4). .data is the local print storage.
  outputFileTracingExcludes: {
    '/*': ['./public/packshots/**/*', './public/gallery/**/*', './public/dev/**/*', './.data/**/*', './.local-demo/**/*', './node_modules/@electric-sql/**/*'],
  },
  // With proxy.ts, Next buffers a request body only up to 10 MB and silently
  // hands the route the first 10 MB of a bigger one (checked on 16.3.4). In
  // development the local upload link (print storage, PUT /api/print-files)
  // takes real PSDs, so raise it there. Not in production: the limit is a
  // memory cap on every request that passes the proxy, public ones included,
  // and production uploads go straight to R2 on a signed URL instead.
  ...(process.env.NODE_ENV === 'production' ? {} : { experimental: { proxyClientMaxBodySize: '1gb' } }),
  // The print pack (lib/print/pack) is reachable from server code through
  // lib/print/pipeline.ts, though only the worker runs it. pdfkit reads its
  // font metrics from its own folder at runtime, which breaks once bundled,
  // and the PSD libraries are large; all three load with Node's own require.
  // PGlite (the local demo database, lib/dev/local-db.ts) is Postgres compiled
  // to WebAssembly: it loads with Node's require too, only when LOCAL_DB_DIR is
  // set outside production, and the traces above keep it out of every function.
  serverExternalPackages: ['pdfkit', 'ag-psd', '@webtoon/psd', '@electric-sql/pglite'],
  // The workspace moved from /chat to /studio (Merch Studio). Links already
  // sent in emails and Discord DMs still point at /chat; query strings
  // (?prompt=, ?bulk=&paid=1) carry over on the redirect.
  async redirects() {
    return [{ source: '/chat', destination: '/studio', permanent: false }];
  },
};

export default nextConfig;
