import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { getPublicStore, listCollections } from '@/lib/storefront/read-model';
import { CartProvider } from '@/components/storefront/CartProvider';
import { Header } from '@/components/storefront/Header';
import { Footer } from '@/components/storefront/Footer';

const DEFAULT_ACCENT = '#E11D48';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const store = await getPublicStore(slug);
  if (!store) return {};

  const description = store.about ?? `Shop ${store.name} on MerchFrom.`;
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

  const collections = await listCollections(store.id, slug);

  return (
    <div
      data-mode="dark"
      style={{ '--accent': store.accentColour ?? DEFAULT_ACCENT } as React.CSSProperties}
      className="flex min-h-screen flex-col"
    >
      <CartProvider slug={store.slug}>
        <Header store={store} collections={collections} />
        <main className="flex-1 pt-12">{children}</main>
        <Footer store={store} />
      </CartProvider>
    </div>
  );
}
