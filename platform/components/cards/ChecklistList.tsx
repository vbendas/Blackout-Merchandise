import type { z } from 'zod';
import type { checklistItemSchema } from '@/lib/ui-cards/schemas';
import '@/components/cards/cards.css';

type ChecklistItem = z.infer<typeof checklistItemSchema>;

/** Hairline rows with a square marker: filled when done, an outline when not
 * (a shape, not a colour). Open items with a prompt are buttons. */
export function ChecklistList({ items, onPrompt }: { items: ChecklistItem[]; onPrompt: (text: string) => void }) {
  return (
    <ul className="mfc-list">
      {items.map((item) => {
        const clickable = Boolean(item.prompt) && !item.done;
        return (
          <li key={item.key} className="mfc-item">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => item.prompt && onPrompt(item.prompt)}
              className="mfc-check-btn"
              data-done={item.done ? '' : undefined}
            >
              <span className="mfc-box" data-done={item.done ? '' : undefined} aria-hidden />
              <span className="mfc-check-label">
                <span className="sr-only">{item.done ? 'Done: ' : 'To do: '}</span>
                {item.label}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
