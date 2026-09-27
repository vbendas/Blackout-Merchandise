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
export function ViewShell({ view, children }: { view: ViewMode; children: ReactNode }) {
  return (
    <>
      <main
        style={{
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
