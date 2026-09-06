export type StatusTone = 'neutral' | 'positive' | 'warning' | 'dim' | 'danger';

const toneClass: Record<StatusTone, string> = {
  neutral: '',
  positive: 'mf-pill-positive',
  warning: 'mf-pill-warning',
  dim: 'mf-pill-dim',
  danger: 'mf-pill-blocked',
};

/** Small non-interactive badge shared by design readiness, product status
 * and proof status — same pill shape as the button chips, just inert. */
export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: StatusTone }) {
  return (
    <span className={`mf-pill mf-pill-sm ${toneClass[tone]}`} style={{ cursor: 'default' }}>
      {label}
    </span>
  );
}
