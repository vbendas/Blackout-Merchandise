import { notFound } from 'next/navigation';
import { getPublicStore, listCollections, listLiveProducts } from '@/lib/storefront/read-model';
import { piecesLabel } from '@/lib/storefront/present';
import { CollectionPills } from '@/components/storefront/CollectionPills';
import { ProductGrid } from '@/components/storefront/ProductGrid';

export default async function ShopPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ collection?: string }>;
}) {
  const { slug } = await params;
  const { collection } = await searchParams;

  const store = await getPublicStore(slug);
  if (!store) notFound();

  const [collections, allProducts] = await Promise.all([
    listCollections(store.id, slug),
    listLiveProducts(store.id, slug),
  ]);

  // ?collection= only counts when it names a section the shop lists (visible,
  // with live products). A hidden drop, an empty one or a made-up slug is
  // ignored and the whole shop shows.
  const active = collections.find((c) => c.slug === collection);
  const products = active ? allProducts.filter((p) => p.collectionSlug === active.slug) : allProducts;

  return (
    <div>
      <div className="sf-line">
        <h1 className="sf-title">{active?.name ?? 'Shop'}</h1>
        {products.length > 0 && (
          <p className="mf-label mf-dim">{piecesLabel(products.length)} · printed in Barcelona</p>
        )}
      </div>

      <CollectionPills slug={slug} collections={collections} active={active?.slug} />
      <ProductGrid slug={slug} products={products} />
    </div>
  );
}
