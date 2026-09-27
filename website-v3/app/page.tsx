import { Agents } from '@/components/home/Agents';
import { ApplySection } from '@/components/home/ApplySection';
import { Assistant } from '@/components/home/Assistant';
import { CatalogTeaser } from '@/components/home/CatalogTeaser';
import { Hero } from '@/components/home/Hero';
import { Paths } from '@/components/home/Paths';
import { PrintedFor } from '@/components/home/PrintedFor';
import { Studio } from '@/components/home/Studio';

// Home (WP2): Hero → Printed for → 01 One assistant → 02 Shop & Run →
// Catalog teaser → Studio → 03 Bring your own agent → Apply. The old
// roster wall (ListView) and intro animation no longer live here — see
// Documentation/Dev/Website-v3-Redesign-Plan.md.
export default function Page() {
  return (
    <main>
      <Hero />
      <PrintedFor />
      <Assistant />
      <Paths />
      <CatalogTeaser />
      <Studio />
      <Agents />
      <ApplySection />
    </main>
  );
}
