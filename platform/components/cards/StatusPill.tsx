import '@/components/cards/cards.css';

export type StatusTone = 'neutral' | 'positive' | 'warning' | 'dim' | 'danger';

const toneAttr: Record<StatusTone, string> = {
  neutral: 'pending',
  positive: 'done',
  warning: 'warning',
  dim: 'quiet',
  danger: 'danger',
};

/** Status as a small mono tag. Monochrome: done is filled, pending a hairline,
 * and what needs attention is white. Inert, so it never reads as a button. */
export function StatusPill({ label, tone = 'neutral' }: { label: string; tone?: StatusTone }) {
  return (
    <span className="mfc-tag" data-tone={toneAttr[tone]}>
      {label}
    </span>
  );
}

/** Tag tone for a run (bulk order) status: what waits on the artist is white,
 * what is finished is filled, a cancelled run goes quiet. */
export function runStatusTone(status: string): StatusTone {
  switch (status) {
    case 'proof_pending':
    case 'awaiting_payment':
      return 'warning';
    case 'paid':
    case 'delivered':
      return 'positive';
    case 'cancelled':
      return 'dim';
    default:
      return 'neutral';
  }
}
