import type { ReactNode } from 'react';

// Pieces shared by the payouts and runs lists. Wide screens read them as a
// table (a header row above, labels hidden in each cell); narrow ones stack
// each row and show the label beside its value (billing.css).

/** One value in a row. The label always exists for screen readers; the main
 * cell (date, run name) leads the row and never shows its label. A main cell
 * whose value names itself (Run 3) can leave the label out. */
export function Cell({ label, main, children }: { label?: string; main?: boolean; children: ReactNode }) {
  return (
    <span className={main ? 'bl-c bl-c-main' : 'bl-c'}>
      {label ? <span className="bl-k">{label}</span> : null}
      <span className="bl-v">{children}</span>
    </span>
  );
}

/** Column labels for wide screens; the cells carry their own labels. */
export function HeadRow({ labels }: { labels: string[] }) {
  return (
    <div className="bl-head mf-label" aria-hidden="true">
      {labels.map((label) => (
        <span key={label}>{label}</span>
      ))}
      <span />
    </div>
  );
}
