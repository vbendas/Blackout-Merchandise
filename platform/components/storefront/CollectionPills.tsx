import Link from 'next/link';
import type { PublicCollection } from '@/lib/storefront/read-model';

// Plain links so filtering works without JS and the current filter is
// shareable/bookmarkable — matches the read-only-by-default SSR emphasis
// for the storefront (Platform-Plan §7).
export function CollectionPills({
  slug,
  collections,
  active,
}: {
  slug: string;
  collections: PublicCollection[];
  active?: string;
}) {
  if (collections.length === 0) return null;

  const pill = (isActive: boolean) =>
    `hairline label rounded-full px-4 py-2 transition-opacity hover:opacity-80 ${isActive ? '' : 'mf-dim'}`;

  return (
    <div className="mb-10 flex flex-wrap gap-3" style={{ paddingInline: 'var(--gutter)' }}>
      <Link
        href={`/${slug}`}
        className={pill(!active)}
        style={!active ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
      >
        All
      </Link>
      {collections.map((c) => {
        const isActive = c.slug === active;
        return (
          <Link
            key={c.id}
            href={`/${slug}?collection=${c.slug}`}
            className={pill(isActive)}
            style={isActive ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
          >
            {c.name}
          </Link>
        );
      })}
    </div>
  );
}
