import type { z } from 'zod';
import type { checklistItemSchema } from '@/lib/ui-cards/schemas';

type ChecklistItem = z.infer<typeof checklistItemSchema>;

export function ChecklistList({ items, onPrompt }: { items: ChecklistItem[]; onPrompt: (text: string) => void }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {items.map((item) => {
        const clickable = Boolean(item.prompt) && !item.done;
        return (
          <li key={item.key}>
            <button
              type="button"
              disabled={!clickable}
              onClick={() => item.prompt && onPrompt(item.prompt)}
              className="mf-tint-hover flex min-h-10 w-full items-center gap-3 rounded-lg px-1 text-left disabled:cursor-default"
            >
              <span
                aria-hidden
                className="flex h-3.5 w-3.5 shrink-0 items-center justify-center border"
                style={{
                  borderColor: 'color-mix(in srgb, var(--signal) 45%, transparent)',
                  background: item.done ? 'var(--signal)' : 'transparent',
                }}
              />
              <span className={`text-[14px] ${item.done ? 'mf-dimmed line-through' : ''}`}>{item.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
