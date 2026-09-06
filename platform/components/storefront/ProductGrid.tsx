import type { PublicProductListItem } from '@/lib/storefront/read-model';
import { ProductCard } from '@/components/storefront/ProductCard';

export function ProductGrid({ slug, products }: { slug: string; products: PublicProductListItem[] }) {
  if (products.length === 0) {
    return (
      <p className="mf-dim" style={{ paddingInline: 'var(--gutter)', paddingBlock: '80px' }}>
        Nothing here yet.
      </p>
    );
  }

  return (
    <div
      className="grid grid-cols-2 gap-x-6 gap-y-14 md:grid-cols-3 lg:grid-cols-4"
      style={{ paddingInline: 'var(--gutter)' }}
    >
      {products.map((product) => (
        <ProductCard key={product.id} slug={slug} product={product} />
      ))}
    </div>
  );
}
