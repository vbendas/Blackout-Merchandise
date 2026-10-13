import { Suspense } from 'react';
import { CataloguePage } from '@/components/catalogue/CataloguePage';
import { catalogueCounts } from '@/lib/catalog/catalogue-index';

export const metadata = { title: 'Catalogue' };

/** /studio/catalogue: every blank, browsed inside the Studio shell (the layout
 * keeps the sidebar). The page's state lives in its query string (see
 * components/catalogue/catalogue-url.ts), read on the client, hence the Suspense
 * boundary; the blanks themselves load from /api/catalogue. */
export default function CatalogueRoute() {
  const { total, categories } = catalogueCounts();
  return (
    <Suspense fallback={null}>
      <CataloguePage total={total} categories={categories} />
    </Suspense>
  );
}
