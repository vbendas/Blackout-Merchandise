'use client';

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { markDialogOpen } from '@/lib/motion/dialogState';
import { lockScroll } from '@/lib/motion/scrollLock';

export type DialogVariant = 'modal' | 'drawer' | 'menu';

interface DialogBaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** modal: centred card. drawer: full-height side sheet. menu: full-screen sheet. */
  variant?: DialogVariant;
  /** drawer only. */
  side?: 'left' | 'right';
  /** modal only: panel width. */
  size?: 'sm' | 'md' | 'lg' | 'full';
  /** Re-scope the panel surface, for example a paper insert on the ink page. */
  theme?: 'ink' | 'paper';
  /** Defaults to the first focusable element, then the panel. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Defaults to the element that was focused when the dialog opened. */
  returnFocusRef?: RefObject<HTMLElement | null>;
  /** Close on a click on the backdrop. Default true. */
  closeOnBackdrop?: boolean;
  className?: string;
  panelClassName?: string;
  children: ReactNode;
}

/** A dialog needs an accessible name: pass `label`, or `labelledBy` (an id inside the panel). */
export type DialogProps = DialogBaseProps &
  ({ label: string; labelledBy?: never } | { labelledBy: string; label?: never });

const TABBABLE =
  'a[href], area[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex], [contenteditable=""], [contenteditable="true"]';

const IGNORED_SIBLINGS = new Set(['SCRIPT', 'STYLE', 'LINK', 'TEMPLATE', 'NOSCRIPT', 'NEXTJS-PORTAL']);

// inert on the rest of the page, reference counted so stacked dialogs release in order.
const inerted = new Map<Element, number>();

function inertPage(): () => void {
  const mine: Element[] = [];
  for (const el of Array.from(document.body.children)) {
    if (IGNORED_SIBLINGS.has(el.tagName)) continue;
    if (el instanceof HTMLDialogElement && el.classList.contains('mf-dialog')) continue;
    const count = inerted.get(el);
    if (count === undefined) {
      if ((el as HTMLElement).inert) continue; // someone else's inert: leave it alone
      (el as HTMLElement).inert = true;
      inerted.set(el, 1);
    } else {
      inerted.set(el, count + 1);
    }
    mine.push(el);
  }
  return () => {
    for (const el of mine) {
      const count = inerted.get(el);
      if (count === undefined) continue;
      if (count <= 1) {
        inerted.delete(el);
        (el as HTMLElement).inert = false;
      } else {
        inerted.set(el, count - 1);
      }
    }
  };
}

function tabbables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(TABBABLE)).filter((el) => {
    if (el.tabIndex < 0 || el.hasAttribute('disabled') || el.closest('[inert]')) return false;
    if (el instanceof HTMLInputElement && el.type === 'radio' && !el.checked) {
      // one stop per radio group: skip unchecked radios when another is checked
      const group = root.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(el.name)}"]`);
      if (el.name && Array.from(group).some((r) => r.checked)) return false;
    }
    return el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  });
}

function closeDurationMs(panel: HTMLElement): number {
  const raw = getComputedStyle(panel).animationDuration.split(',')[0]?.trim() ?? '0s';
  const n = parseFloat(raw);
  if (Number.isNaN(n)) return 0;
  return raw.endsWith('ms') ? n : n * 1000;
}

const subscribeNone = () => () => {};

/**
 * Dialog: native <dialog> opened with showModal(), so the browser supplies the
 * top layer, modality and Esc. On top of that:
 *  - Esc and backdrop click call onOpenChange(false); the state stays yours.
 *  - Tab wraps inside the panel (the rest of the page is also `inert`).
 *  - Focus returns to the opener when it closes.
 *  - Page scroll is locked through lib/motion/scrollLock.ts (Lenis-aware); the
 *    panel carries data-lenis-prevent so it scrolls with the wheel.
 *  - Open state is published through lib/motion/dialogState.ts so the custom
 *    Cursor can hand over to the native pointer.
 *  - 160ms hard clip cut open and close (design-tokens/components-controls.css).
 * The panel is rendered in a portal on <body>. Children mount while open and
 * through the close animation.
 */
