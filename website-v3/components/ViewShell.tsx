'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Corners } from '@/components/Corners';
import { Intro } from '@/components/Intro';
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

// The client shell shared by the three view routes (/, /catalog,
// /gallery). Each route renders this with its own fixed `view` and passes
// the view component as children — importing the views here would bundle
// all three (and the whole catalog data) into every route.
export function ViewShell({ view, children }: { view: ViewMode; children: ReactNode }) {
  // Below ~360px "Partners / Catalog / Gallery" plus About/Contact no
  // longer fit one row, so the mobile corner bar wraps to two lines and
  // grows taller than the clamp() below was sized for — without this,
  // the Catalog's Type/Fit row renders hidden under the opaque bar.
  // Measure the bar's real height (0 on desktop, where it's
  // display:none) and only override the default when it's actually
  // taller than that.
  const [topPad, setTopPad] = useState(DEFAULT_TOP_PAD);

  // Catalog (grid) runs in light mode; the body's color transition
  // dissolves the whole page between dark and light as routes change.
  // Cleaned up on unmount so navigating away never leaves it stuck.
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
      {view === 'list' && <Intro />}
      <Corners />
      <main
        style={{
          paddingTop: topPad,
          paddingBottom: 'clamp(72px, 10vw, 96px)',
        }}
      >
        <div key={view} className="view-fade-in">
          {children}
        </div>
      </main>
    </>
  );
}
