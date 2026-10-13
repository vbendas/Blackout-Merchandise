'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

export interface ScrollEdges {
  /** the row has been scrolled: there is more to the left */
  start: boolean;
  /** there is more to the right */
  end: boolean;
}

/** For a row that scrolls sideways (the category tabs, the filters on a
 * phone): which sides have more to show, so the stylesheet can fade those
 * edges (data-start / data-end). Follows scrolling and resizing. */
export function useScrollEdges<T extends HTMLElement>(): [RefObject<T | null>, ScrollEdges] {
  const ref = useRef<T>(null);
  const [edges, setEdges] = useState<ScrollEdges>({ start: false, end: false });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      const start = element.scrollLeft > 1;
      const end = element.scrollLeft + element.clientWidth < element.scrollWidth - 1;
      setEdges((current) => (current.start === start && current.end === end ? current : { start, end }));
    };
    element.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    // Observing also reports the row's first size, so no measuring is needed here.
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(element);
    return () => {
      element.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, []);

  return [ref, edges];
}
