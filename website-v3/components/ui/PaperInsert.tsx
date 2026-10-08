'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { RegMarks } from './RegMarks';

// PaperInsert (Round 9 WP6a): a paper slab on the ink page. Wraps its
// children in data-theme="paper" (every semantic token re-scopes), adds grain,
// a 1px --rule edge, an optional mono tab label (e.g. "INSERT 01 / BLANKS",
// built by the caller from i18n) and optional RegMarks.
//
// Entry is a hard 160ms clip cut. The start state exists only when JS has
// marked the insert pending (data-reveal-pending), and only if it starts
// below the fold, so server HTML, reduced motion and above-the-fold inserts
// are fully visible without script. Look: .mf-paper-insert in components.css.

interface PaperInsertProps {
  children: ReactNode;
  /** Mono tab label at the top left. */
  label?: ReactNode;
  /** Registration marks on the four corners. Default true. */
  marks?: boolean;
  /** Clip-cut entry when scrolled into view. Default true. */
  cut?: boolean;
  /** Landmark name when the insert is a standalone region. */
  'aria-label'?: string;
  className?: string;
  id?: string;
}

export function PaperInsert({
  children,
  label,
  marks = true,
  cut = true,
  className,
  ...rest
}: PaperInsertProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !cut) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    el.setAttribute('data-reveal-pending', '');
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        el.removeAttribute('data-reveal-pending');
        io.disconnect();
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      el.removeAttribute('data-reveal-pending');
    };
  }, [cut]);

  return (
    <section
      ref={ref}
      {...rest}
      data-theme="paper"
      className={['mf-paper-insert mf-grain', className].filter(Boolean).join(' ')}
    >
      {marks ? <RegMarks /> : null}
      {label ? <span className="mf-paper-insert__tab">{label}</span> : null}
      <div className="mf-paper-insert__body">{children}</div>
    </section>
  );
}
