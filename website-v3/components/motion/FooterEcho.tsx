'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { splitLetters, type Split } from './split';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Footer echo (Round 8-C, item 8): the fitted MERCHFROM rises out of its
 * wrapper's mask as the footer enters, letter by letter on desktop and as
 * one piece on mobile. Re-armed per route (the footer lives in the root
 * layout). Not armed at all when the footer is already on screen at load,
 * and never under reduced motion.
 */
export function FooterEcho() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const word = document.querySelector<HTMLElement>('.site-footer-word');
    const wrap = word?.parentElement;
    if (!word || !wrap) return;

    let cancelled = false;
    let split: Split | null = null;
    let trigger: ScrollTrigger | null = null;
    let tween: gsap.core.Tween | null = null;

    const undo = () => {
      tween?.kill();
      trigger?.kill();
      split?.revert();
      split = null;
      gsap.set(word, { clearProps: 'transform' });
    };

    const setup = () => {
      if (cancelled) return;
      if (wrap.getBoundingClientRect().top < window.innerHeight * 0.96) return;
      const desktop = window.matchMedia('(min-width: 768px)').matches;
      split = desktop ? splitLetters(word) : null;
      const targets = split ? split.parts : [word];
      gsap.set(targets, { yPercent: 110 });
      trigger = ScrollTrigger.create({
        trigger: wrap,
        start: 'top 96%',
        once: true,
        onEnter: () => {
          tween = gsap.to(targets, {
            yPercent: 0,
            duration: 0.9,
            stagger: split ? 0.03 : 0,
            ease: 'expo.out',
            onComplete: undo,
          });
        },
      });
    };

    const ready = 'fonts' in document ? document.fonts.ready : Promise.resolve();
    ready.then(() => requestAnimationFrame(setup)).catch(() => {});

    return () => {
      cancelled = true;
      undo();
    };
  }, [pathname]);

  return null;
}
