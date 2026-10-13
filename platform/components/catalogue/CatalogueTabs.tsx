'use client';

import { useEffect, useId, type KeyboardEvent, type ReactNode } from 'react';
import type { CatalogueCategoryCount } from '@/lib/catalog/catalogue-index';
import { ALL } from './catalogue-state';
import { useScrollEdges } from './useScrollEdges';

export interface CatalogueTabsProps {
  categories: readonly CatalogueCategoryCount[];
  /** every blank, the count beside All */
  total: number;
  /** ALL or a category name */
  active: string;
  onSelect: (category: string) => void;
  /** what the tabs switch: the filters and the blanks of the active category */
  children: ReactNode;
}

/** The categories as tabs in one row under the top bar, full width: All and the
 * eight categories, each with its name and its count. The active tab has a 2px
 * white bar under it and a white label, the others are at 80%. A hairline runs
 * under the row. A real tablist: the arrow keys (and Home and End) move focus
 * between the tabs, Enter or Space opens the one in focus (a category is a place
 * of its own in the history, so moving across them does not open each). When the
 * row does not fit it scrolls sideways with a fade at the edge that has more, and
 * keeps the active tab in view. There is no menu: the categories have no
 * sub-levels.
 *
 * The children are the one tab panel, labelled by the active tab. */
export function CatalogueTabs({ categories, total, active, onSelect, children }: CatalogueTabsProps) {
  const panelId = useId();
  const [listRef, edges] = useScrollEdges<HTMLDivElement>();
  const tabs = [{ name: ALL, label: 'All', count: total }, ...categories.map((category) => ({ name: category.name, label: category.name, count: category.count }))];
  // One tab is always the current one (and in the tab order), whatever the address asked for.
  const current = tabs.some((tab) => tab.name === active) ? active : ALL;
  const tabId = (index: number) => `${panelId}-tab-${index}`;

  // The current tab stays in view: a link may open a category far along the row.
  useEffect(() => {
    const list = listRef.current;
    const tab = list?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!list || !tab) return;
    const margin = 48;
    if (tab.offsetLeft < list.scrollLeft + margin) list.scrollLeft = Math.max(0, tab.offsetLeft - margin);
    else if (tab.offsetLeft + tab.offsetWidth > list.scrollLeft + list.clientWidth - margin) list.scrollLeft = tab.offsetLeft + tab.offsetWidth - list.clientWidth + margin;
  }, [current, listRef]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const all = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'));
    const at = all.indexOf(document.activeElement as HTMLElement);
    if (at === -1) return;
    const next =
      event.key === 'ArrowRight' ? (at + 1) % all.length : event.key === 'ArrowLeft' ? (at - 1 + all.length) % all.length : event.key === 'Home' ? 0 : event.key === 'End' ? all.length - 1 : -1;
    if (next === -1) return;
    event.preventDefault();
    all[next].focus();
  }

  return (
    <>
      <div className="cat-tabsrow">
        <div ref={listRef} className="cat-tabs" role="tablist" aria-label="Categories" data-start={edges.start} data-end={edges.end} onKeyDown={onKeyDown}>
          {tabs.map((tab, index) => {
            const selected = tab.name === current;
            return (
              <button
                key={tab.name}
                id={tabId(index)}
                type="button"
                role="tab"
                className="cat-tab"
                aria-selected={selected}
                aria-controls={panelId}
                tabIndex={selected ? 0 : -1}
                onClick={() => onSelect(tab.name)}
              >
                <span>{tab.label}</span>{' '}
                <span className="cat-n">{tab.count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div id={panelId} role="tabpanel" className="cat-panel" aria-labelledby={tabId(tabs.findIndex((tab) => tab.name === current))}>
        {children}
      </div>
    </>
  );
}
