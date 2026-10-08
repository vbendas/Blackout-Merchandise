'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLayoutEffect, useRef } from 'react';
import { getLenis } from '@/components/SmoothScroll';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// The template remounts this component on every route change. The first
// mount of the app (the initial load) must not sweep; every later one does.
let hasMounted = false;

/**
 * Route sweep (Round 8-C, item 5): on each client navigation a panel in
 * the destination's ground colour covers the viewport in the same frame
 * the new page commits (layout effect, before paint, so the swap never
 * flashes) and then slides up and away. The old page unmounts, which
 * kills its ScrollTriggers; once the panel is gone triggers are refreshed
 * so the new page (and the persistent footer) measure against the real
 * layout. Skipped on first load and under reduced motion.
 */
export function PageTransition() {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const first = !hasMounted;
    hasMounted = true;
    queueMicrotask(() => {
      hasMounted = true;
    });
    const panel = ref.current;
    if (first || !panel || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      requestAnimationFrame(() => ScrollTrigger.refresh());
      return;
    }

    const main = document.querySelector('main');
    const bg = main ? getComputedStyle(main).backgroundColor : '';
    panel.style.background = bg && bg !== 'rgba(0, 0, 0, 0)' ? bg : 'var(--paper)';
    gsap.set(panel, { visibility: 'visible', y: 0, yPercent: 0 });
    // The panel's edge is the reveal; the page's own CSS fade-in would
    // blur it, so it stands down for swept navigations.
    const page = panel.previousElementSibling as HTMLElement | null;
    if (page) page.style.animation = 'none';

    const tween = gsap.to(panel, {
      yPercent: -100,
      duration: 0.55,
      delay: 0.06,
      ease: 'power3.inOut',
      onComplete: () => {
        gsap.set(panel, { visibility: 'hidden' });
        getLenis()?.resize();
        ScrollTrigger.refresh();
      },
    });

    return () => {
      tween.kill();
      gsap.set(panel, { visibility: 'hidden', y: 0, yPercent: -100 });
    };
  }, []);

  return <div ref={ref} className="route-panel" aria-hidden="true" />;
}
