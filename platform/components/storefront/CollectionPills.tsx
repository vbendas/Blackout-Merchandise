import Link from 'next/link';
import type { PublicCollection } from '@/lib/storefront/read-model';

// Plain links so filtering works without JS and the current filter is
// shareable/bookmarkable — matches the read-only-by-default SSR emphasis
// for the storefront (Platform-Plan §7). The shop lists its collections here
// and nowhere else; `active` is a slug the page has already checked against
// that list.
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

  return (
    <nav className="sf-pills" aria-label="Collections">
      <Link href={`/${slug}`} className="mf-pill sf-opt max-w-full" aria-current={active ? undefined : 'true'}>
        All
      </Link>
      {collections.map((c) => (
        <Link
          key={c.id}
          href={`/${slug}?collection=${encodeURIComponent(c.slug)}`}
          className="mf-pill sf-opt max-w-full"
          aria-current={c.slug === active ? 'true' : undefined}
        >
          <span className="truncate">{c.name}</span>
        </Link>
      ))}
    </nav>
  );
}
