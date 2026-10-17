'use client';

// A sheet over the screen for a question or a number (the keypad, "Job done?"). Real buttons inside, Escape and a tap outside close it,
// the focus goes into it and comes back to where it was, and Tab stays inside. Page-like, big: it is for a thumb.
import { useEffect, useId, useRef, type ReactNode } from 'react';

export function Dialog({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const focusables = () => [...(node?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input, [tabindex]:not([tabindex="-1"])') ?? [])];
    // The first thing to press is the sheet's own primary button; failing that, the sheet itself.
    (node?.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0] ?? node)?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      before?.focus?.();
    };
  }, []);

  return (
    <div className="st-scrim" onPointerDown={(event) => event.target === event.currentTarget && close.current()}>
      <div ref={ref} className={`st-dialog${wide ? ' st-dialog-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <h2 id={titleId} className="st-dialog-title">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
