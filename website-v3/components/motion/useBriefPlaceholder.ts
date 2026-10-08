'use client';

import { useEffect, type RefObject } from 'react';

// Example briefs in English only for now (see report: needs translating
// by the i18n owner). Other languages keep the static placeholder.
const EXAMPLES = [
  'Oversized heavyweight hoodie, chest embroidery, 30 for the crew — end of June',
  'Tote bags, one-colour print, 100 for the festival stall',
  'Organic long-sleeve, sleeve print, 40 for the studio launch',
];

/**
 * Rotating brief placeholder (Round 8-C, item 9): the input's placeholder
 * erases and types the next example brief. It only runs while the input is
 * on screen, empty, unfocused and the tab is visible, and settles back to
 * the static placeholder (the SSR value) whenever it stops. Reduced motion
 * and non-English locales never start it. Writes the attribute directly;
 * React does not touch it again because its prop value never changes.
 */
export function useBriefPlaceholder(ref: RefObject<HTMLInputElement | null>, base: string, enabled: boolean, dep: unknown) {
  useEffect(() => {
    const input = ref.current;
    if (!input || !enabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const list = [base, ...EXAMPLES];
    let i = 0;
    let stopped = false;
    let running = false;
    let visible = false;
    let focused = false;
    let timer: number | undefined;

    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        timer = window.setTimeout(resolve, ms);
      });
    const active = () => !stopped && visible && !focused && !document.hidden && input.value === '';
    const settle = () => {
      i = 0;
      input.placeholder = base;
    };

    async function run() {
      if (running) return;
      running = true;
      while (active()) {
        await sleep(2800);
        if (!active()) break;
        const cur = list[i];
        for (let n = cur.length; n >= 0 && active(); n--) {
          input!.placeholder = cur.slice(0, n) || ' ';
          await sleep(12);
        }
        i = (i + 1) % list.length;
        const next = list[i];
        for (let n = 1; n <= next.length && active(); n++) {
          input!.placeholder = next.slice(0, n);
          await sleep(28);
        }
      }
      running = false;
      if (!stopped) settle();
    }

    const poke = () => {
      if (active()) void run();
      else if (!running) settle();
    };
    const onFocus = () => {
      focused = true;
      settle();
    };
    const onBlur = () => {
      focused = false;
      poke();
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (!visible) settle();
      poke();
    });
    io.observe(input);
    input.addEventListener('focus', onFocus);
    input.addEventListener('blur', onBlur);
    input.addEventListener('input', poke);
    document.addEventListener('visibilitychange', poke);

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      io.disconnect();
      input.removeEventListener('focus', onFocus);
      input.removeEventListener('blur', onBlur);
      input.removeEventListener('input', poke);
      document.removeEventListener('visibilitychange', poke);
      input.placeholder = base;
    };
  }, [ref, base, enabled, dep]);
}
