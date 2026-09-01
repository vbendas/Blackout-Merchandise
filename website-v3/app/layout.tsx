import type { Metadata, Viewport } from "next";
import { Oswald } from "next/font/google";
import { SmoothScroll } from "@/components/SmoothScroll";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { SOCIALS } from "@/lib/socials";
import "./globals.css";

// Display face. The reference site licenses Founders Grotesk Condensed
// Bold (Klim Type Foundry, commercial); Oswald Bold is the closest
// openly-licensed condensed grotesk. Swap in the real Founders files
// here if/when a webfont license is purchased.
const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  weight: "700",
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
  themeColor: "#221f1c",
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
      className={`${oswald.variable} antialiased`}
    >
      {/* No height pin on <html>: Lenis watches the root element's box to
          recompute its scroll limit, and height:100% would freeze it at
          viewport height — capping scroll at whatever view loaded first. */}
      <body className="min-h-screen">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
