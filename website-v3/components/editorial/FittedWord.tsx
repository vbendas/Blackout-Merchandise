'use client';

import { useLayoutEffect, useRef, useState, type CSSProperties, type ElementType } from 'react';

// Fixed baseline used only for measurement (the .mf-fit-measure clone is
// pinned to 100px in design-tokens/type.css).
const MEASURE_PX = 100;

type DataAttrs = { [key in `data-${string}`]?: string | undefined };

type FittedWordProps = DataAttrs & {
  /** The word, rendered as-is (case comes from the class's text-transform). */
  text: string;
  /** Class carrying the font-family/weight/tracking (normally `t-poster`,
   *  plus `mf-misreg` / `mf-misreg-outline` / `mf-outline`). */
  className?: string;
  /** Element for the visible word. Default 'div'. */
  as?: 'h1' | 'h2' | 'div' | 'p' | 'span';
  /** Extra class on the clipping wrapper. */
  wrapClassName?: string;
  /** Inline style merged onto the visible word (size is owned by the fit). */
  style?: CSSProperties;
  /** Render the visible word aria-hidden (decorative wordmarks). */
  decorative?: boolean;
};

/**
 * A word fitted exactly to its container's width: measure-and-scale. A hidden
 * clone is measured at a fixed baseline size and the visible word's size is
 * set so its width matches the wrapper. Text width scales linearly with
 * font-size, so it is one measurement, not a search.
 *
 * Layout (classes live in design-tokens/type.css):
 *   .mf-fit          clipping size container (the wrapper)
 *     .mf-fit-box    owns the font size; block padding = --display-pad (em of
 *                    the fitted size) so diacritics stay inside the wrapper
 *       .mf-fit-word the visible word (inherits size, line height from token)
 *     .mf-fit-measure hidden clone
 *
 * No CLS: before the first fit (SSR, pre-hydration, fonts loading) the box
 * size is the CSS estimate container width / (chars x --display-fit), and the
 * wrapper height is (--display-lh + 2 x --display-pad) em of that size, so
 * the measured size only nudges the height by the estimate's error.
 *
 * Re-measures: on mount, on text change, on wrapper resize, when fonts settle
 * (`document.fonts.ready` and every later `loadingdone`, e.g. the latin-ext
 * file arriving after a locale change) and when <html lang> changes (the
 * i18n provider sets it only once the dictionary has loaded). Nothing is
 * applied while fonts are still loading (see `ready` below).
 *
 * Any `data-*` props are forwarded to the visible word, so
 * `.mf-misreg-outline` (which draws its copy from `attr(data-text)`) works on
 * fitted words; `data-text` defaults to the word.
 */
export function FittedWord({
  text,
  className,
  as = 'div',
  wrapClassName,
  style,
  decorative,
  ...rest
}: FittedWordProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState<number | null>(null);
  const Tag = as as ElementType;

  const dataAttrs: Record<string, string | undefined> = { 'data-text': text };
  for (const [key, value] of Object.entries(rest)) {
    if (key.startsWith('data-')) dataAttrs[key] = value as string | undefined;
  }

  useLayoutEffect(() => {
    // Until the faces have loaded the measured width belongs to the fallback
    // font, so applying it would resize the word (and its reserved height)
    // twice. The CSS estimate, which was derived from the real face, stays in
    // force until then.
    const fonts = typeof document !== 'undefined' && 'fonts' in document ? document.fonts : null;
    let ready = !fonts || fonts.status === 'loaded';

    function fit() {
      const wrap = wrapRef.current;
      const measure = measureRef.current;
      const box = boxRef.current;
      if (!ready || !wrap || !measure) return;
      // CSS adds letter-spacing after the LAST glyph too. With the negative
      // display tracking that would put the last glyph's ink past the box
      // edge (clipped), so the fit ignores the trailing spacing.
      const trailing = parseFloat(getComputedStyle(measure).letterSpacing) || 0;
      const natural = measure.getBoundingClientRect().width - trailing;
      // Width left inside the box's inline padding (stroke + misregistration room).
      const boxStyle = box ? getComputedStyle(box) : null;
      const inset = boxStyle ? (parseFloat(boxStyle.paddingLeft) || 0) + (parseFloat(boxStyle.paddingRight) || 0) : 0;
      const available = wrap.clientWidth - inset;
      if (natural <= 0 || available <= 0) return;
      const next = Math.round((available / natural) * MEASURE_PX * 100) / 100;
      setFontSize((prev) => (prev === next ? prev : next));
    }

    fit();

    const ro = new ResizeObserver(fit);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener('resize', fit);

    // The dictionary chunk lands and the provider flips <html lang>; the
    // glyphs for that locale (latin-ext) may load right after.
    const mo = new MutationObserver(fit);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

    let cancelled = false;
    if (fonts) {
      fonts.ready
        .then(() => {
          if (cancelled) return;
          ready = true;
          fit();
        })
        .catch(() => {
          // The resize listener and the initial measurement still cover it.
        });
      fonts.addEventListener('loadingdone', fit);
    }

    return () => {
      cancelled = true;
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener('resize', fit);
      fonts?.removeEventListener('loadingdone', fit);
    };
  }, [text]);

  const boxStyle = {
    '--poster-chars': [...text].length,
    ...(fontSize ? { '--mf-fit-size': `${fontSize}px` } : null),
  } as CSSProperties;

  return (
    <div ref={wrapRef} className={wrapClassName ? `mf-fit ${wrapClassName}` : 'mf-fit'}>
      <div ref={boxRef} className="mf-fit-box" style={boxStyle}>
        <Tag
          className={className ? `mf-fit-word ${className}` : 'mf-fit-word'}
          aria-hidden={decorative ? true : undefined}
          style={style}
          {...dataAttrs}
        >
          {text}
        </Tag>
      </div>
      <span ref={measureRef} aria-hidden="true" className={className ? `mf-fit-measure ${className}` : 'mf-fit-measure'}>
        {text}
      </span>
    </div>
  );
}
