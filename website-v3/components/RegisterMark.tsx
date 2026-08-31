interface RegisterMarkProps {
  className?: string;
}

/**
 * The brand mark: a print registration mark — the crosshair-in-circle
 * used on press sheets to align each ink layer. Ties the identity to
 * the actual craft (precision, every colour aligned) instead of a
 * generic glyph.
 */
export function RegisterMark({ className }: RegisterMarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.2" />
      <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="1.2" />
      <line x1="1" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
