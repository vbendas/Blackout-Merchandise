import type { ComponentProps, ReactNode } from 'react';

// Chip primitive (Round 9 WP6a). Look: .mf-chip in design-tokens/components.css.
//
//   suggest  a starter prompt; plain button
//   filter   toggle; aria-pressed
//   role     one option of a radiogroup; role="radio" + aria-checked
//            (the parent owns the radiogroup, roving tabindex and arrows)
//
// Selected = fg fill + bg text + check glyph, so selection is never colour
// alone. 32px visible, 44px hit.

export type ChipVariant = 'suggest' | 'filter' | 'role';

interface ChipProps extends Omit<ComponentProps<'button'>, 'role' | 'type'> {
  variant?: ChipVariant;
  /** filter / role only. */
  selected?: boolean;
  /** Optional number prefix, e.g. 1 -> "01". */
  index?: number | string;
  children?: ReactNode;
}

function pad(index: number | string) {
  return typeof index === 'number' ? String(index).padStart(2, '0') : index;
}

export function Chip({ variant = 'filter', selected = false, index, className, children, ...rest }: ChipProps) {
  const state =
    variant === 'filter'
      ? { 'aria-pressed': selected }
      : variant === 'role'
        ? { role: 'radio' as const, 'aria-checked': selected }
        : {};

  return (
    <button
      type="button"
      {...rest}
      {...state}
      className={['mf-chip', className].filter(Boolean).join(' ')}
      data-variant={variant}
    >
      <svg className="mf-chip__check" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
        <path d="M2 6.5 5 9.5 10.5 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
      </svg>
      {index !== undefined ? <span className="mf-chip__index">{pad(index)}</span> : null}
      <span>{children}</span>
    </button>
  );
}
