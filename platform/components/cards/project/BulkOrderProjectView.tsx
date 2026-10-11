import { humanStatus } from '@/lib/format/status';
import { Chip } from '@/components/ui/Chip';
import { StatusPill, type StatusTone } from '@/components/cards/StatusPill';
import type { CardActionContext } from '@/components/cards/actions';
import type { BulkOrderProjectState } from '@/components/cards/project/types';

function formatCents(cents?: number): string | null {
  if (cents === undefined) return null;
  return (cents / 100).toLocaleString(undefined, { style: 'currency', currency: 'EUR' });
}

function statusTone(status: string): StatusTone {
  const value = status.toLowerCase();
  if (['paid', 'shipped', 'delivered'].includes(value)) return 'positive';
  if (value === 'cancelled') return 'danger';
  if (['proof_pending', 'in_production', 'awaiting_payment'].includes(value)) return 'dim';
  return 'neutral';
}

export function BulkOrderProjectView({ state, ctx }: { state: BulkOrderProjectState; ctx: CardActionContext }) {
  const lines = state.lines ?? [];
  const total = formatCents(state.totalCents);

  return (
    <div className="flex flex-col gap-3">
      {lines.length === 0 ? (
        <p className="mf-dimmed text-[13px]">No lines yet.</p>
      ) : (
        <ul className="flex flex-col">
          {lines.map((line, index) => (
            <li
              key={`${line.label}-${index}`}
              className={`${index > 0 ? 'mf-hairline-t' : ''} flex items-center justify-between gap-2 py-1.5 text-[13px]`}
            >
              <span className="min-w-0 truncate">
                {line.label}
                {line.colour ? ` · ${line.colour}` : ''}
                {line.sizes ? ` · ${line.sizes}` : ''} <span className="mf-dimmed">× {line.qty}</span>
              </span>
              <span className="mf-dimmed shrink-0">{formatCents(line.totalCents) ?? '—'}</span>
            </li>
          ))}
        </ul>
      )}

      {total ? (
        <div className="mf-hairline-t flex items-center justify-between pt-2 text-[14px]">
          <span>Total</span>
          <span style={{ color: 'var(--signal)' }}>{total}</span>
        </div>
      ) : null}

      {state.shipTo ? <div className="mf-dimmed text-[13px]">Ship to {state.shipTo}</div> : null}

      {state.status ? (
        <div>
          <StatusPill label={humanStatus(state.status)} tone={statusTone(state.status)} />
        </div>
      ) : null}

      <div className="mf-hairline-t flex flex-wrap gap-2 pt-3">
        <Chip small onClick={() => ctx.onPrompt('Send the bulk proof')}>
          Send the bulk proof
        </Chip>
        <Chip small primary onClick={() => ctx.onPrompt('Pay the bulk order')}>
          Pay the bulk order
        </Chip>
      </div>
    </div>
  );
}
