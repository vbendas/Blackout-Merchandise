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
  // The blur-as-active-tab signifier only earns its meaning once the
  // user has actually switched views; on first load the home tab
  // (Partners) stays crisp.
  const [hasSwitched, setHasSwitched] = useState(false);

  // Catalog (grid) runs in light mode; the body's 600ms color
  // transition dissolves the whole page between dark and light.
  function changeView(next: ViewMode) {
    if (next === view) return;
    setHasSwitched(true);
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
      <Corners view={view} onViewChange={changeView} indicateActive={hasSwitched} />
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
