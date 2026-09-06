import { Check } from 'lucide-react';
import type { ChecklistStep } from '@/lib/agent/protocol';

/** Onboarding progress row shown under the composer while the shop is not
 * live yet: filled circles for done steps, hairline-numbered circles for
 * the rest. Each pending step is clickable and sends its prompt. */
export function ChecklistRow({ steps, onPrompt }: { steps: ChecklistStep[]; onPrompt: (text: string) => void }) {
  return (
    <div className="mf-rise mf-rise-d6 flex w-full min-w-0 flex-wrap items-center justify-center gap-x-7 gap-y-2 px-6 md:px-0">
      {steps.map((step, index) => {
        const clickable = !step.done && Boolean(step.prompt);
        return (
          <button
            key={step.key}
            type="button"
            disabled={!clickable}
            onClick={() => step.prompt && onPrompt(step.prompt)}
            className="mf-label flex items-center gap-2 disabled:cursor-default"
          >
            {step.done ? (
              <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--signal)] text-[var(--paper)]">
                <Check className="mf-icon" style={{ width: 12, height: 12, strokeWidth: 2 }} />
              </span>
            ) : (
              <span className="mf-hairline flex size-[18px] shrink-0 items-center justify-center rounded-full text-[10px]">
                {index + 1}
              </span>
            )}
            <span className={step.done ? 'mf-dimmed' : ''}>{step.label}</span>
          </button>
        );
      })}
    </div>
  );
}
