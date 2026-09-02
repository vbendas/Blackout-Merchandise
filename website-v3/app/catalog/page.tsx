import type { Metadata } from 'next';
import { ViewShell } from '@/components/ViewShell';
import { GridView } from '@/components/GridView';

export const metadata: Metadata = {
  title: 'Catalog',
};

export default function Page() {
  return (
    <ViewShell view="grid">
      <GridView />
    </ViewShell>
  );
}
