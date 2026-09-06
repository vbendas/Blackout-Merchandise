import { notFound } from 'next/navigation';
import { getPublicStore } from '@/lib/storefront/read-model';
import { CartPageClient } from '@/components/storefront/CartPageClient';

export default async function CartPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getPublicStore(slug);
  if (!store) notFound();
  return <CartPageClient slug={slug} />;
}
