// Shared "is any modal dialog open" flag (Round 9, WP6c).
//
// Native <dialog>.showModal() renders in the browser top layer, above every
// z-index, so the custom Cursor (a fixed-position element) would be painted
// UNDER an open dialog and look broken. The Dialog primitive therefore marks
// itself open here, and the Cursor (WP16) yields to the native pointer while
// isDialogOpen() is true.
//
// Plain module state with a subscribe function (no React needed), so non-React
// code such as a GSAP-driven cursor can listen too. React components use
// useDialogOpen(). Several dialogs can be open at once (a menu over a drawer),
// so this counts open dialogs rather than holding a boolean.
//
// <html data-dialog-open> mirrors the flag for CSS.

import { useSyncExternalStore } from 'react';

type Listener = () => void;

const open = new Set<symbol>();
const listeners = new Set<Listener>();

function emit() {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    if (open.size > 0) root.setAttribute('data-dialog-open', '');
    else root.removeAttribute('data-dialog-open');
  }
  listeners.forEach((l) => l());
}

/** True while at least one Dialog is open. Always false on the server. */
export function isDialogOpen(): boolean {
  return open.size > 0;
}

/** Number of dialogs currently open (nested dialogs count separately). */
export function openDialogCount(): number {
  return open.size;
}

/**
 * Subscribe to open/close changes. Returns the unsubscribe function.
 * The listener takes no arguments; call isDialogOpen() inside it.
 */
export function subscribeDialogState(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Mark one dialog as open. Returns a release function that is safe to call
 * more than once. Called by the Dialog primitive; other code should not need it.
 */
export function markDialogOpen(): () => void {
  const token = Symbol('dialog');
  open.add(token);
  emit();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    open.delete(token);
    emit();
  };
}

/** React hook form of isDialogOpen(); false during SSR and hydration. */
export function useDialogOpen(): boolean {
  return useSyncExternalStore(subscribeDialogState, isDialogOpen, () => false);
}
