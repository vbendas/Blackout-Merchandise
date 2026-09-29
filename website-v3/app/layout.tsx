import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Condensed, IBM_Plex_Mono } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SmoothScroll } from "@/components/SmoothScroll";
import { LanguageProvider } from "@/lib/i18n";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { SOCIALS } from "@/lib/socials";
import "./globals.css";

// UI + display face, everywhere: headlines, body copy and the corner
// nav all read Barlow now. Non-variable, so the exact weights the site
// uses (400/500 body, 600 headlines) are requested explicitly.
const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

// Condensed caps display face: masthead, outlined words, set list,
// wordmarks, ink buttons.
const barlowCondensed = Barlow_Condensed({
  variable: "--font-condensed",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

// Mono face for labels, facts, timestamps and code — IBM Plex Mono.
const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

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
  themeColor: "#141414",
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
      className={`${barlow.variable} ${barlowCondensed.variable} ${ibmPlexMono.variable} antialiased`}
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
          {/* Round 7: paper on every route. The footer (sibling) stays dark. */}
          <div data-theme="vintage" style={{ background: "var(--paper)", color: "var(--signal)" }}>
            {children}
          </div>
          <SiteFooter />
        </LanguageProvider>
      </body>
    </html>
  );
}
