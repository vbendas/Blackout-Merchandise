'use client';

import { useEffect } from 'react';
import { IconClose } from './icons';

export interface Toast {
  id: number;
  text: string;
}

/** What went wrong with a change, over the bottom of the screen until it is read (or six seconds). A live region: a screen reader says it. */
export function Toasts({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="st-toasts" role="region" aria-label="Messages" aria-live="polite">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 6000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);
  return (
    <p className="st-toast" role="alert">
      <span>{toast.text}</span>
      <button type="button" className="st-btn st-btn-icon st-btn-quiet" aria-label="Dismiss" onClick={() => onDismiss(toast.id)}>
        <IconClose />
      </button>
    </p>
  );
}
