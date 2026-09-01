'use client';

import Lenis from 'lenis';
import { useEffect } from 'react';

// Site-wide inertial smooth scrolling. Skipped entirely for users who
// prefer reduced motion — native scrolling stays untouched for them.
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const lenis = new Lenis({
      duration: 2.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      // Slow, heavy glide: each step travels less and settles much longer.
      wheelMultiplier: 0.85,
      touchMultiplier: 1.1,
    });

    let frame: number;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return null;
}
