import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/components/cart/CartProvider';
import { ClerkProvider } from '@clerk/nextjs';

const clerkPubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const hasClerk = clerkPubKey && !clerkPubKey.includes('placeholder');

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Merch From | Premium Creator Commerce',
  description: 'Premium merchandise platform for artists who care about quality. Design, source, and sell with zero upfront costs.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} antialiased bg-background text-foreground font-sans selection:bg-white selection:text-black`}
      >
        {hasClerk ? (
          <ClerkProvider publishableKey={clerkPubKey}>
            {children}
            <CartProvider />
          </ClerkProvider>
        ) : (
          <>
            {children}
            <CartProvider />
          </>
        )}
      </body>
    </html>
  );
}
