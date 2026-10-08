'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useLayoutEffect, useRef } from 'react';
import { splitLines, type Split } from '@/components/motion/split';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const FILL_HIDDEN = 'inset(0 100% 0 0)';
const FILL_SHOWN = 'inset(0 0% 0 0)';

// Pin lengths as a share of viewport height (scroll distance while a
// scene is held). Deliberately modest: the page must never feel stuck.
const PIN = { setlist: 1.1 };

function q<T extends Element = HTMLElement>(root: ParentNode, sel: string): T[] {
  return Array.from(root.querySelectorAll<T>(sel));
}


/**
 * Scroll presentation for the home page (Round 6-B). Renders nothing
 * visible; it targets the data-scene / data-fill / data-count /
 * data-rise / data-step hooks that components/home/* expose, scoped to
 * the parent <main>. Native scroll is never hijacked: scenes are pinned
 * by ScrollTrigger on the normal document scroll (Lenis just smooths it).
 *
 * Content is complete and readable without JS or with reduced motion:
 * the resting CSS is the fully revealed state, and only when this
 * component starts animating does it set data-motion="on" on the root,
 * which is what hides the fills (see app/globals.css).
 */
export function ScrollScenes() {
  const markerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = markerRef.current?.parentElement;
    if (!root) return;
    const scene = (name: string) => root.querySelector<HTMLElement>(`[data-scene="${name}"]`);

    const mm = gsap.matchMedia();

    // ---------------------------------------------------------------
    // Desktop: pinned, scrubbed scenes
    // ---------------------------------------------------------------
    mm.add('(prefers-reduced-motion: no-preference) and (min-width: 768px)', () => {
      root.dataset.motion = 'on';
      // Restore hooks for DOM mutated directly (count-up text, set list
      // counter); run when this branch tears down.
      const cleanups: Array<() => void> = [];

      const vh = () => window.innerHeight;
      const pinEnd = (k: number) => () => `+=${Math.round(vh() * k)}`;
      const pinBase = { start: 'top top', pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true } as const;

      // ---- Cover -------------------------------------------------
      const cover = scene('cover');
      if (cover) {
        const mast = cover.querySelector<HTMLElement>('.home-masthead-wrap');
        const facts = cover.querySelector<HTMLElement>('.home-facts-row');
        const media = cover.querySelector<HTMLElement>('[data-cover-media]');
        const footer = cover.querySelector<HTMLElement>('.home-cover-footer');
        const rise = q(cover, '[data-rise]');
        if (mast && facts && media && footer) {
          // Not pinned: holding the cover makes the whole hero slide as a
          // block. The top of the hero stays completely still; the photo
          // frame (full-bleed and screen-tall, masked to the gutters at
          // rest — see .home-cover-media) opens to full screen as it
          // scrolls up to the top, while the image settles for depth.
          const gutter = () => parseFloat(getComputedStyle(media).marginRight) * -1 || 0;
          const img = media.querySelector<HTMLElement>('img');
          // Starts at scroll 0 (the photo already sits inside the first
          // viewport), fully open when the frame reaches the top.
          const trigger = { trigger: media, start: 0, end: 'top top', scrub: 0.8, invalidateOnRefresh: true };
          gsap.fromTo(
            media,
            { clipPath: () => `inset(0px ${gutter()}px 0px ${gutter()}px)` },
            { clipPath: 'inset(0px 0px 0px 0px)', ease: 'power1.inOut', scrollTrigger: trigger },
          );
          if (img) {
            gsap.fromTo(img, { scale: 1.08 }, { scale: 1, ease: 'none', scrollTrigger: trigger });
          }
          // Caption and brief rise in on their own as they reach the viewport.
          gsap.from(rise, {
            y: 24,
            opacity: 0,
            stagger: 0.08,
            duration: 0.6,
            ease: 'power2.out',
            scrollTrigger: { trigger: footer, start: 'top 90%', once: true },
          });
        }
      }

      // ---- Statement ---------------------------------------------
      const statement = scene('statement');
      if (statement) {
        const words = q(statement, '[data-word]');
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          // Not pinned either: holding it centred left the top half of the
          // screen empty. The words light up as the paragraph scrolls past.
          scrollTrigger: {
            trigger: statement,
            start: 'top 75%',
            end: 'bottom 45%',
            scrub: 0.8,
            invalidateOnRefresh: true,
          },
        });
        gsap.set(words, { opacity: 0.15 });
        tl.to(words, { opacity: 1, stagger: { each: 1 / Math.max(words.length, 1), from: 'start' }, duration: 1 }, 0);
      }

      // ---- Cloth -------------------------------------------------
      const cloth = scene('cloth');
      if (cloth) {
        const fill = cloth.querySelector<HTMLElement>('[data-fill]');
        const tiles = q(cloth, '[data-rise]');
        const tileRow = cloth.querySelector<HTMLElement>('.home-tile-row');
        const word = cloth.querySelector<HTMLElement>('.home-outline-word');
        // Not pinned: the section is taller than the viewport, and panning
        // content inside a pin leaves a visible gap once it releases. The
        // fill scrubs with plain scroll instead; tiles rise on enter.
        if (fill && word) {
          gsap.fromTo(
            fill,
            { clipPath: FILL_HIDDEN },
            {
              clipPath: FILL_SHOWN,
              ease: 'none',
              scrollTrigger: { trigger: word, start: 'top 75%', end: 'bottom 35%', scrub: 0.8, invalidateOnRefresh: true },
            },
          );
        }
        if (tileRow) {
          gsap.from(tiles, {
            y: 48,
            opacity: 0,
            stagger: 0.1,
            duration: 0.7,
            ease: 'power2.out',
            scrollTrigger: { trigger: tileRow, start: 'top 85%', once: true },
          });
        }

        // Count-up: once, on enter, from the final value in the text.
        for (const el of q(cloth, '[data-count]')) {
          const finalText = el.textContent ?? '';
          const target = parseFloat(finalText);
          if (!Number.isFinite(target)) continue;
          // Hold the width of the final number so digits growing from
          // "0" never nudge the suffix / neighbouring text.
          el.style.display = 'inline-block';
          el.style.minWidth = `${el.getBoundingClientRect().width}px`;
          el.textContent = '0';
          const state = { v: 0 };
          ScrollTrigger.create({
            trigger: cloth,
            start: 'top 80%',
            once: true,
            onEnter: () =>
              gsap.to(state, {
                v: target,
                duration: 1.6,
                ease: 'power2.out',
                onUpdate: () => {
                  el.textContent = String(Math.round(state.v));
                },
                onComplete: () => {
                  el.textContent = finalText;
                },
              }),
          });
          // Restored by matchMedia cleanup below.
          cleanups.push(() => {
            el.textContent = finalText;
            el.style.display = '';
            el.style.minWidth = '';
          });
        }
      }

      // ---- Zero (fill scrubbed, then stagger) ---------------------
      const zero = scene('zero');
      if (zero) {
        const fill = zero.querySelector<HTMLElement>('[data-fill]');
        if (fill) {
          gsap.fromTo(
            fill,
            { clipPath: FILL_HIDDEN },
            {
              clipPath: FILL_SHOWN,
              ease: 'none',
              scrollTrigger: { trigger: zero, start: 'top 75%', end: 'top 25%', scrub: 0.6 },
            },
          );
        }
      }

      // ---- Set list ----------------------------------------------
      const setlist = scene('setlist');
      if (setlist) {
        const rows = q(setlist, '[data-step]');
        const counter = setlist.querySelector<HTMLElement>('[data-counter]');
        const total = rows.length;
        const plates = q(setlist, '[data-step-img]');
        let active = -1;
        const setActive = (i: number) => {
          if (i === active) return;
          active = i;
          rows.forEach((row, idx) =>
            gsap.to(row, { opacity: idx === i ? 1 : 0.3, duration: 0.35, ease: 'power2.out', overwrite: 'auto' }),
          );
          if (counter) counter.textContent = `${String(i + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
          // Plate crossfade (only visible on desktop, where the frame is shown).
          plates.forEach((plate, idx) => {
            gsap.to(plate, { opacity: idx === i ? 1 : 0, duration: 0.7, ease: 'power2.out', overwrite: 'auto' });
            if (idx === i) {
              gsap.fromTo(plate.querySelectorAll('img'), { scale: 1.06 }, { scale: 1, duration: 1.1, ease: 'power3.out', overwrite: 'auto' });
            }
          });
        };
        setActive(0);
        ScrollTrigger.create({
          trigger: setlist,
          end: pinEnd(PIN.setlist),
          ...pinBase,
          scrub: false,
          onUpdate: (self) => setActive(Math.min(total - 1, Math.floor(self.progress * total))),
          onRefresh: (self) => setActive(Math.min(total - 1, Math.floor(self.progress * total))),
        });
        cleanups.push(() => {
          if (counter) counter.textContent = `01 / ${String(total).padStart(2, '0')}`;
        });
      }

      // ---- Heading line-mask reveals ------------------------------
      // Each [data-lines] heading is hidden (opacity, via the pending
      // attribute) until it nears the viewport, then split into lines
      // that slide up out of masks; the split is reverted afterwards so
      // the DOM returns to plain text.
      const splits = new Set<Split>();
      for (const el of q(root, '[data-lines]')) {
        el.setAttribute('data-lines-pending', '');
        ScrollTrigger.create({
          trigger: el,
          start: 'top 88%',
          once: true,
          onEnter: () => {
            const split = splitLines(el);
            el.removeAttribute('data-lines-pending');
            if (!split) return;
            splits.add(split);
            gsap.set(split.parts, { yPercent: 110 });
            gsap.to(split.parts, {
              yPercent: 0,
              duration: 0.9,
              stagger: 0.09,
              ease: 'expo.out',
              onComplete: () => {
                split.revert();
                splits.delete(split);
              },
            });
          },
        });
      }
      cleanups.push(() => {
        for (const el of q(root, '[data-lines]')) el.removeAttribute('data-lines-pending');
        splits.forEach((split) => split.revert());
        splits.clear();
      });

      // ---- Shop & Run: image wipe, then the card's text ------------
      for (const card of q(root, '#paths [data-path-card]')) {
        const box = card.querySelector<HTMLElement>('[data-wipe]');
        if (!box) continue;
        const imgs = q(box, 'img');
        const tl = gsap.timeline({ scrollTrigger: { trigger: card, start: 'top 82%', once: true } });
        tl.fromTo(box, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'expo.out' }, 0);
        tl.fromTo(imgs, { scale: 1.12 }, { scale: 1, duration: 1.3, ease: 'power3.out' }, 0);
        tl.from(q(card, '[data-rise]'), { y: 24, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' }, 0.35);
      }

      // ---- Enter reveals: Zero stagger, Agents, Apply ------
      const skip = new Set([scene('cover'), scene('cloth'), root.querySelector<HTMLElement>('#paths')]);
      for (const section of q(root, 'section')) {
        if (skip.has(section)) continue;
        const items = q(section, '[data-rise]');
        if (!items.length) continue;
        gsap.from(items, {
          y: 40,
          opacity: 0,
          stagger: 0.12,
          duration: 0.9,
          ease: 'power2.out',
          scrollTrigger: { trigger: section, start: 'top 70%', once: true },
        });
      }

      // Apply: fill wipes on enter.
      const apply = scene('apply');
      const applyFill = apply?.querySelector<HTMLElement>('[data-fill]');
      if (apply && applyFill) {
        gsap.fromTo(
          applyFill,
          { clipPath: FILL_HIDDEN },
          {
            clipPath: FILL_SHOWN,
            duration: 1.2,
            ease: 'power2.inOut',
            scrollTrigger: { trigger: apply, start: 'top 70%', once: true },
          },
        );
      }

      return () => {
        delete root.dataset.motion;
        while (cleanups.length) cleanups.pop()?.();
      };
    });

    // ---------------------------------------------------------------
    // Mobile: no pins, no scrub — fade/rise on enter only
    // ---------------------------------------------------------------
    mm.add('(prefers-reduced-motion: no-preference) and (max-width: 767px)', () => {
      root.dataset.motion = 'on';

      const enter = (targets: Element[], trigger: Element, extra?: gsap.TweenVars) => {
        if (!targets.length) return;
        gsap.from(targets, {
          y: 28,
          opacity: 0,
          duration: 0.8,
          ease: 'power2.out',
          stagger: 0.1,
          scrollTrigger: { trigger, start: 'top 88%', once: true },
          ...extra,
        });
      };

      // Shop & Run: per-card clip-path wipe (no scale) and text fade.
      for (const card of q(root, '#paths [data-path-card]')) {
        const box = card.querySelector<HTMLElement>('[data-wipe]');
        if (!box) continue;
        const tl = gsap.timeline({ scrollTrigger: { trigger: card, start: 'top 88%', once: true } });
        tl.fromTo(box, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'power3.out' }, 0);
        tl.from(q(card, '[data-rise]'), { y: 20, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out' }, 0.3);
      }

      for (const section of q(root, '[data-scene], section')) {
        if (section.id === 'paths') continue;
        const heading = section.querySelector('h2');
        if (heading && section.matches('[data-scene]')) enter([heading], heading);
        const items = q(section, '[data-rise]');
        if (items.length) enter(items, section);
      }

      for (const fill of q(root, '[data-fill]')) {
        gsap.fromTo(
          fill,
          { clipPath: FILL_HIDDEN },
          {
            clipPath: FILL_SHOWN,
            duration: 1,
            ease: 'power2.out',
            scrollTrigger: { trigger: fill, start: 'top 85%', once: true },
          },
        );
      }

      return () => {
        delete root.dataset.motion;
      };
    });

    // Layout-affecting async work: fonts change the fitted masthead and
    // text metrics, images settle page height. Pin geometry has to be
    // recomputed after both.
    let cancelled = false;
    const refresh = () => {
      if (!cancelled) ScrollTrigger.refresh();
    };
    if ('fonts' in document) document.fonts.ready.then(refresh).catch(() => {});
    if (document.readyState !== 'complete') window.addEventListener('load', refresh, { once: true });

    return () => {
      cancelled = true;
      window.removeEventListener('load', refresh);
      mm.revert();
    };
  }, []);

  return <div ref={markerRef} hidden aria-hidden="true" />;
}
