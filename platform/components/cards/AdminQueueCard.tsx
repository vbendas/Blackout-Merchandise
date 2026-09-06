import type { Card } from '@/lib/ui-cards/schemas';
import { CardActions } from '@/components/cards/CardActions';
import type { CardActionContext } from '@/components/cards/actions';

type AdminQueueCardType = Extract<Card, { kind: 'admin_queue' }>;

export function AdminQueueCard({ card, ctx }: { card: AdminQueueCardType; ctx: CardActionContext }) {
  const sections = card.sections.filter((s) => s.count > 0);

  return (
    <div className="mf-card p-4">
      <div className="mf-label mf-dimmed mb-3">{card.title ?? "What's waiting"}</div>
      {sections.length === 0 ? <div className="mf-dimmed py-2 text-[13px]">Nothing waiting — you're clear.</div> : null}
      <div className="flex flex-col gap-4">
        {sections.map((section) => (
          <div key={section.key}>
            <div className="mf-dimmed mb-1.5 flex items-center justify-between text-[11px] uppercase tracking-wide">
              <span>{section.title}</span>
              <span>{section.count}</span>
            </div>
            <ul className="flex flex-col">
              {section.items.map((item, index) => (
                <li key={item.id} className={index > 0 ? 'mf-hairline-t' : ''}>
                  <button
                    type="button"
                    disabled={!item.prompt}
                    onClick={() => item.prompt && ctx.onPrompt(item.prompt)}
                    className="mf-tint-hover flex w-full min-h-9 items-center justify-between gap-3 py-1.5 text-left disabled:cursor-default"
                  >
                    <span className="min-w-0 truncate text-[13px]">{item.text}</span>
                    {item.meta ? <span className="mf-dimmed shrink-0 text-[11px]">{item.meta}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <CardActions actions={card.actions} ctx={ctx} />
    </div>
  );
}