export function Dialog({
  open,
  onOpenChange,
  variant = 'modal',
  side = 'right',
  size = 'md',
  theme,
  label,
  labelledBy,
  initialFocusRef,
  returnFocusRef,
  closeOnBackdrop = true,
  className,
  panelClassName,
  children,
}: DialogProps) {
  const mounted = useSyncExternalStore(subscribeNone, () => true, () => false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const releaseRef = useRef<(() => void) | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const downOnBackdrop = useRef(false);
  const openRef = useRef(open);
  // Children stay mounted until the close animation has finished.
  const [present, setPresent] = useState(open);
  if (open && !present) setPresent(true);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const panel = panelRef.current;
    if (!mounted || !dialog || !panel) return;

    if (open) {
      dialog.removeAttribute('data-state');
      if (dialog.open) return;
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      try {
        dialog.showModal();
      } catch {
        return;
      }
      const releases = [markDialogOpen(), lockScroll(), inertPage()];
      releaseRef.current = () => releases.forEach((r) => r());
      // Initial focus: caller's choice, then [autofocus], then the first tabbable
      // (the browser would pick the tabindex=-1 panel itself), then the panel.
      const initial =
        initialFocusRef?.current ?? panel.querySelector<HTMLElement>('[autofocus]') ?? tabbables(panel)[0] ?? panel;
      initial.focus();
      return;
    }

    // Closing. Only act if this instance actually opened.
    if (!releaseRef.current && !dialog.open) return;
    let done = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = () => {
      if (done) return;
      done = true;
      panel.removeEventListener('animationend', onEnd);
      if (timer) clearTimeout(timer);
      if (dialog.open) dialog.close();
      releaseRef.current?.();
      releaseRef.current = null;
      dialog.removeAttribute('data-state');
      const back = returnFocusRef?.current ?? openerRef.current;
      if (back && back.isConnected) back.focus({ preventScroll: true });
      openerRef.current = null;
      setPresent(false);
    };
    const onEnd = (e: AnimationEvent) => {
      if (e.target === panel) finish();
    };

    if (dialog.open) {
      dialog.setAttribute('data-state', 'closing');
      panel.addEventListener('animationend', onEnd);
      timer = setTimeout(finish, closeDurationMs(panel) + 60);
    } else {
      timer = setTimeout(finish, 0);
    }
    return () => {
      done = true;
      panel.removeEventListener('animationend', onEnd);
      if (timer) clearTimeout(timer);
    };
    // initialFocusRef / returnFocusRef are refs: reading .current is intentional
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mounted]);

  // Unmounted while open (route change): release everything.
  useEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      releaseRef.current?.();
      releaseRef.current = null;
      if (dialog?.open) dialog.close();
    };
  }, [mounted]);

  function onKeyDown(e: KeyboardEvent<HTMLDialogElement>) {
    if (e.key !== 'Tab') return;
    const panel = panelRef.current;
    if (!panel) return;
    const stops = tabbables(panel);
    if (stops.length === 0) {
      e.preventDefault();
      panel.focus();
      return;
    }
    const first = stops[0];
    const last = stops[stops.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === panel || !panel.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  }

  function onPointerDown(e: PointerEvent<HTMLDialogElement>) {
    downOnBackdrop.current = e.target === e.currentTarget;
  }

  function onClick(e: MouseEvent<HTMLDialogElement>) {
    const startedOnBackdrop = downOnBackdrop.current;
    downOnBackdrop.current = false;
    if (closeOnBackdrop && startedOnBackdrop && e.target === e.currentTarget) onOpenChange(false);
  }

  if (!mounted) return null;

  return createPortal(
    <dialog
      ref={dialogRef}
      className={className ? `mf-dialog ${className}` : 'mf-dialog'}
      data-variant={variant}
      data-side={variant === 'drawer' ? side : undefined}
      data-size={variant === 'modal' ? size : undefined}
      aria-label={label}
      aria-labelledby={labelledBy}
      onCancel={(e) => {
        // Esc: keep the dialog open until the parent state says otherwise, so
        // the close animation and focus return always run.
        e.preventDefault();
        onOpenChange(false);
      }}
      onClose={() => {
        // The browser closed it on its own (second Esc, form method=dialog).
        if (openRef.current) onOpenChange(false);
      }}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onClick={onClick}
    >
      <div
        ref={panelRef}
        className={panelClassName ? `mf-dialog__panel ${panelClassName}` : 'mf-dialog__panel'}
        data-theme={theme}
        data-lenis-prevent
        tabIndex={-1}
      >
        {present ? children : null}
      </div>
    </dialog>,
    document.body,
  );
}
