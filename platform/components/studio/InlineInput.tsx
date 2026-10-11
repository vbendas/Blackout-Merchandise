'use client';

import { useEffect, useRef, useState } from 'react';

/** Inline text field for renames and new collections: Enter saves, Escape
 * cancels, leaving the field saves. Focuses and selects on mount. */
export function InlineInput({
  label,
  initialValue = '',
  placeholder,
  maxLength,
  onSubmit,
  onCancel,
}: {
  label: string;
  initialValue?: string;
  placeholder?: string;
  maxLength: number;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  function finish(save: boolean) {
    if (done.current) return;
    done.current = true;
    if (save && value.trim()) onSubmit(value);
    else onCancel();
  }

  return (
    <input
      ref={ref}
      aria-label={label}
      className="mf-side-input"
      value={value}
      placeholder={placeholder}
      maxLength={maxLength}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          finish(true);
        } else if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          finish(false);
        }
      }}
    />
  );
}
