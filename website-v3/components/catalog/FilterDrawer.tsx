'use client';

import type { CSSProperties, RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import { fitKey, typeKey, useT } from '@/lib/i18n';

const HAIRLINE = '1px solid var(--hairline)';
const MONO: CSSProperties = {
  fontFamily: 'var(--font-mono), monospace',
  fontSize: '12px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

const sectionLabel: CSSProperties = { ...MONO, opacity: 0.62 };

function row(active: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    height: '32px',
    background: 'none',
    border: 'none',
    padding: 0,
    width: '100%',
    fontSize: '15px',
    fontFamily: 'var(--font-sans), sans-serif',
    textAlign: 'left',
    cursor: 'pointer',
    color: 'var(--signal)',
    fontWeight: active ? 600 : 400,
    opacity: active ? 1 : 0.68,
  };
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;

  types: readonly string[];
  typeCounts: Record<string, number>;
  totalCount: number;
  type: string | null;
  onSelectAllTypes: () => void;
  onToggleType: (value: string) => void;

  heavy: boolean;
  heavyCount: number;
  onToggleHeavy: () => void;
  gots: boolean;
  gotsCount: number;
  onToggleGots: () => void;

  colours: readonly string[];
  colour: string | null;
  onToggleColour: (value: string) => void;
  swatchFor: (colour: string) => string;
  colourName: (colour: string) => string;

  fits: readonly string[];
  fit: string | null;
  onSelectAllFits: () => void;
  onToggleFit: (value: string) => void;

  resultCount: number;
  onClearAll: () => void;
}

export function FilterDrawer(props: FilterDrawerProps) {
  const {
    open,
    onClose,
    triggerRef,
    types,
    typeCounts,
    totalCount,
    type,
    onSelectAllTypes,
    onToggleType,
    heavy,
    heavyCount,
    onToggleHeavy,
    gots,
    gotsCount,
    onToggleGots,
    colours,
    colour,
    onToggleColour,
    swatchFor,
    colourName,
    fits,
    fit,
    onSelectAllFits,
    onToggleFit,
    resultCount,
    onClearAll,
  } = props;

  const t = useT();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Two-phase mount: render off-screen first, then flip `entered` on the
  // next frame so the slide/fade transition actually runs. On close the
  // panel stays mounted (translated off-screen) for the transition's
  // duration before unmounting, so it never just vanishes.
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf1 = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true));
      });
      return () => cancelAnimationFrame(raf1);
    }
    setEntered(false);
    const timeout = setTimeout(() => setMounted(false), 320);
    return () => clearTimeout(timeout);
  }, [open]);

  // Focus trap, Esc-to-close, scroll lock and focus return — all scoped
  // to the open lifetime. Gated on `mounted` (not just `open`) so the
  // panel/close button actually exist in the DOM before this tries to
  // focus into them. The cleanup (running the instant `open` flips
  // false, or the drawer unmounts) restores body scroll and returns
  // focus to the Filter button that opened it.
  useEffect(() => {
    if (!open || !mounted) return;
    const trigger = triggerRef.current;

    const getFocusable = () =>
      panelRef.current ? Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)) : [];

    (closeButtonRef.current ?? getFocusable()[0])?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = getFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [open, mounted, onClose, triggerRef]);

  if (!mounted) return null;

  return (
    <>
      <div
        aria-hidden
        onClick={onClose}
        className="catalog-drawer-backdrop"
        data-open={entered || undefined}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-drawer-title"
        className="catalog-drawer-panel"
        data-open={entered || undefined}
      >
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px var(--gutter) 20px',
            borderBottom: HAIRLINE,
          }}
        >
          <span
            id="catalog-drawer-title"
            style={{
              fontFamily: 'var(--font-display), sans-serif',
              fontWeight: 600,
              fontSize: '28px',
              letterSpacing: '-0.01em',
            }}
          >
            {t('catalog.filter.title')}
          </span>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label={t('catalog.filter.close')}
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: 'var(--signal)',
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '28px var(--gutter) 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '32px',
          }}
        >
          {/* Type: two columns from sm up (the panel is capped at 440px
              from that breakpoint on, same threshold as its own
              mobile-full-screen cutoff). */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={sectionLabel}>{t('catalog.filter.type')}</span>
            <div className="grid grid-cols-1 sm:grid-cols-2" style={{ columnGap: '20px' }}>
              <button type="button" aria-pressed={type === null} style={row(type === null)} onClick={onSelectAllTypes}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {type === null && <span aria-hidden>—</span>}
                  {t('catalog.all')}
                </span>
                <span className="mf-dim" style={MONO}>
                  {totalCount}
                </span>
              </button>
              {types.map((ty) => {
                const active = type === ty;
                const key = typeKey(ty);
                return (
                  <button key={ty} type="button" aria-pressed={active} style={row(active)} onClick={() => onToggleType(ty)}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      {active && <span aria-hidden>—</span>}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{key ? t(key) : ty}</span>
                    </span>
                    <span className="mf-dim" style={MONO}>
                      {typeCounts[ty] ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: HAIRLINE, paddingTop: '24px' }}>
            <span style={sectionLabel}>{t('catalog.filter.cloth')}</span>
            <button type="button" aria-pressed={heavy} style={row(heavy)} onClick={onToggleHeavy}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  aria-hidden
                  style={{
                    width: '14px',
                    height: '14px',
                    border: '1px solid var(--signal)',
                    background: heavy ? 'var(--signal)' : 'transparent',
                    flexShrink: 0,
                  }}
                />
                {t('catalog.toggle.heavy')}
              </span>
              <span className="mf-dim" style={MONO}>
                {heavyCount}
              </span>
            </button>
            <button type="button" aria-pressed={gots} style={row(gots)} onClick={onToggleGots}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  aria-hidden
                  style={{
                    width: '14px',
                    height: '14px',
                    border: '1px solid var(--signal)',
                    background: gots ? 'var(--signal)' : 'transparent',
                    flexShrink: 0,
                  }}
                />
                {t('catalog.toggle.gots')}
              </span>
              <span className="mf-dim" style={MONO}>
                {gotsCount}
              </span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: HAIRLINE, paddingTop: '24px' }}>
            <span style={sectionLabel}>{t('catalog.filter.colour')}</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 28px)', gap: '10px' }}>
              {colours.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={colour === c}
                  aria-label={t('catalog.colourAriaLabel', { name: colourName(c) })}
                  title={colourName(c)}
                  onClick={() => onToggleColour(c)}
                  style={{
                    width: '28px',
                    height: '28px',
                    padding: 0,
                    cursor: 'pointer',
                    background: swatchFor(c),
                    border: '1px solid rgba(26,23,20,.18)',
                    outline: colour === c ? '2px solid var(--signal)' : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: HAIRLINE, paddingTop: '24px' }}>
            <span style={sectionLabel}>{t('catalog.filter.fit')}</span>
            <button type="button" aria-pressed={fit === null} style={row(fit === null)} onClick={onSelectAllFits}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {fit === null && <span aria-hidden>—</span>}
                {t('catalog.all')}
              </span>
            </button>
            {fits.map((f) => {
              const active = fit === f;
              const key = fitKey(f);
              return (
                <button key={f} type="button" aria-pressed={active} style={row(active)} onClick={() => onToggleFit(f)}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {active && <span aria-hidden>—</span>}
                    {key ? t(key) : f}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          style={{
            flexShrink: 0,
            borderTop: HAIRLINE,
            padding: '18px var(--gutter)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <button
            type="button"
            onClick={onClearAll}
            aria-label={t('common.clearAllAriaLabel')}
            style={{ ...MONO, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--signal)', opacity: 0.75 }}
          >
            {t('common.clearAll')}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              height: '48px',
              padding: '0 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--signal)',
              color: 'var(--paper)',
              fontWeight: 600,
              fontSize: '14px',
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {t.tPlural('catalog.filter.show', resultCount)}
          </button>
        </div>
      </div>
    </>
  );
}
