'use client';

import { useRef, type KeyboardEvent } from 'react';
import { TABS, type ApproveTab } from './approve-logic';

/** The two print methods as tabs in one row under the top bar: shop products
 * (DTG/DTF) first, then runs (screen print). The active tab has a 2px white
 * bar under it and a white label, the other is at 50%. A real tablist: the
 * arrow keys (and Home and End) move to a tab and open it, and only the open
 * tab is in the tab order. `tabId` and `panelId` give the ids the aria links
 * point at (the panel is the one the tabs switch). */
export function ApproveTabs({
  tab,
  onSelect,
  tabId,
  panelId,
}: {
  tab: ApproveTab;
  onSelect: (tab: ApproveTab) => void;
  tabId: (tab: ApproveTab) => string;
  panelId: string;
}) {
  const buttons = useRef<Partial<Record<ApproveTab, HTMLButtonElement | null>>>({});

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const at = TABS.findIndex((item) => item.id === tab);
    const next =
      event.key === 'ArrowRight' ? (at + 1) % TABS.length : event.key === 'ArrowLeft' ? (at - 1 + TABS.length) % TABS.length : event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : -1;
    if (next === -1) return;
    event.preventDefault();
    const target = TABS[next].id;
    onSelect(target);
    buttons.current[target]?.focus();
  }

  return (
    <div className="ap-tabsrow">
      <div className="ap-tabs" role="tablist" aria-label="Print method" onKeyDown={onKeyDown}>
        {TABS.map((item) => {
          const selected = item.id === tab;
          return (
            <button
              key={item.id}
              ref={(node) => {
                buttons.current[item.id] = node;
              }}
              id={tabId(item.id)}
              type="button"
              role="tab"
              className="ap-tab"
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
