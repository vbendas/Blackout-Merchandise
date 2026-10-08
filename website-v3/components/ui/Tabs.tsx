'use client';

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

export interface TabItem {
  /** Stable, untranslated identifier. */
  id: string;
  label: ReactNode;
  /** Panel content. Rendered for the selected tab only unless `keepMounted`. */
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  /** Accessible name of the tablist. */
  label: string;
  /** Controlled selected tab id. */
  value?: string;
  /** Uncontrolled initial tab id (defaults to the first enabled tab). */
  defaultValue?: string;
  onValueChange?: (id: string) => void;
  orientation?: 'horizontal' | 'vertical';
  /**
   * auto (default): arrow keys select as they move focus.
   * manual: arrows only move focus; Enter or Space selects.
   */
  activation?: 'auto' | 'manual';
  /** Keep inactive panels in the DOM (hidden) so their state survives. */
  keepMounted?: boolean;
  className?: string;
}

/**
 * Tabs: WAI-ARIA tabs pattern with a roving tabindex. Only the selected tab is
 * in the Tab order; arrow keys move between tabs, Home/End jump to the ends,
 * and disabled tabs are skipped. 44px minimum hit area.
 * Styles: design-tokens/components-controls.css (.mf-tablist, .mf-tab).
 */
export function Tabs({
  tabs,
  label,
  value,
  defaultValue,
  onValueChange,
  orientation = 'horizontal',
  activation = 'auto',
  keepMounted = false,
  className,
}: TabsProps) {
  const base = useId();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const firstEnabled = tabs.find((t) => !t.disabled)?.id ?? tabs[0]?.id;
  const [inner, setInner] = useState(defaultValue ?? firstEnabled);
  const controlled = value !== undefined;
  const selected = controlled ? value : inner;
  // Focus can be ahead of selection in manual activation mode.
  const [focused, setFocused] = useState<string | undefined>(undefined);

  const enabled = tabs.filter((t) => !t.disabled);
  const tabId = (id: string) => `${base}-tab-${id}`;
  const panelId = (id: string) => `${base}-panel-${id}`;

  function select(id: string) {
    if (!controlled) setInner(id);
    onValueChange?.(id);
  }

  function move(toId: string) {
    tabRefs.current[toId]?.focus();
    setFocused(toId);
    if (activation === 'auto') select(toId);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const vertical = orientation === 'vertical';
    const prevKey = vertical ? 'ArrowUp' : 'ArrowLeft';
    const nextKey = vertical ? 'ArrowDown' : 'ArrowRight';
    if (![prevKey, nextKey, 'Home', 'End'].includes(e.key)) return;
    if (enabled.length === 0) return;
    const current = focused ?? selected;
    const index = Math.max(
      0,
      enabled.findIndex((t) => t.id === current),
    );
    let next = index;
    if (e.key === prevKey) next = (index - 1 + enabled.length) % enabled.length;
    else if (e.key === nextKey) next = (index + 1) % enabled.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = enabled.length - 1;
    e.preventDefault();
    move(enabled[next].id);
  }

  // The tab that is in the Tab order: the focused one while the user is
  // navigating, otherwise the selected one (and never a disabled one).
  const isEnabled = (id: string | undefined) => enabled.some((t) => t.id === id);
  const tabStop = isEnabled(focused) ? focused : isEnabled(selected) ? selected : firstEnabled;

  return (
    <div className={className ? `mf-tabs ${className}` : 'mf-tabs'}>
      <div
        role="tablist"
        aria-label={label}
        aria-orientation={orientation}
        className="mf-tablist"
        onKeyDown={onKeyDown}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            ref={(el) => {
              tabRefs.current[t.id] = el;
            }}
            type="button"
            role="tab"
            id={tabId(t.id)}
            className="mf-tab"
            aria-selected={t.id === selected}
            aria-controls={panelId(t.id)}
            aria-disabled={t.disabled || undefined}
            tabIndex={t.id === tabStop ? 0 : -1}
            onFocus={() => setFocused(t.id)}
            onBlur={() => setFocused(undefined)}
            onClick={() => {
              if (!t.disabled) select(t.id);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => {
        const active = t.id === selected;
        if (!active && !keepMounted) return null;
        return (
          <div
            key={t.id}
            role="tabpanel"
            id={panelId(t.id)}
            aria-labelledby={tabId(t.id)}
            className="mf-tabpanel"
            tabIndex={0}
            hidden={!active}
          >
            {t.content}
          </div>
        );
      })}
    </div>
  );
}
