import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicStore, getPublicProduct } from '@/lib/storefront/read-model';
import { ProductView } from '@/components/storefront/ProductView';

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string; productId: string }>;
}) {
  const { slug, productId } = await params;

  const store = await getPublicStore(slug);
  if (!store) notFound();

  const product = await getPublicProduct(store.id, slug, productId);
  // Store exists — an unknown/no-longer-live product is a page-level
  // message, not the store's own "No such shop." not-found boundary.
  if (!product) {
    return (
      <div className="pb-20 pt-8">
        <h1 className="sf-title">Product not found</h1>
        <p className="mf-dim mt-2 text-sm">This piece isn&apos;t available anymore.</p>
        <Link href={`/${slug}`} className="mf-ulink mt-6 inline-block">
          Back to shop
        </Link>
      </div>
    );
  }

  return <ProductView slug={slug} product={product} />;
}
