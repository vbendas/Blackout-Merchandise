import { Agents } from '@/components/home/Agents';
import { ApplySection } from '@/components/home/ApplySection';
import { CatalogTeaser } from '@/components/home/CatalogTeaser';
import { Cloth } from '@/components/home/Cloth';
import { Cover } from '@/components/home/Cover';
import { Paths } from '@/components/home/Paths';
import { ScrollScenes } from '@/components/home/ScrollScenes';
import { Plates } from '@/components/home/Plates';
import { PrintedFor } from '@/components/home/PrintedFor';
import { SetList } from '@/components/home/SetList';
import { Statement } from '@/components/home/Statement';
import { ZeroUpfront } from '@/components/home/ZeroUpfront';

// Home (Round 6 — premium editorial rewrite): Cover → Statement → Cloth
// → Plates → Zero upfront → Set list → Shop & Run → Blanks (catalog
// teaser) → Agents → Apply. Always on the vintage paper ground — see
// Documentation/Dev/Website-v3-Redesign-Plan.md, "Round 6".
export default function Page() {
  return (
    <main
      data-theme="vintage"
      style={{ background: 'var(--paper)', color: 'var(--signal)' }}
    >
      <ScrollScenes />
      <Cover />
      <Statement />
      <Cloth />
      <Plates />
      <PrintedFor />
      <ZeroUpfront />
      <SetList />
      <Paths />
      <CatalogTeaser />
      <Agents />
      <ApplySection />
    </main>
  );
}
