'use client';

import { useEffect, useRef } from 'react';

const INTERACTIVE_SELECTOR = 'a, button, [role="button"], input';
const TEXT_INPUT_SELECTOR = 'input, textarea';
const LERP = 0.35;

/**
 * Registration-mark cursor: a small accent that rides with the native
 * pointer rather than replacing it. A plain dot by default, morphing
 * into the crosshair-in-circle brand mark over interactive elements.
 * Bails entirely on coarse pointers (touch) and reduced-motion.
 */
export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<SVGSVGElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Non-null once, up front: refs are set by the time this effect runs
    // (the elements always render), so the closures below can rely on
    // these without TypeScript's closure-narrowing limits re-litigating
    // the null check on every access.
    const root = rootRef.current!;
    const dot = dotRef.current!;
    const mark = markRef.current!;
    if (!root || !dot || !mark) return;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let x = targetX;
    let y = targetY;
    let rafId = 0;
    let visible = false;

    function onMouseMove(e: MouseEvent) {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!visible) {
        visible = true;
        root.style.opacity = '1';
      }
    }

    function tick() {
      x += (targetX - x) * LERP;
      y += (targetY - y) * LERP;
      root.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      rafId = requestAnimationFrame(tick);
    }

    function onMouseOver(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest(TEXT_INPUT_SELECTOR)) {
        root.style.opacity = '0';
        return;
      }
      root.style.opacity = '1';

      if (target.closest(INTERACTIVE_SELECTOR)) {
        dot.style.transform = 'scale(0)';
        dot.style.opacity = '0';
        mark.style.transform = 'scale(1)';
        mark.style.opacity = '1';
      }
    }

    function onMouseOut(e: MouseEvent) {
      const related = e.relatedTarget as HTMLElement | null;
      const target = e.target as HTMLElement;

      const leavingInteractive = target.closest(INTERACTIVE_SELECTOR);
      const enteringInteractive = related?.closest?.(INTERACTIVE_SELECTOR);
      if (leavingInteractive && !enteringInteractive) {
        dot.style.transform = 'scale(1)';
        dot.style.opacity = '1';
        mark.style.transform = 'scale(0)';
        mark.style.opacity = '0';
      }
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseover', onMouseOver);
    document.addEventListener('mouseout', onMouseOut);
    rafId = requestAnimationFrame(tick);

    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseover', onMouseOver);
      document.removeEventListener('mouseout', onMouseOut);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 300,
        pointerEvents: 'none',
        opacity: 0,
        willChange: 'transform',
        // Blend on this outer container, not the dot/mark individually,
        // so both forms composite as one unit before inverting against
        // the backdrop — same technique as the corner anchors in
        // Corners.tsx. Colour stays pinned at '#ede4dd'; the blend does
        // the inversion (cream on black, dark on the light Catalog
        // ground / cream roster names).
        mixBlendMode: 'difference',
      }}
    >
      <div
        ref={dotRef}
        style={{
          position: 'absolute',
          top: '-4px',
          left: '-4px',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#ede4dd',
          transform: 'scale(1)',
          opacity: 1,
          transition: 'transform 250ms cubic-bezier(0.22, 1, 0.36, 1), opacity 250ms ease',
        }}
      />
      <svg
        ref={markRef}
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        style={{
          position: 'absolute',
          top: '-13px',
          left: '-13px',
          transform: 'scale(0)',
          opacity: 0,
          transition: 'transform 250ms cubic-bezier(0.22, 1, 0.36, 1), opacity 250ms ease',
        }}
      >
        <circle cx="12" cy="12" r="6" stroke="#ede4dd" strokeWidth="1.2" />
        <line x1="12" y1="1" x2="12" y2="23" stroke="#ede4dd" strokeWidth="1.2" />
        <line x1="1" y1="12" x2="23" y2="12" stroke="#ede4dd" strokeWidth="1.2" />
      </svg>
    </div>
  );
}
