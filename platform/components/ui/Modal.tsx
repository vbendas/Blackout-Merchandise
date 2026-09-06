'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  variant?: 'center' | 'sheet';
}

const focusableSelector =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, children, variant = 'center' }: ModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const node = containerRef.current;
    const focusable = node?.querySelectorAll<HTMLElement>(focusableSelector);
    (focusable?.[0] ?? node)?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(focusableSelector));
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
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const wrapperClass =
    variant === 'sheet'
      ? 'fixed inset-0 z-50 flex items-end justify-center'
      : 'fixed inset-0 z-50 flex items-center justify-center p-6';
  const panelClass =
    variant === 'sheet'
      ? 'mf-card mf-fade-in relative z-10 max-h-[80vh] w-full overflow-y-auto p-6 border-b-0'
      : 'mf-card mf-fade-in relative z-10 max-h-[85vh] w-full max-w-[560px] overflow-y-auto p-6';

  return createPortal(
    <div className={wrapperClass}>
      <div
        className="absolute inset-0 bg-black/70 mf-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={panelClass}
        style={{ background: 'var(--paper)' }}
      >
        {title ? (
          <div className="mf-label mf-dimmed mb-4 flex items-center justify-between">
            <span>{title}</span>
            <button className="mf-btn min-h-8 px-2" onClick={onClose} aria-label="Close">
              &times;
            </button>
          </div>
        ) : (
          <button
            className="mf-btn absolute right-4 top-4 min-h-8 px-2"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
