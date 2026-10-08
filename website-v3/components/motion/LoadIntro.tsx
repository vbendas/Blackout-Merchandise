'use client';

import gsap from 'gsap';
import { useEffect, useSyncExternalStore } from 'react';
import { splitLetters, type Split } from './split';

const KEY = 'mf-intro-seen';
const META = "meta[name='mf-intro']";

// Runs while the HTML is parsed, before the masthead is painted, so the
// hidden start state (CSS keyed on a <meta name="mf-intro"> in <head>) is
// in place from the first frame. A meta element rather than an attribute
// on <html>: React owns <html>'s attributes and would flag a hydration
// mismatch. It only arms on desktop, without reduced motion, at the top
// of the page, once per browser session. With no JS nothing is armed and
// the page is simply visible.
const ARM = `try{if(!sessionStorage.getItem('${KEY}')&&innerWidth>=768&&!scrollY&&!matchMedia('(prefers-reduced-motion: reduce)').matches){var m=document.createElement('meta');m.name='mf-intro';document.head.appendChild(m)}}catch(e){}`;

const noop = () => () => {};

/**
 * First-load choreography for the cover (Round 8-C, item 1): masthead
 * letters rise out of the wrapper's mask, the hairline draws, facts fade
 * in and the photo opens from a slit. Total about 1.6s.
 *
 * FittedWord is untouched: letters are split only after fonts are ready
 * (the fit has run), with kerning preserved, and the original text node
 * is restored when the timeline ends. The photo's own scroll reveal is on
 * the media element (clip-path); the slit is on its <img>, so they never
 * fight.
 */
export function LoadIntro() {
  // True while server-rendering / hydrating, false on later client renders,
  // so the arming script is never (re)created by client-side navigation.
  const serverPass = useSyncExternalStore(noop, () => false, () => true);

  useEffect(() => {
    const armed = () => document.head.querySelector(META);
    if (!armed()) return;

    let cancelled = false;
    let tl: gsap.core.Timeline | null = null;
    let split: Split | null = null;
    let cleanup = () => {};

    const start = () => {
      if (cancelled) return;
      const cover = document.querySelector<HTMLElement>('[data-scene="cover"]');
      const mast = cover?.querySelector<HTMLElement>('.home-masthead');
      const row = cover?.querySelector<HTMLElement>('.home-facts-row');
      const media = cover?.querySelector<HTMLElement>('[data-cover-media]');
      const img = media?.querySelector<HTMLElement>('img');
      if (!cover || !mast || !row || !media || !img || window.scrollY > 40) {
        armed()?.remove();
        return;
      }
      try {
        sessionStorage.setItem(KEY, '1');
      } catch {
        // storage blocked: the intro may replay next load, harmless
      }
      const facts = Array.from(row.children) as HTMLElement[];

      split = splitLetters(mast);
      const letters = split?.parts ?? [mast];

      // Swap the CSS start state for identical inline values in one
      // synchronous step, so nothing paints in between.
      gsap.set(letters, { yPercent: 110 });
      gsap.set(facts, { opacity: 0 });
      gsap.set(row, { '--line': 0 });
      gsap.set(img, { clipPath: 'inset(49% 0% 49% 0%)' });
      gsap.set(media, { '--dots': 0 });
      armed()?.remove();

      cleanup = () => {
        tl?.kill();
        split?.revert();
        gsap.set(facts, { clearProps: 'opacity' });
        gsap.set(row, { clearProps: '--line' });
        gsap.set(img, { clearProps: 'clipPath' });
        gsap.set(media, { clearProps: '--dots' });
        gsap.set(mast, { clearProps: 'transform' });
        armed()?.remove();
      };

      tl = gsap.timeline({ onComplete: cleanup });
      tl.to(letters, { yPercent: 0, duration: 0.9, stagger: 0.035, ease: 'expo.out' }, 0)
        .to(row, { '--line': 1, duration: 0.9, ease: 'power3.inOut' }, 0.35)
        .to(facts, { opacity: 1, duration: 0.6, stagger: 0.05, ease: 'power2.out' }, 0.65)
        .to(img, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'expo.inOut' }, 0.45)
        .to(media, { '--dots': 1, duration: 0.6, ease: 'power2.out' }, 1);
    };

    const ready = 'fonts' in document ? document.fonts.ready : Promise.resolve();
    ready.then(() => requestAnimationFrame(start)).catch(start);

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return serverPass ? <script dangerouslySetInnerHTML={{ __html: ARM }} /> : null;
}
