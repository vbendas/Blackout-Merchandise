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

const DEFAULT_TOP_PAD = 'clamp(72px, 10vw, 96px)';

export default function Home() {
  const [view, setView] = useState<ViewMode>('list');
  // The blur-as-active-tab signifier only earns its meaning once the
  // user has actually switched views; on first load the home tab
  // (Partners) stays crisp.
  const [hasSwitched, setHasSwitched] = useState(false);
  // Below ~360px "Partners / Catalog / Gallery" plus About/Contact no
  // longer fit one row, so the mobile corner bar wraps to two lines and
  // grows taller than the clamp() below was sized for — without this,
  // the Catalog's Type/Fit row renders hidden under the opaque bar.
  // Measure the bar's real height (0 on desktop, where it's
  // display:none) and only override the default when it's actually
  // taller than that.
  const [topPad, setTopPad] = useState(DEFAULT_TOP_PAD);

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

  useEffect(() => {
    const bar = document.querySelector<HTMLElement>('.mobile-corner-top');
    if (!bar) return;
    const update = () => {
      const h = bar.offsetHeight;
      setTopPad(h > 0 ? `${h + 16}px` : DEFAULT_TOP_PAD);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(bar);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <>
      <Intro />
      <Corners view={view} onViewChange={changeView} indicateActive={hasSwitched} />
      <main
        style={{
          paddingTop: topPad,
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
