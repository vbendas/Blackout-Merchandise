import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { oswald } from '@/lib/fonts';
import { getUserByClerkId } from '@/lib/services/users';
import { DEV_BYPASS } from '@/lib/auth';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: {
    default: 'MERCHFROM®',
    template: '%s — MERCHFROM®',
  },
};

async function resolveLang(): Promise<string> {
  if (DEV_BYPASS) return 'en';
  try {
    const { userId } = await auth();
    if (!userId) return 'en';
    const user = await getUserByClerkId(userId);
    return user?.locale || 'en';
  } catch {
    return 'en';
  }
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const lang = await resolveLang();

  const page = (
    <html lang={lang} className={cn("antialiased", oswald.variable, "font-sans", geist.variable)}>
      <body className="min-h-screen">{children}</body>
    </html>
  );

  // Dev bypass: no Clerk keys, so no provider (it validates the key on render).
  if (DEV_BYPASS) return page;

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#ede4dd',
          colorBackground: '#221f1c',
          // Clerk v7 renamed colorText -> colorForeground and
          // colorInputBackground/colorInputText -> colorInput/colorInputForeground.
          colorForeground: '#ede4dd',
          colorInput: '#2a2724',
          colorInputForeground: '#ede4dd',
          borderRadius: '2px',
        },
      }}
    >
      {page}
    </ClerkProvider>
  );
}
