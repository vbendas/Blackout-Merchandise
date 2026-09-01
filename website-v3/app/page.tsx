'use client';

import { useEffect, useState } from 'react';
import { Corners } from '@/components/Corners';
import { Intro } from '@/components/Intro';
import { GalleryView } from '@/components/GalleryView';
import { GridView } from '@/components/GridView';
import { ListView } from '@/components/ListView';
import type { ViewMode } from '@/lib/clients';

function applyMode(next: ViewMode) {
  const root = document.documentElement;
  if (next === 'grid') {
    root.dataset.mode = 'light';
  } else {
    delete root.dataset.mode;
  }
}

export default function Home() {
  const [view, setView] = useState<ViewMode>('list');

  // Catalog (grid) runs in light mode; the body's 600ms color
  // transition dissolves the whole page between dark and light.
  function changeView(next: ViewMode) {
    if (next === view) return;
    setView(next);
  }

  useEffect(() => {
    applyMode(view);
    return () => {
      delete document.documentElement.dataset.mode;
    };
  }, [view]);

  return (
    <>
      <Intro />
      <Corners view={view} onViewChange={changeView} />
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
