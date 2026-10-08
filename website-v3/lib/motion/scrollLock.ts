// Page scroll lock for modal surfaces (Round 9, WP6c).
//
// The site runs Lenis (components/SmoothScroll.tsx), which listens to wheel and
// touch events on the window and drives scrolling itself via scrollTo(). That
// means `overflow: hidden` alone does NOT stop it: Lenis keeps scrolling the
// locked page. So a lock does three things:
//
//   1. lenis.stop()          (via getLenis(); a no-op when Lenis is not running,
//                             for example under prefers-reduced-motion)
//   2. <html> overflow:hidden (stops native scrolling, including when Lenis is
//                              absent), with the scrollbar width added as
//                              padding so the page does not jump sideways
//   3. <html data-scroll-locked> (hook for CSS and tests)
//
// While Lenis is stopped it calls preventDefault() on wheel events unless the
// event path contains [data-lenis-prevent]. Any scrollable area inside a modal
// surface (the Dialog panel does this itself) must carry data-lenis-prevent or
// it cannot be scrolled with the wheel.
//
// Locks are reference counted, so a menu opened over a drawer releases the page
// only when both have closed. Each lockScroll() call returns its own release
// function, safe to call twice.
//
// KNOWN GAP (documented fallback, see WP6c follow-ups): SmoothScroll creates its
// Lenis instance in an effect and exposes it through getLenis(). If a lock is
// taken before that instance exists, or a new instance replaces the old one
// while a lock is held (route remount), the new instance is not stopped
// automatically. SmoothScroll should check isScrollLocked() right after
// `new Lenis()` and call lenis.stop() if true (change owned by WP10m).

import { getLenis } from '@/components/SmoothScroll';

let count = 0;
let saved: { overflow: string; paddingRight: string } | null = null;

/** True while at least one scroll lock is held. */
export function isScrollLocked(): boolean {
  return count > 0;
}

function apply() {
  const root = document.documentElement;
  const gutter = window.innerWidth - root.clientWidth;
  saved = { overflow: root.style.overflow, paddingRight: root.style.paddingRight };
  root.style.overflow = 'hidden';
  if (gutter > 0) {
    const current = parseFloat(getComputedStyle(root).paddingRight) || 0;
    root.style.paddingRight = `${current + gutter}px`;
  }
  root.setAttribute('data-scroll-locked', '');
  getLenis()?.stop();
}

function restore() {
  const root = document.documentElement;
  if (saved) {
    root.style.overflow = saved.overflow;
    root.style.paddingRight = saved.paddingRight;
    saved = null;
  }
  root.removeAttribute('data-scroll-locked');
  getLenis()?.start();
}

/** Lock page scroll. Returns the release function. No-op on the server. */
export function lockScroll(): () => void {
  if (typeof document === 'undefined') return () => {};
  if (count === 0) apply();
  count += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    count = Math.max(0, count - 1);
    if (count === 0) restore();
  };
}
