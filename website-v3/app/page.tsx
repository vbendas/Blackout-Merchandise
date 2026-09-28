import { Agents } from '@/components/home/Agents';
import { ApplySection } from '@/components/home/ApplySection';
import { Assistant } from '@/components/home/Assistant';
import { CatalogTeaser } from '@/components/home/CatalogTeaser';
import { Cloth } from '@/components/home/Cloth';
import { Hero } from '@/components/home/Hero';
import { Paths } from '@/components/home/Paths';
import { PrintedFor } from '@/components/home/PrintedFor';
import { Studio } from '@/components/home/Studio';
import { ZeroUpfront } from '@/components/home/ZeroUpfront';

// Home (R2-2): Hero → Printed for → 01 The cloth → 02 Zero upfront →
// 03 One assistant → 04 Two ways to sell → Catalog teaser → Studio →
// 05 Bring your own agent → Apply. The old roster wall (ListView) and
// intro animation no longer live here — see
// Documentation/Dev/Website-v3-Redesign-Plan.md.
export default function Page() {
  return (
    <main>
      <Hero />
      <PrintedFor />
      <Cloth />
      <ZeroUpfront />
      <Assistant />
      <Paths />
      <CatalogTeaser />
      <Studio />
      <Agents />
      <ApplySection />
    </main>
  );
}
