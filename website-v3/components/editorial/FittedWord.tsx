'use client';

import { useLayoutEffect, useRef, useState, type CSSProperties, type ElementType } from 'react';

// Fixed baseline used only for measurement — never rendered.
const MEASURE_PX = 100;

interface FittedWordProps {
  /** The word, rendered as-is (case comes from the class's text-transform). */
  text: string;
  /** Class carrying the font-family/weight/tracking/line-height (and the
   *  clamp() font-size that is the pre-hydration / no-JS fallback). */
  className?: string;
  /** Element for the visible word. Default 'div'. */
  as?: 'h1' | 'h2' | 'div' | 'p' | 'span';
  /** Extra class on the overflow-hidden wrapper. */
  wrapClassName?: string;
  /** Inline style merged onto the visible word (fontSize is owned by the fit). */
  style?: CSSProperties;
  /** Render the visible word aria-hidden (decorative wordmarks). */
  decorative?: boolean;
}

/**
 * A word fitted exactly to its container's width — measure-and-scale:
 * after mount, on resize, and after fonts load, measure a hidden clone's
 * natural width at a fixed baseline font-size and set the visible
 * element's font-size so its width matches the wrapper's. Text width
 * scales linearly with font-size, so it is one measurement, not a search.
 *
 * The clone is measured instead of the visible element so the fit only
 * touches the visible element through React's style prop (imperative
 * writes would fight the ResizeObserver, which also fires on height
 * changes).
 */
export function FittedWord({
  text,
  className,
  as = 'div',
  wrapClassName,
  style,
  decorative,
}: FittedWordProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState<number | null>(null);
  const Tag = as as ElementType;

  useLayoutEffect(() => {
    function fit() {
      const wrap = wrapRef.current;
      const measure = measureRef.current;
      if (!wrap || !measure) return;
      const natural = measure.scrollWidth;
      const available = wrap.clientWidth;
      if (natural <= 0 || available <= 0) return;
      setFontSize((available / natural) * MEASURE_PX);
    }

    fit();

    const ro = new ResizeObserver(fit);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener('resize', fit);

    let cancelled = false;
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready
        .then(() => {
          if (!cancelled) fit();
        })
        .catch(() => {
          // The resize listener and initial measurement still cover it.
        });
    }

    return () => {
      cancelled = true;
      ro.disconnect();
      window.removeEventListener('resize', fit);
    };
  }, [text]);

  return (
    <div
      ref={wrapRef}
      className={wrapClassName}
      style={{ position: 'relative', width: '100%', overflow: 'hidden' }}
    >
      <Tag
        className={className}
        aria-hidden={decorative ? true : undefined}
        style={{ margin: 0, display: 'block', whiteSpace: 'nowrap', ...style, ...(fontSize ? { fontSize: `${fontSize}px` } : null) }}
      >
        {text}
      </Tag>
      <span
        ref={measureRef}
        aria-hidden="true"
        className={className}
        style={{
          margin: 0,
          display: 'block',
          whiteSpace: 'nowrap',
          position: 'absolute',
          visibility: 'hidden',
          top: 0,
          left: 0,
          pointerEvents: 'none',
          fontSize: `${MEASURE_PX}px`,
          width: 'max-content',
        }}
      >
        {text}
      </span>
    </div>
  );
}
