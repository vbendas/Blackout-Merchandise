'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { useEffect } from 'react';

// ScrollTrigger touches window/document at registration time, so it's
// only ever registered in the browser — this module is imported by a
// client component, but Next still evaluates it once during the RSC
// build pass.
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// Module-singleton: the one Lenis instance for the page, so ScrollScenes
// (and anything else that needs to read/nudge scroll) can reach it
// without threading it through props or context. null outside the
// browser, before mount, and whenever reduced motion is on (Lenis never
// runs there — native scrolling only).
let lenisInstance: Lenis | null = null;

export function getLenis(): Lenis | null {
  return lenisInstance;
}

// Site-wide inertial smooth scrolling, driven by GSAP's own ticker
// (one shared RAF loop) rather than its own requestAnimationFrame call,
// so Lenis and every ScrollTrigger-driven animation
// (components/home/ScrollScenes.tsx) advance on the same frame. Lenis'
// 'scroll' event pings ScrollTrigger.update() so pinned/scrubbed scenes
// track the eased position instead of the raw native one.
// Skipped entirely for users who prefer reduced motion — native
// scrolling stays untouched for them.
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
    lenisInstance = lenis;

    const onScroll = () => ScrollTrigger.update();
    lenis.on('scroll', onScroll);

    const onTick = (time: number) => {
      // gsap.ticker reports elapsed seconds; lenis.raf wants milliseconds.
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(onTick);
    // Scroll-linked animation shouldn't "catch up" with a jump after a
    // long tab-away stall — drop lag instead of compressing it into a
    // single fast-forwarded frame.
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(onTick);
      lenis.off('scroll', onScroll);
      lenis.destroy();
      lenisInstance = null;
    };
  }, []);

  return null;
}
