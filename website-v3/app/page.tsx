import { Agents } from '@/components/home/Agents';
import { ApplySection } from '@/components/home/ApplySection';
import { CatalogTeaser } from '@/components/home/CatalogTeaser';
import { Cloth } from '@/components/home/Cloth';
import { Cover } from '@/components/home/Cover';
import { Paths } from '@/components/home/Paths';
import { ScrollScenes } from '@/components/home/ScrollScenes';
import { PrintedFor } from '@/components/home/PrintedFor';
import { SetList } from '@/components/home/SetList';
import { Statement } from '@/components/home/Statement';
import { ZeroUpfront } from '@/components/home/ZeroUpfront';
import { typeFor } from '@/lib/catalog-filters';
import { CATALOG_STATS } from '@/lib/catalog-stats';
import { PRODUCT_DETAILS } from '@/lib/product-details';
import { PRODUCTS } from '@/lib/products';

// Real blanks, black colourway (PRODUCTS' own src is already C002/black).
const CLOTH_CODES = ['STSU797', 'STTU078', 'STSU177'];
const TEASER_CODES = ['STTU258', 'STSW268', 'STJU251', 'STAU892'];

// Resolved here, in a server component, so the product dataset
// (products / product-details / variants) stays out of the home page's
// client bundle: the client sections only receive these small props.
function tiles(codes: string[], captionPrefix: string) {
  return codes.flatMap((code) => {
    const product = PRODUCTS.find((p) => p.code === code);
    if (!product) return [];
    const name = PRODUCT_DETAILS[code]?.name ?? product.name;
    return [{ code, src: product.src, name, caption: `${captionPrefix}${code} · ${name} · ${typeFor(code)}` }];
  });
}

// Home (Round 6 — premium editorial rewrite): Cover → Statement → Cloth
// → Zero upfront → Set list → Shop & Run → Blanks (catalog
// teaser) → Agents → Apply. Always on the vintage paper ground — see
// Documentation/Dev/Website-v3-Redesign-Plan.md, "Round 6".
export default function Page() {
  const stats = { ...CATALOG_STATS };
  return (
    <main
      data-theme="vintage"
      style={{ background: 'var(--paper)', color: 'var(--signal)' }}
    >
      <ScrollScenes />
      <Cover />
      <Statement />
      <Cloth stats={stats} tiles={tiles(CLOTH_CODES, '')} />
      <PrintedFor />
      <ZeroUpfront />
      <SetList />
      <Paths />
      <CatalogTeaser stats={stats} tiles={tiles(TEASER_CODES, 'MF-')} />
      <Agents />
      <ApplySection />
    </main>
  );
}
