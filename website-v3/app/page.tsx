'use client';

import { useState } from 'react';
import { Corners } from '@/components/Corners';
import { GalleryView } from '@/components/GalleryView';
import { GridView } from '@/components/GridView';
import { ListView } from '@/components/ListView';
import type { ViewMode } from '@/lib/clients';

export default function Home() {
  const [view, setView] = useState<ViewMode>('list');

  return (
    <>
      <Corners view={view} onViewChange={setView} />
      <main
        style={{
          paddingTop: 'clamp(72px, 10vw, 96px)',
          paddingBottom: 'clamp(72px, 10vw, 96px)',
        }}
      >
        <div key={view} className="view-fade-in">
          {view === 'list' && <ListView />}
          {view === 'grid' && <GridView />}
          {view === 'gallery' && <GalleryView />}
        </div>
      </main>
    </>
  );
}
