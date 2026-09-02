import { Home } from '@/components/Home';
import type { ViewMode } from '@/lib/clients';

type SearchParams = Record<string, string | string[] | undefined>;

// Deep links: ?view=grid|gallery, and any catalog param (product,
// filters, search) implies the Catalog — otherwise a shared product link
// would land on the roster and open nothing. Resolved here on the server
// so the right view is in the initial HTML (the Catalog's first-row
// images are then discoverable for LCP instead of client-inserted).
function resolveView(params: SearchParams): ViewMode {
  const view = params.view;
  if (view === 'gallery') return 'gallery';
  if (view === 'grid') return 'grid';
  const catalogKeys = ['product', 'type', 'fit', 'colour', 'q'];
  if (catalogKeys.some((k) => params[k] !== undefined)) return 'grid';
  return 'list';
}

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  return <Home initialView={resolveView(params)} />;
}
