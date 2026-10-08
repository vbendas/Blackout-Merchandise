'use client';

import { useId, useRef, type CSSProperties, type KeyboardEvent } from 'react';
import { useT, type Key } from '@/lib/i18n';

// Canonical English values — sent to the server and validated there
// against the exact same list (see app/waitlist/actions.ts); only the
// displayed option label is translated.
export const ROLE_OPTIONS = [
  'Band or musician',
  'Tattoo artist',
  'Festival or promoter',
  'Illustrator',
  'Label or collective',
  'Brand or company',
  'Something else',
];

const ROLE_KEYS: Record<string, Key> = {
  'Band or musician': 'waitlist.role.band',
  'Tattoo artist': 'waitlist.role.tattoo',
  'Festival or promoter': 'waitlist.role.festival',
  Illustrator: 'waitlist.role.illustrator',
  'Label or collective': 'waitlist.role.label',
  'Brand or company': 'waitlist.role.brand',
  'Something else': 'waitlist.role.other',
};

const LABEL: CSSProperties = {
  fontFamily: 'var(--font-mono), monospace',
  fontSize: '12px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
};

interface RolePickerProps {
  /** Canonical English role value, or '' when nothing is chosen. */
  value: string;
  onChange: (role: string) => void;
  disabled?: boolean;
}

/**
 * "I'm a …" radiogroup of condensed-caps choices, shared by the
 * waitlist form and the home Apply section. Roving tabindex: one tab
 * stop, arrows / Home / End move the selection. Renders the mono label
 * plus the group as siblings (wrap in a flex column).
 */
export function RolePicker({ value, onChange, disabled }: RolePickerProps) {
  const t = useT();
  const labelId = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const selected = ROLE_OPTIONS.indexOf(value);
  const tabbable = selected === -1 ? 0 : selected;

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = ROLE_OPTIONS.length - 1;
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = index === last ? 0 : index + 1;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = index === 0 ? last : index - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    if (next < 0) return;
    e.preventDefault();
    onChange(ROLE_OPTIONS[next]);
    refs.current[next]?.focus();
  }

  return (
    <>
      <span id={labelId} style={LABEL}>
        {t('waitlist.roleLabel')}
      </span>
      <div role="radiogroup" aria-labelledby={labelId} className="flex flex-wrap gap-x-[22px] gap-y-[6px]">
        {ROLE_OPTIONS.map((option, i) => (
          <button
            key={option}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={value === option}
            tabIndex={i === tabbable ? 0 : -1}
            disabled={disabled}
            className="role-choice"
            onClick={() => onChange(option)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {t(ROLE_KEYS[option])}
          </button>
        ))}
      </div>
    </>
  );
}
