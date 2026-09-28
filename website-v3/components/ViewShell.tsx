'use client';

import { type ReactNode } from 'react';
import type { ViewMode } from '@/lib/clients';

// The client shell shared by the view routes (/catalog, /gallery). Each route renders this with its own fixed `view` and passes
// the view component as children — importing the views here would bundle
// all three (and the whole catalog data) into every route.
//
// The site chrome (SiteHeader/SiteFooter) is mounted once in the root
// layout, fixed over the top of every route — this shell only needs to
// pad its content clear of the header's height.
//
// Round 3: both routes this shell serves (catalog, gallery) live on
// vintage ecru paper, while the fixed SiteHeader/SiteFooter — siblings
// in the layout tree, not descendants of this <main> — stay on the dark
// tokens. data-theme="vintage" here re-scopes every --paper/--signal/…
// custom property for this subtree only (see globals.css), and painting
// the background directly on <main> lets the ecru reach the viewport
// edges instead of showing the page's dark ground in the gutters.
export function ViewShell({ view, children }: { view: ViewMode; children: ReactNode }) {
  return (
    <>
      <main
        data-theme="vintage"
        style={{
          background: 'var(--paper)',
          color: 'var(--signal)',
          paddingTop: 'calc(var(--header-h) + 24px)',
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
