import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev-only badge: bottom-left sits on the Studio account footer.
  devIndicators: { position: 'bottom-right' },
  // The workspace moved from /chat to /studio (Merch Studio). Links already
  // sent in emails and Discord DMs still point at /chat; query strings
  // (?prompt=, ?bulk=&paid=1) carry over on the redirect.
  async redirects() {
    return [{ source: '/chat', destination: '/studio', permanent: false }];
  },
};

export default nextConfig;
