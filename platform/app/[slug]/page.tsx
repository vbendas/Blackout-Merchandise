import { notFound } from 'next/navigation';
import { getPublicStore, listCollections, listLiveProducts } from '@/lib/storefront/read-model';
import { CollectionPills } from '@/components/storefront/CollectionPills';
import { ProductGrid } from '@/components/storefront/ProductGrid';
import { Hairline } from '@/components/ui/Hairline';

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

  const [collections, products] = await Promise.all([
    listCollections(store.id, slug),
    listLiveProducts(store.id, slug, collection),
  ]);

  return (
    <div>
      {store.bannerUrl && (
        <div className="mb-10">
          <div style={{ aspectRatio: '16 / 6' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={store.bannerUrl} alt={store.name} className="h-full w-full object-cover" />
          </div>
          <Hairline />
        </div>
      )}

      <CollectionPills slug={slug} collections={collections} active={collection} />
      <ProductGrid slug={slug} products={products} />
    </div>
  );
}
