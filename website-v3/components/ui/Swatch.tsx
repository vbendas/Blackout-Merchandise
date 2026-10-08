'use client';

import type { CSSProperties, ReactNode } from 'react';

export interface SwatchProps {
  /** Any CSS colour or background value for the dot (data, not a token). */
  colour: string;
  /** Human name of the colour. Becomes the accessible name and the tooltip. */
  name: string;
  /** Selected state, announced through aria-pressed. */
  selected?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
  /** md = 24px dot (default), sm = 16px dot. The hit area is 44px either way. */
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Swatch: a colour dot, 24px visible inside a 44px hit area. Selected shows a
 * ring in --focus (ink on paper, brand on ink). The name is read out by screen
 * readers and shown as a tooltip on hover and keyboard focus.
 * Styles: design-tokens/components-controls.css (.mf-swatch).
 */
export function Swatch({
  colour,
  name,
  selected = false,
  onSelect,
  disabled = false,
  size = 'md',
  className,
}: SwatchProps) {
  return (
    <button
      type="button"
      className={className ? `mf-swatch ${className}` : 'mf-swatch'}
      data-size={size === 'sm' ? 'sm' : undefined}
      style={{ '--swatch': colour } as CSSProperties}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
    >
      <span className="mf-swatch__dot" aria-hidden="true" />
      <span className="sr-only">{name}</span>
      <span className="mf-swatch__tip" aria-hidden="true">
        {name}
      </span>
    </button>
  );
}

/** Wrapper that groups swatches under one accessible label. */
export function SwatchGroup({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={className ? `mf-swatch-group ${className}` : 'mf-swatch-group'}>
      {children}
    </div>
  );
}
