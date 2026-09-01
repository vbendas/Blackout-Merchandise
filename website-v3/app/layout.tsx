import type { Metadata } from "next";
import { Oswald } from "next/font/google";
import { SmoothScroll } from "@/components/SmoothScroll";
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
  title: "MERCHFROM®",
  description:
    "We help artists, musicians and creators design, source and sell premium merchandise. By application only.",
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
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
