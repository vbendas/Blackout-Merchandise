import Link from 'next/link';
import type { PublicStore } from '@/lib/storefront/read-model';
import { CartButton } from '@/components/storefront/CartButton';
import { ShopNav } from '@/components/storefront/ShopNav';

// Shop and About left, the artist's mark centred, Cart right: the layout the
// website's apply preview promises. The mark is the shop's logo when it has
// one, its name otherwise. About only shows when there is something to read.
//
// Plain <img>, not next/image: mockups and store assets come from a mix of
// Cloudinary, fal and local /packshots paths with no remotePatterns
// configured (next.config.ts is owned by another agent) — the rest of the
// codebase (components/cards/*) follows the same convention.
export function Header({ store }: { store: PublicStore }) {
  const hasAbout = Boolean(store.about?.trim() || store.bannerUrl);

  return (
    <header className="sf-header">
      <div className="sf-wrap sf-top">
        <ShopNav slug={store.slug} showAbout={hasAbout} />

        <Link href={`/${store.slug}`} className="sf-top-mark">
          {store.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.logoUrl} alt={store.name} className="sf-mark-img" />
          ) : (
            <span className="sf-mark">{store.name}</span>
          )}
        </Link>

        <CartButton slug={store.slug} />
      </div>
    </header>
  );
}
