import type { Chip as ChipType } from '@/lib/ui-cards/schemas';
import { Chip } from '@/components/ui/Chip';

/** Renders inline after the last assistant message, inside the scrolling
 * thread — not as a separate fixed bar (see design mock). */
export function ChipsRow({ chips, onSend }: { chips: ChipType[]; onSend: (text: string) => void }) {
  const seen = new Set<string>(['What can I do?']);
  const visible = chips.filter((chip) => {
    if (seen.has(chip.label)) return false;
    seen.add(chip.label);
    return true;
  });
  return (
    <div className="flex flex-wrap gap-2.5">
      {visible.slice(0, 5).map((chip, index) => (
        <Chip
          key={chip.label}
          small
          primary={chip.primary}
          onClick={() => onSend(chip.prompt ?? chip.label)}
          className={`mf-rise mf-rise-d${Math.min(index + 1, 6)}`}
        >
          {chip.label}
        </Chip>
      ))}
      <Chip small className="mf-rise mf-rise-d6" onClick={() => onSend('What can I do here?')}>
        What can I do?
      </Chip>
    </div>
  );
}
