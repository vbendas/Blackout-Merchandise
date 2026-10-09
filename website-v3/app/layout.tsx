import type { Metadata, Viewport } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SmoothScroll } from "@/components/SmoothScroll";
import { body, display, mono } from "@/lib/fonts";
import { LanguageProvider } from "@/lib/i18n";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { SOCIALS } from "@/lib/socials";
import { INK } from "@/lib/theme-colors";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    type: "website",
    locale: "en",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: INK,
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  sameAs: SOCIALS.map((social) => social.href),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="ink"
      className={`${display.variable} ${mono.variable} ${body.variable} antialiased`}
    >
      {/* No height pin on <html>: Lenis watches the root element's box to
          recompute its scroll limit, and height:100% would freeze it at
          viewport height — capping scroll at whatever view loaded first. */}
      <body className="min-h-screen">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <LanguageProvider>
          <SmoothScroll />
          {/* Fixed/absolute over the page top on every route — see
              SiteHeader for how it stays legible over the home hero. */}
          <SiteHeader />
          {/* Round 9: ink is the default ground (<html data-theme="ink">).
              Pages that are still paper carry their own data-theme="vintage"
              wrapper (aliased to paper until WP21). */}
          {children}
          <SiteFooter />
        </LanguageProvider>
      </body>
    </html>
  );
}
