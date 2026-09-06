'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  primary?: boolean;
  /** danger tone for destructive actions (e.g. cancelling a confirm card) */
  danger?: boolean;
  /** matches the smaller 36px pills used inline after an assistant turn */
  small?: boolean;
  children: ReactNode;
}

export function Chip({ primary, danger, small, className, children, ...rest }: ChipProps) {
  const tone = danger ? 'mf-pill-danger' : primary ? 'mf-pill-primary' : '';
  return (
    <button className={`mf-pill ${small ? 'mf-pill-sm' : ''} ${tone} ${className ?? ''}`} {...rest}>
      {children}
    </button>
  );
}
