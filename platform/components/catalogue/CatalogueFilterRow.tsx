'use client';

import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import {
  FILTER_COLOURS,
  MIN_GROUP,
  SORTS,
  WEIGHT_BUCKETS,
  activeFacetCount,
  type CatalogueFilters,
  type Facets,
  type SortKey,
} from './catalogue-state';
import { useScrollEdges } from './useScrollEdges';

const dotColour = (hex: string) => ({ '--c': hex }) as CSSProperties;

/** The popover's width (catalogue.css, .cat-pop): the place it opens at keeps it inside the page. */
const POPOVER_WIDTH = 224;
/** Space between the button and its popover, and the least space to the page's edge. */
const GAP = 6;
const EDGE = 8;

interface MenuOption {
  /** null is the "Any" choice */
  value: string | null;
  label: string;
  /** a few words after the label ('under 180 g') */
  note?: string;
  /** a colour option's swatch */
  hex?: string;
  /** greyed out and skipped: no blank of this category comes in it */
  disabled?: boolean;
}

interface MenuDef {
  id: string;
  /** names the list for screen readers: 'Fit' */
  label: string;
  options: readonly MenuOption[];
  selected: string | null;
  /** the button's text: 'Fit', 'Fit: Relaxed' */
  text: string;
  /** a choice is made: the button is white */
  active: boolean;
  /** the popover hangs from the button's right edge instead of its left */
  alignEnd?: boolean;
  onChoose: (value: string | null) => void;
}

const ANY: MenuOption = { value: null, label: 'Any' };

export interface CatalogueFilterRowProps {
  filters: CatalogueFilters;
  /** what the current category offers: only these are shown */
  facets: Facets;
  onChange: (patch: Partial<CatalogueFilters>) => void;
  /** Clear filters: the four filters, not the search */
  onClear: () => void;
  /** something sits over the page (the drawer): no menu stays open under it */
  frozen?: boolean;
}

/** Fit, For, Weight and Colour as dropdown buttons at the left of one row, Sort
 * at the right. A group the category cannot use (fewer than two values) is left
 * out, since it would filter nothing. A filter that is set shows its choice on
 * its button ("Fit: Relaxed") in the active, white style, and "Clear filters"
 * follows the buttons. The row stays one line, and scrolls sideways when it does
 * not fit (phones), with a fade at the edge that has more.
 *
 * A button opens one small list of single choices under it (a listbox): the
 * arrow keys, Home and End move, Enter or Space chooses; Escape, a press
 * outside, a choice and Tab close it, and the button takes focus back. The list
 * is a sibling of the scrolling row, not inside it, so the row does not clip it;
 * it sits in the page where the button is, and closes if the row scrolls or the
 * page changes width. */
