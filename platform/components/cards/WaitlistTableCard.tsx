import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import { StatusPill, type StatusTone } from '@/components/cards/StatusPill';
import type { CardActionContext } from '@/components/cards/actions';

type WaitlistTableCardType = Extract<Card, { kind: 'waitlist_table' }>;

function statusTone(status: string): StatusTone {
  const value = status.toLowerCase();
  if (['invited', 'converted', 'registered'].includes(value)) return 'positive';
  if (['rejected', 'expired'].includes(value)) return 'danger';
  return 'neutral';
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').replace(/^./, (ch) => ch.toUpperCase());
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function WaitlistTableCard({ card, ctx }: { card: WaitlistTableCardType; ctx: CardActionContext }) {
  return (
    <div className="mf-card p-4">
      {card.title ? <div className="mf-label mf-dimmed mb-2">{card.title}</div> : null}
      <ul className="flex flex-col">
        {card.rows.map((row, index) => {
          const clickable = Boolean(row.prompt);
          // Stacked email/meta rather than a grid so this stays readable at
          // narrow (mobile) widths without a horizontal scroll.
          const meta = [row.role, row.project, formatDate(row.at)].filter(Boolean).join(' · ');
          return (
            <li key={row.id} className={index > 0 ? 'mf-hairline-t' : ''}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() => row.prompt && ctx.onPrompt(row.prompt)}
                className="mf-tint-hover flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left disabled:cursor-default"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px]">{row.email}</span>
                  {meta ? <span className="mf-dimmed block truncate text-[11px]">{meta}</span> : null}
                </span>
                <StatusPill label={statusLabel(row.status)} tone={statusTone(row.status)} />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mf-hairline-t mf-dimmed mt-2 pt-2 text-[12px]">{card.total ?? card.rows.length} signups</div>
      <CardActions actions={card.actions} ctx={ctx} />
    </div>
  );
}
