import type { PublicProductListItem } from '@/lib/storefront/read-model';
import { ProductCard } from '@/components/storefront/ProductCard';

// Numbered pieces on ecru plates. One to three pieces get bigger tiles (the
// data-count hook in storefront.css) rather than a lone small tile in an
// empty row.
export function ProductGrid({ slug, products }: { slug: string; products: PublicProductListItem[] }) {
  if (products.length === 0) {
    return <p className="mf-dim py-20">Nothing here yet.</p>;
  }

  return (
    <ol role="list" className="sf-grid" data-count={products.length <= 3 ? products.length : 'many'}>
      {products.map((product, index) => (
        <li key={product.id} className="min-w-0">
          <ProductCard slug={slug} product={product} index={index} />
        </li>
      ))}
    </ol>
  );
}
