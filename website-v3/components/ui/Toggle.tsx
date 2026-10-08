'use client';

import { useId, useState, type ReactNode } from 'react';

export type ToggleKind = 'checkbox' | 'switch' | 'press';

export interface ToggleProps {
  /**
   * checkbox: native checkbox (form value, label click).
   * switch:   native checkbox with role="switch".
   * press:    a toggle button with aria-pressed (composer toggles, filters).
   */
  kind?: ToggleKind;
  /** Controlled state. */
  checked?: boolean;
  /** Uncontrolled initial state. */
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Always present. Use `hideLabel` to keep it for screen readers only. */
  label: ReactNode;
  hideLabel?: boolean;
  disabled?: boolean;
  /** checkbox and switch only: submitted with a surrounding <form>. */
  name?: string;
  value?: string;
  id?: string;
  className?: string;
  'aria-describedby'?: string;
}

const MARK = (
  <svg className="mf-toggle__mark" viewBox="0 0 12 12" fill="none" aria-hidden="true" focusable="false">
    <path d="M2 6.5 4.8 9.2 10 3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" />
  </svg>
);

/**
 * Toggle: checkbox, switch or pressable toggle. 18px box inside a 44px hit
 * area (the whole label row is the hit target). State is never colour alone:
 * checkbox and press draw a check glyph, switch moves its knob.
 * Styles: design-tokens/components-controls.css (.mf-toggle).
 */
export function Toggle({
  kind = 'checkbox',
  checked: checkedProp,
  defaultChecked = false,
  onCheckedChange,
  label,
  hideLabel = false,
  disabled = false,
  name,
  value,
  id,
  className,
  'aria-describedby': describedBy,
}: ToggleProps) {
  const autoId = useId();
  const [inner, setInner] = useState(defaultChecked);
  const controlled = checkedProp !== undefined;
  const checked = controlled ? checkedProp : inner;

  function set(next: boolean) {
    if (disabled) return;
    if (!controlled) setInner(next);
    onCheckedChange?.(next);
  }

  const rootClass = className ? `mf-toggle ${className}` : 'mf-toggle';
  const box = (
    <span className="mf-toggle__box" aria-hidden="true">
      {MARK}
    </span>
  );
  const text = <span className={hideLabel ? 'sr-only' : 'mf-toggle__label'}>{label}</span>;

  if (kind === 'press') {
    return (
      <button
        type="button"
        id={id ?? autoId}
        className={rootClass}
        data-kind="press"
        data-checked={checked}
        data-disabled={disabled ? '' : undefined}
        aria-pressed={checked}
        aria-disabled={disabled || undefined}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={() => set(!checked)}
      >
        {box}
        {text}
      </button>
    );
  }

  return (
    <label
      className={rootClass}
      data-kind={kind}
      data-checked={checked}
      data-disabled={disabled ? '' : undefined}
    >
      <input
        type="checkbox"
        id={id ?? autoId}
        className="mf-toggle__input"
        data-ring="custom"
        role={kind === 'switch' ? 'switch' : undefined}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        aria-describedby={describedBy}
        onChange={(e) => set(e.currentTarget.checked)}
      />
      {box}
      {text}
    </label>
  );
}
