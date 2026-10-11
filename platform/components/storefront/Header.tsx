import Link from 'next/link';
import type { PublicCollection, PublicStore } from '@/lib/storefront/read-model';
import { CartButton } from '@/components/storefront/CartButton';
import { Hairline } from '@/components/ui/Hairline';

// Plain <img>, not next/image: mockups and store assets come from a mix of
// Cloudinary, fal and local /packshots paths with no remotePatterns
// configured (next.config.ts is owned by another agent) — the rest of the
// codebase (components/cards/*) follows the same convention.
export function Header({ store, collections }: { store: PublicStore; collections: PublicCollection[] }) {
  return (
    <header>
      <div
        className="flex items-center justify-between gap-6"
        style={{ paddingInline: 'var(--gutter)', height: '72px' }}
      >
        <Link href={`/${store.slug}`} className="flex min-w-0 items-center gap-3">
          {store.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.logoUrl} alt={store.name} className="h-9 w-9 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="font-display truncate text-lg font-bold">{store.name}</span>
          )}
        </Link>

        {collections.length > 0 && (
          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-6 overflow-x-auto md:flex" aria-label="Collections">
            <Link href={`/${store.slug}`} className="label mf-dim whitespace-nowrap hover:opacity-80">
              All
            </Link>
            {collections.map((c) => (
              <Link
                key={c.id}
                href={`/${store.slug}?collection=${c.slug}`}
                className="label mf-dim whitespace-nowrap hover:opacity-80"
              >
                {c.name}
              </Link>
            ))}
          </nav>
        )}

        <CartButton slug={store.slug} />
      </div>
      <Hairline />
    </header>
  );
}
