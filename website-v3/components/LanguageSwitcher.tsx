'use client';

import { createPortal } from 'react-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLang, useT, LANGS } from '@/lib/i18n';

const HAIRLINE = '1px solid color-mix(in srgb, var(--signal) 22%, transparent)';
const PANEL_GAP = 10;

// Compact language dropdown, styled after GridView's Type/Fit filter
// menus. The trigger stays inline and inherits color so it works inside
// the corner anchors (mix-blend-mode: difference, pinned cream color).
// The panel itself is portaled to document.body — rendered inside the
// blend context it would be blended as a group with the trigger and
// become unreadable, so it renders outside it with its own fixed
// position and real theme tokens.
export function LanguageSwitcher() {
  const { lang, setLang } = useLang();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateCoords = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setCoords({ top: rect.bottom + PANEL_GAP, left: rect.right });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateCoords();
    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords, true);
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [open, updateCoords]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  // Move keyboard focus into the panel once it mounts, landing on the
  // active language so arrow keys work immediately.
  useEffect(() => {
    if (!open) return;
    const rafId = requestAnimationFrame(() => {
      const options = panelRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]');
      if (!options || options.length === 0) return;
      const activeIndex = Array.from(options).findIndex((el) => el.getAttribute('aria-checked') === 'true');
      options[activeIndex === -1 ? 0 : activeIndex]?.focus();
    });
    return () => cancelAnimationFrame(rafId);
  }, [open]);

  function focusOptionAt(index: number) {
    const options = panelRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]');
    if (!options || options.length === 0) return;
    const clamped = (index + options.length) % options.length;
    options[clamped]?.focus();
  }

  function onPanelKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const options = panelRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]');
    if (!options || options.length === 0) return;
    const current = Array.from(options).findIndex((el) => el === document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusOptionAt(current === -1 ? 0 : current + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusOptionAt(current === -1 ? options.length - 1 : current - 1);
    }
  }

  function closeMenu(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  const trigger: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    background: 'none',
    border: 'none',
    padding: '6px 0',
    cursor: 'pointer',
    color: 'inherit',
  };

  const panel: React.CSSProperties = {
    position: 'fixed',
    top: coords?.top ?? 0,
    left: coords?.left ?? 0,
    transform: 'translateX(-100%)',
    zIndex: 60,
    background: 'var(--paper)',
    color: 'var(--signal)',
    border: HAIRLINE,
    padding: '10px 0',
    minWidth: '160px',
  };

  const option = (active: boolean): React.CSSProperties => ({
    display: 'block',
    width: '100%',
    textAlign: 'left',
    fontSize: '12px',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    background: 'none',
    border: 'none',
    padding: '8px 16px',
    cursor: 'pointer',
    color: 'inherit',
    opacity: active ? 1 : 0.6,
    fontWeight: active ? 700 : 400,
  });

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('languageSwitcher.ariaLabel')}
        style={trigger}
        onClick={() => (open ? closeMenu(false) : setOpen(true))}
      >
        <span style={{ fontWeight: 700 }}>{lang.toUpperCase()}</span>
        <svg
          width="9"
          height="6"
          viewBox="0 0 9 6"
          fill="none"
          aria-hidden
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 300ms ease' }}
        >
          <path d="M1 1L4.5 5L8 1" stroke="currentColor" strokeWidth="1.1" />
        </svg>
      </button>
      {mounted &&
        open &&
        coords &&
        createPortal(
          <div
            ref={panelRef}
            style={panel}
            role="menu"
            aria-label={t('languageSwitcher.ariaLabel')}
            onKeyDown={onPanelKeyDown}
          >
            {LANGS.map(({ code, label }) => (
              <button
                key={code}
                type="button"
                role="menuitemradio"
                aria-checked={lang === code}
                style={option(lang === code)}
                onClick={() => {
                  setLang(code);
                  closeMenu(true);
                }}
              >
                {label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

export default LanguageSwitcher;
