import type { Metadata } from 'next';
import { Caveat, DM_Sans, Geist, Geist_Mono, Inter } from 'next/font/google';
import { AccessibilityWidget } from '@/components/accessibility-widget';
import { FloatingSocials } from '@/components/floating-socials';
import { GradualBlurBottom } from '@/components/gradual-blur-bottom';
import { Footer } from '@/components/layout/footer';
import { TopNavbar } from '@/components/layout/navbar';
import OrientationLock from '@/components/OrientationLock';
import { SmoothScrolling } from '@/components/smooth-scrolling';
import { AvatarExpressionProvider } from '@/context/AvatarExpressionContext';
import { Providers } from '@/providers/heroui-provider';
import { CatChatProvider } from '@/components/chat/CatChatProvider';
import { CatChat } from '@/components/chat/CatChat';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
});

const caveat = Caveat({
  variable: '--font-caveat',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Merch From | Premium Merchandise for Artists',
  description:
    'Premium merchandise for artists who care about quality. Design, source, and sell — zero upfront costs, ethical production, in-house in Portugal.',
  keywords: ['merchandise', 'artist merch', 'premium clothing', 'streetwear', 'custom apparel'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="preload"
          as="image"
          href="https://res.cloudinary.com/drhfgth7c/image/upload/f_auto,q_auto,w_400/merch-from/avatars/antonia/1_-_neutral_attr1_subject"
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${dmSans.variable} ${caveat.variable} antialiased bg-background text-foreground`}
      >
        <SmoothScrolling>
          <Providers>
            <CatChatProvider>
              <AvatarExpressionProvider>
                <AccessibilityWidget />
                <OrientationLock />
                <TopNavbar />
                <FloatingSocials />
                <CatChat />
                <GradualBlurBottom />
                {children}
                <Footer />
              </AvatarExpressionProvider>
            </CatChatProvider>
          </Providers>
        </SmoothScrolling>
      </body>
    </html>
  );
}
