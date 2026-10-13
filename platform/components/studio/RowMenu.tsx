'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ExternalArrow } from '@/components/studio/ExternalArrow';

export interface MenuAction {
  label: string;
  onSelect?: () => void;
  /** opens a nested list in place of the current one, with a Back item */
  submenu?: MenuEntry[];
  /** radio-style mark, e.g. the session's current project */
  checked?: boolean;
  href?: string;
  /** with href: opens in a new tab, and the menu hands focus back on select */
  external?: boolean;
}

export type MenuEntry = MenuAction | 'separator';

type Placement = 'below-end' | 'above-start';

/** Small accessible menu: a trigger button (aria-haspopup / aria-expanded)
 * and a fixed-position list that closes on Escape, outside click, Tab and
 * scroll, with arrow-key / Home / End navigation. A submenu replaces the
 * list in place, so it works the same in the narrow mobile drawer. */
export function RowMenu({
  label,
  items,
  placement = 'below-end',
  triggerClassName,
  triggerContent,
  menuClassName,
  onOpenChange,
}: {
  /** accessible name of the trigger */
  label: string;
  items: MenuEntry[];
  placement?: Placement;
  triggerClassName?: string;
  triggerContent?: ReactNode;
  menuClassName?: string;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [stack, setStack] = useState<{ title: string; entries: MenuEntry[] }[]>([]);
  const [position, setPosition] = useState<{ left?: number; right?: number; top?: number; bottom?: number; width?: number }>(
    {},
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const current = stack.length ? stack[stack.length - 1] : null;
  const entries = current ? current.entries : items;

  const setOpenState = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) setStack([]);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  const close = useCallback(
    (restoreFocus = true) => {
      setOpenState(false);
      if (restoreFocus) triggerRef.current?.focus();
    },
    [setOpenState],
  );

  const place = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (placement === 'above-start') {
      setPosition({ left: rect.left, bottom: window.innerHeight - rect.top + 6, width: rect.width });
    } else {
      setPosition({ right: Math.max(8, window.innerWidth - rect.right), top: rect.bottom + 4 });
    }
  }, [placement]);

  useLayoutEffect(() => {
    if (!open) return;
    place();
  }, [open, place]);

  // Focus the first item whenever the list opens or changes level.
  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLElement>('[role^="menuitem"]');
    first?.focus();
  }, [open, stack.length]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close(false);
    }
    function onScroll(event: Event) {
      if (menuRef.current?.contains(event.target as Node)) return;
      close(false);
    }
    function onResize() {
      close(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, close]);

  function onMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const nodes = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []);
    const index = nodes.indexOf(document.activeElement as HTMLElement);
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        if (stack.length) setStack((s) => s.slice(0, -1));
        else close();
        break;
      case 'ArrowDown':
        event.preventDefault();
        nodes[(index + 1) % nodes.length]?.focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        nodes[(index - 1 + nodes.length) % nodes.length]?.focus();
        break;
      case 'Home':
        event.preventDefault();
        nodes[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        nodes[nodes.length - 1]?.focus();
        break;
      case 'ArrowLeft':
        if (stack.length) {
          event.preventDefault();
          setStack((s) => s.slice(0, -1));
        }
        break;
      case 'Tab':
        close(false);
        break;
      default:
        break;
    }
  }

  function select(entry: MenuAction) {
    if (entry.submenu) {
      setStack((s) => [...s, { title: entry.label, entries: entry.submenu! }]);
      return;
    }
    close(!entry.href || Boolean(entry.external));
    entry.onSelect?.();
  }

  const menu = open ? (
    <div
      ref={menuRef}
      id={menuId}
      role="menu"
      aria-label={current ? current.title : label}
      className={`mf-menu ${menuClassName ?? ''}`}
      style={{ position: 'fixed', ...position, minWidth: Math.max(200, position.width ?? 0) }}
      onKeyDown={onMenuKeyDown}
    >
      {current ? (
        <>
          <button
            type="button"
            role="menuitem"
            tabIndex={-1}
            className="mf-menu-item mf-dimmed"
            onClick={() => setStack((s) => s.slice(0, -1))}
          >
            <span>Back</span>
          </button>
          <div className="mf-menu-sep" role="separator" />
        </>
      ) : null}
      {entries.map((entry, index) =>
        entry === 'separator' ? (
          <div key={`sep-${index}`} className="mf-menu-sep" role="separator" />
        ) : entry.href ? (
          <a
            key={entry.label}
            href={entry.href}
            target={entry.external ? '_blank' : undefined}
            rel={entry.external ? 'noopener noreferrer' : undefined}
            role="menuitem"
            tabIndex={-1}
            className="mf-menu-item"
            onClick={(event) => {
              // Let the caller route client-side when it handles the select.
              if (entry.onSelect) event.preventDefault();
              select(entry);
            }}
          >
            {entry.external ? (
              <>
                <span>{entry.label}</span>
                <ExternalArrow className="mf-dimmed" />
                <span className="sr-only">(opens in a new tab)</span>
              </>
            ) : (
              entry.label
            )}
          </a>
        ) : (
          <button
            key={entry.label}
            type="button"
            role={entry.checked === undefined ? 'menuitem' : 'menuitemradio'}
            aria-checked={entry.checked === undefined ? undefined : entry.checked}
            aria-haspopup={entry.submenu ? 'menu' : undefined}
            tabIndex={-1}
            className="mf-menu-item"
            onClick={() => select(entry)}
          >
            <span className="min-w-0 truncate">{entry.label}</span>
            {entry.submenu ? <span aria-hidden className="mf-dimmed">›</span> : null}
          </button>
        ),
      )}
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={triggerClassName}
        onClick={() => setOpenState(!open)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setOpenState(true);
          }
        }}
      >
        {triggerContent ?? <MoreIcon />}
      </button>
      {menu ? createPortal(menu, document.body) : null}
    </>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden fill="currentColor">
      <circle cx="3.5" cy="8" r="1.1" />
      <circle cx="8" cy="8" r="1.1" />
      <circle cx="12.5" cy="8" r="1.1" />
    </svg>
  );
}
