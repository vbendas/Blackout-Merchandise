interface HairlineProps {
  direction?: 'horizontal' | 'vertical';
  className?: string;
}

export function Hairline({ direction = 'horizontal', className }: HairlineProps) {
  const sizing = direction === 'horizontal' ? 'w-full h-px' : 'h-full w-px';
  return (
    <div
      className={`${sizing} ${className ?? ''}`}
      style={{ background: 'color-mix(in srgb, var(--signal) 22%, transparent)' }}
      aria-hidden
    />
  );
}