export function CatalogueFilterRow({ filters, facets, onChange, onClear, frozen = false }: CatalogueFilterRowProps) {
  const listId = useId();
  const [rowRef, edges] = useScrollEdges<HTMLDivElement>();
  const barRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const triggers = useRef(new Map<string, HTMLButtonElement>());

  const [openId, setOpenId] = useState<string | null>(null);
  const [place, setPlace] = useState({ top: 0, left: 0 });
  if (frozen && openId !== null) setOpenId(null);

  const colour = FILTER_COLOURS.find((c) => c.code === filters.colour);
  const weight = WEIGHT_BUCKETS.find((b) => b.key === filters.weight);
  const sort = SORTS.find((s) => s.key === filters.sort) ?? SORTS[0];

  const menus: MenuDef[] = [];
  if (facets.fits.length >= MIN_GROUP) {
    menus.push({
      id: 'fit',
      label: 'Fit',
      options: [ANY, ...facets.fits.map((fit) => ({ value: fit, label: fit }))],
      selected: filters.fit,
      text: filters.fit ? `Fit: ${filters.fit}` : 'Fit',
      active: filters.fit !== null,
      onChoose: (value) => onChange({ fit: value }),
    });
  }
  if (facets.audiences.length >= MIN_GROUP) {
    menus.push({
      id: 'audience',
      label: 'For',
      options: [ANY, ...facets.audiences.map((audience) => ({ value: audience, label: audience }))],
      selected: filters.audience,
      text: filters.audience ? `For: ${filters.audience}` : 'For',
      active: filters.audience !== null,
      onChoose: (value) => onChange({ audience: value as CatalogueFilters['audience'] }),
    });
  }
  if (facets.weights.length >= MIN_GROUP) {
    menus.push({
      id: 'weight',
      label: 'Weight',
      options: [ANY, ...WEIGHT_BUCKETS.filter((bucket) => facets.weights.includes(bucket.key)).map((bucket) => ({ value: bucket.key, label: bucket.label, note: bucket.range }))],
      selected: filters.weight,
      text: weight ? `Weight: ${weight.label}` : 'Weight',
      active: filters.weight !== null,
      onChoose: (value) => onChange({ weight: value as CatalogueFilters['weight'] }),
    });
  }
  menus.push({
    id: 'colour',
    label: 'Colour',
    options: [ANY, ...FILTER_COLOURS.map((c) => ({ value: c.code, label: c.name, hex: c.hex, disabled: !facets.colours.has(c.code) }))],
    selected: filters.colour,
    text: colour ? `Colour: ${colour.name}` : 'Colour',
    active: filters.colour !== null,
    onChoose: (value) => onChange({ colour: value }),
  });
  const sortMenu: MenuDef = {
    id: 'sort',
    label: 'Sort',
    options: SORTS.map((s) => ({ value: s.key, label: s.label })),
    selected: filters.sort,
    text: `Sort: ${sort.label}`,
    active: false,
    alignEnd: true,
    onChoose: (value) => onChange({ sort: (value ?? 'colours') as SortKey }),
  };
  const open = [...menus, sortMenu].find((menu) => menu.id === openId) ?? null;
  const openIdNow = open?.id ?? null;

  /** Where the open list goes: under the button, in the page's own coordinates. */
  function placeUnder(trigger: HTMLElement, alignEnd: boolean | undefined) {
    const bar = barRef.current?.getBoundingClientRect();
    if (!bar) return;
    const rect = trigger.getBoundingClientRect();
    const wanted = alignEnd ? rect.right - bar.left - POPOVER_WIDTH : rect.left - bar.left;
    setPlace({ top: rect.bottom - bar.top + GAP, left: Math.max(EDGE, Math.min(wanted, bar.width - POPOVER_WIDTH - EDGE)) });
  }

  function toggle(menu: MenuDef, trigger: HTMLElement) {
    if (openId === menu.id) {
      setOpenId(null);
      return;
    }
    placeUnder(trigger, menu.alignEnd);
    setOpenId(menu.id);
  }

  // While a list is open: Escape, a press outside, the row scrolling and the page changing width close it.
  useEffect(() => {
    if (openIdNow === null) return;
    const trigger = triggers.current.get(openIdNow);
    const row = rowRef.current;
    const width = window.innerWidth;
    const close = () => setOpenId(null);
    const onPress = (event: PointerEvent) => {
      const target = event.target as Node;
      if (listRef.current?.contains(target) || trigger?.contains(target)) return;
      close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      close();
      trigger?.focus();
    };
    // A phone's address bar resizes the window as the page scrolls: only a change of width counts.
    const onResize = () => {
      if (window.innerWidth !== width) close();
    };
    document.addEventListener('pointerdown', onPress, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onResize);
    row?.addEventListener('scroll', close, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', onPress, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onResize);
      row?.removeEventListener('scroll', close);
    };
  }, [openIdNow, rowRef]);

  // Focus goes into the list: on the chosen option, else the first one.
  useEffect(() => {
    if (openIdNow === null) return;
    const list = listRef.current;
    const chosen = list?.querySelector<HTMLElement>('[aria-selected="true"]:not([aria-disabled="true"])');
    (chosen ?? list?.querySelector<HTMLElement>('[role="option"]:not([aria-disabled="true"])'))?.focus();
  }, [openIdNow]);

  function choose(menu: MenuDef, value: string | null) {
    menu.onChoose(value);
    setOpenId(null);
    triggers.current.get(menu.id)?.focus();
  }

  function onTriggerKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, menu: MenuDef) {
    if (event.key !== 'ArrowDown' || openId === menu.id) return;
    event.preventDefault();
    placeUnder(event.currentTarget, menu.alignEnd);
    setOpenId(menu.id);
  }

  function onListKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Tab') {
      // Leaving the list: it closes and Tab carries on from its button.
      if (openIdNow) triggers.current.get(openIdNow)?.focus();
      setOpenId(null);
      return;
    }
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="option"]:not([aria-disabled="true"])'));
    if (items.length === 0) return;
    const at = items.indexOf(document.activeElement as HTMLElement);
    const next =
      event.key === 'ArrowDown' ? (at + 1) % items.length : event.key === 'ArrowUp' ? (at <= 0 ? items.length - 1 : at - 1) : event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : -1;
    if (next === -1) return;
    event.preventDefault();
    items[next].focus();
  }

  const renderTrigger = (menu: MenuDef) => (
    <button
      key={menu.id}
      ref={(element) => {
        if (element) triggers.current.set(menu.id, element);
        else triggers.current.delete(menu.id);
      }}
      type="button"
      className={menu.alignEnd ? 'mf-chip cat-ddbtn cat-sort' : 'mf-chip cat-ddbtn'}
      data-active={menu.active}
      aria-haspopup="listbox"
      aria-expanded={openIdNow === menu.id}
      aria-controls={openIdNow === menu.id ? listId : undefined}
      onClick={(event) => toggle(menu, event.currentTarget)}
      onKeyDown={(event) => onTriggerKeyDown(event, menu)}
    >
      <span>{menu.text}</span>
      <ChevronDown className="mf-icon cat-ic" aria-hidden />
    </button>
  );

  return (
    <div ref={barRef} className="cat-filterbar">
      <div ref={rowRef} className="cat-filters" role="group" aria-label="Filters" data-start={edges.start} data-end={edges.end}>
        {menus.map(renderTrigger)}
        {activeFacetCount(filters) > 0 ? (
          <button type="button" className="mf-ulink cat-clear" onClick={onClear}>
            Clear filters
          </button>
        ) : null}
        {renderTrigger(sortMenu)}
      </div>

      {open ? (
        <div ref={listRef} id={listId} role="listbox" aria-label={open.label} className="cat-pop" style={{ top: place.top, left: place.left }} onKeyDown={onListKeyDown}>
          {open.options.map((option) => (
            <button
              key={option.value ?? 'any'}
              type="button"
              role="option"
              className="cat-opt"
              aria-selected={option.value === open.selected}
              aria-disabled={option.disabled || undefined}
              tabIndex={-1}
              onClick={() => {
                if (!option.disabled) choose(open, option.value);
              }}
            >
              {option.hex ? <i className="cat-optdot" aria-hidden style={dotColour(option.hex)} /> : null}
              <span className="cat-opttext">{option.label}</span>
              {option.note ? (
                <>
                  {' '}
                  <span className="cat-chip-range">{option.note}</span>
                </>
              ) : null}
              {option.value === open.selected ? <Check className="mf-icon cat-ic cat-optcheck" aria-hidden /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
