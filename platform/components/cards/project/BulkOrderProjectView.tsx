import { CardActions } from '@/components/cards/CardActions';
import type { CardActionContext } from '@/components/cards/actions';
import type { BulkOrderProjectState } from '@/components/cards/project/types';

function formatCents(cents?: number): string | null {
  if (cents === undefined) return null;
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'EUR' });
}

export function BulkOrderProjectView({ state, ctx }: { state: BulkOrderProjectState; ctx: CardActionContext }) {
  const lines = state.lines ?? [];
  const total = formatCents(state.totalCents);
  return (
    <div className="flex flex-col gap-2">
      {lines.length === 0 ? (
        <p className="mf-dimmed text-[13px]">No lines yet.</p>
      ) : (
        <ul className="flex flex-col">
          {lines.map((line, index) => (
            <li key={`${line.label}-${index}`} className={`${index > 0 ? 'mf-hairline-t' : ''} flex items-center justify-between py-1.5 text-[13px]`}>
              <span>
                {line.label} <span className="mf-dimmed">x{line.qty}</span>
              </span>
              <span>{formatCents(line.priceCents) ?? '—'}</span>
            </li>
          ))}
        </ul>
      )}
      {total ? (
        <div className="mf-hairline-t flex items-center justify-between pt-2 text-[13px]">
          <span className="mf-dimmed">Total</span>
          <span>{total}</span>
        </div>
      ) : null}
      {state.status ? <div className="mf-label mf-dimmed">{state.status}</div> : null}
      <CardActions actions={state.actions} ctx={ctx} />
    </div>
  );
}
