import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { ibmPlexMono, inter } from '@/lib/fonts';
import { getUserByClerkId } from '@/lib/services/users';
import { DEV_BYPASS } from '@/lib/auth';
import { MotionProvider } from '@/components/providers/MotionProvider';
// Order matters: tokens.css (identity classes) loads after Tailwind.
import './globals.css';
import '@/components/chat/tokens.css';
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: {
    default: 'MerchFrom',
    template: '%s · MerchFrom',
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
    <html lang={lang} className={cn("antialiased", inter.variable, ibmPlexMono.variable, "font-sans")}>
      <body className="min-h-screen">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );

  // Dev bypass: no Clerk keys, so no provider (it validates the key on render).
  if (DEV_BYPASS) return page;

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#f2efe9',
          colorBackground: '#000000',
          // Clerk v7 renamed colorText -> colorForeground and
          // colorInputBackground/colorInputText -> colorInput/colorInputForeground.
          colorForeground: '#f2efe9',
          colorInput: '#0d0d0d',
          colorInputForeground: '#f2efe9',
          borderRadius: '2px',
        },
      }}
    >
      {page}
    </ClerkProvider>
  );
}
