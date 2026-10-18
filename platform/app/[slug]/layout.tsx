import type { Metadata } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import { getPublicStore } from '@/lib/storefront/read-model';
import { resolveAccent } from '@/lib/storefront/accent';
import { CartProvider } from '@/components/storefront/CartProvider';
import { Header } from '@/components/storefront/Header';
import { Footer } from '@/components/storefront/Footer';
import '@/components/storefront/storefront.css';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const store = await getPublicStore(slug);
  if (!store) return {};

  const description = store.about ?? `Shop ${store.name} on Blackout Merchandise.`;
  const ogImage = store.bannerUrl ?? store.logoUrl ?? undefined;

  return {
    title: store.name,
    description,
    openGraph: {
      title: store.name,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function StoreLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await getPublicStore(slug);

  // Next.js can't route a layout's own notFound() to that same segment's
  // not-found.tsx (the layout that would wrap it is the one that failed to
  // render) — it would bubble to the root and hit the generic default 404
  // instead of ours. So the layout passes through untouched, and every page
  // below checks the store itself and calls notFound(), which *does* use
  // app/[slug]/not-found.tsx correctly since the layout renders fine.
  if (!store) return <>{children}</>;

  // White on black unless the artist chose a colour of their own; the text on
  // it is picked by contrast (lib/storefront/accent.ts).
  const { accent, onAccent } = resolveAccent(store.accentColour);

  return (
    <div
      style={{ '--shop-accent': accent, '--shop-on-accent': onAccent } as CSSProperties}
      className="sf-shell"
    >
      <CartProvider slug={store.slug}>
        <Header store={store} />
        <main className="sf-wrap flex-1">{children}</main>
        <Footer store={store} />
      </CartProvider>
    </div>
  );
}
