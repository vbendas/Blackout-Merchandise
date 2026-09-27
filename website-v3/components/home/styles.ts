import type { CSSProperties } from 'react';

// Shared style building blocks for the home page sections (WP2). Kept
// as inline style objects / class strings — the same convention
// SiteHeader/SiteFooter already use (`var(--token)` inline rather than
// relying on the Tailwind @theme aliases) — so this file only exists to
// avoid repeating the same object literals eight times.

export const HAIRLINE = '1px solid var(--hairline)';

export const MONO_LABEL: CSSProperties = {
  fontFamily: 'var(--font-mono), monospace',
  fontSize: '12px',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--muted)',
};

export const PRIMARY_BTN: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '48px',
  padding: '0 24px',
  borderRadius: '4px',
  background: 'var(--signal)',
  color: 'var(--paper)',
  fontWeight: 600,
  fontSize: '15px',
  whiteSpace: 'nowrap',
  cursor: 'pointer',
  border: 'none',
};

export const SECONDARY_BTN: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '48px',
  padding: '0 24px',
  borderRadius: '4px',
  background: 'transparent',
  color: 'var(--signal)',
  border: '1px solid rgba(237,228,221,.24)',
  fontWeight: 500,
  fontSize: '15px',
  cursor: 'pointer',
};

export const MORE_LINK: CSSProperties = {
  fontSize: '15px',
  borderBottom: '1px solid rgba(237,228,221,.35)',
  paddingBottom: '3px',
};

// Visible keyboard focus ring — every interactive element in home/*
// gets this class alongside its own classes/styles.
export const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal)] focus-visible:rounded-[2px]';

// 120px desktop / 96px mobile section padding (py-24 == 96px).
export const SECTION_PAD = 'py-24 md:py-[120px]';
